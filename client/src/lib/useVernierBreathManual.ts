import { useState, useCallback, useRef, useEffect } from 'react';

let godirect: any = null;

const loadGoDirectLibrary = async () => {
  if (!godirect) {
    try {
      const goDirectModule = await import('@vernier/godirect');
      godirect = goDirectModule.default || goDirectModule;
      console.log('GoDirect library loaded successfully via import');
      return godirect;
    } catch (err) {
      console.error('Failed to import GoDirect library:', err);
      throw new Error('Failed to load Vernier GoDirect library');
    }
  }
  return godirect;
};

export interface VernierRespirationData {
  force: number;
  timestamp: number;
}

export interface BreathRateDataPoint {
  time: number;
  bpm: number;
}

interface VernierBreathManualHookResult {
  isConnected: boolean;
  isConnecting: boolean;
  breathAmplitude: number;
  breathPhase: 'inhale' | 'exhale' | 'pause';
  breathingRate: number;
  deviceBreathingRate: number | null;
  stepsCount: number;
  stepRate: number;
  connectDevice: () => Promise<void>;
  disconnectDevice: () => Promise<void>;
  forceDisconnectDevice: () => Promise<void>;
  error: string | null;
  isCalibrating: boolean;
  calibrationProgress: number;
  startCalibration: () => Promise<void>;
  calibrationComplete: boolean;
  currentForce: number;
  calibrationProfile: {
    minForce: number;
    maxForce: number;
    baselineForce: number;
    forceRange: number;
    isValid: boolean;
  } | null;
  sessionElapsed: number;
  breathRateHistory: BreathRateDataPoint[];
  resetBreathRateHistory: () => void;
}

export function useVernierBreathManual(): VernierBreathManualHookResult {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [breathAmplitude, setBreathAmplitude] = useState(0);
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'exhale' | 'pause'>('pause');
  const [breathingRate, setBreathingRate] = useState(0);
  const [deviceBreathingRate, setDeviceBreathingRate] = useState<number | null>(null);
  const [stepsCount, setStepsCount] = useState(0);
  const [stepRate, setStepRate] = useState(0);

  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationProgress, setCalibrationProgress] = useState(0);
  const [calibrationComplete, setCalibrationComplete] = useState(false);
  const [currentForce, setCurrentForce] = useState(0);
  const [sessionElapsed, setSessionElapsed] = useState(0);

  const [calibrationProfile, setCalibrationProfile] = useState<{
    minForce: number;
    maxForce: number;
    baselineForce: number;
    forceRange: number;
    isValid: boolean;
  } | null>(null);

  const [breathRateHistory, setBreathRateHistory] = useState<BreathRateDataPoint[]>([]);

  const deviceRef = useRef<any>(null);
  const forceDataRef = useRef<VernierRespirationData[]>([]);
  const calibrationDataRef = useRef<number[]>([]);
  const calibrationStartTimeRef = useRef<number>(0);
  const lastForceValueRef = useRef<number>(0);
  const lastForceUpdateRef = useRef<number>(0);
  const breathCyclesRef = useRef<number[]>([]);
  const lastRateUpdateRef = useRef<number>(0);
  const initialRangeRef = useRef<number | null>(null);
  const connectionStartTimeRef = useRef<number>(0);
  const sessionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastBreathRateRecordRef = useRef<number>(0);
  const sensorListenersRef = useRef<Array<{ sensor: any; handler: (obj: any) => void }>>([]);
  const adoptedRef = useRef(false);

  const removeAllSensorListeners = useCallback(() => {
    for (const { sensor, handler } of sensorListenersRef.current) {
      try {
        sensor.off('value-changed', handler);
      } catch (e) { /* ignore */ }
    }
    sensorListenersRef.current = [];
  }, []);

  const discoverSensors = useCallback((gdxDevice: any) => {
    let forceSensor: any = null;
    let respRateSensor: any = null;
    let stepsSensor: any = null;
    let stepRateSensor: any = null;

    gdxDevice.sensors.forEach((sensor: any) => {
      const name = (sensor.name || '').toLowerCase();
      const unit = (sensor.unit || '').toLowerCase();

      if (unit === 'n' || name.includes('force')) {
        forceSensor = sensor;
      } else if (unit === 'bpm' || unit === 'breaths/min' || name.includes('respiration rate')) {
        respRateSensor = sensor;
      } else if (name.includes('steps') && !name.includes('rate')) {
        stepsSensor = sensor;
      } else if (name.includes('step rate') || (name.includes('step') && name.includes('rate'))) {
        stepRateSensor = sensor;
      }
    });

    if (!forceSensor) {
      for (let i = 0; i < Math.min(5, gdxDevice.sensors.length); i++) {
        const s = gdxDevice.sensors[i];
        if (s && (s.unit === 'N' || s.name?.toLowerCase().includes('force'))) {
          forceSensor = s;
          break;
        }
      }
    }

    return { forceSensor, respRateSensor, stepsSensor, stepRateSensor };
  }, []);

  const attachSensorListeners = useCallback((sensors: { forceSensor: any; respRateSensor: any; stepsSensor: any; stepRateSensor: any }) => {
    removeAllSensorListeners();

    const { forceSensor, respRateSensor, stepsSensor, stepRateSensor } = sensors;

    if (forceSensor) {
      const handler = (sensorObj: any) => {
        const val = typeof sensorObj.value === 'number' ? sensorObj.value : parseFloat(sensorObj.value);
        if (isNaN(val)) return;

        setCurrentForce(val);

        const isCurrentlyCalibrating = calibrationStartTimeRef.current > 0;
        if (isCurrentlyCalibrating) {
          calibrationDataRef.current.push(val);
          const elapsed = Date.now() - calibrationStartTimeRef.current;
          const calibrationDuration = 20000;
          const progressPercent = Math.min(elapsed / calibrationDuration, 1);
          setCalibrationProgress(progressPercent);

          if (elapsed >= calibrationDuration) {
            finishCalibration();
          }
          return;
        }

        processForceValue(val);
      };
      forceSensor.on('value-changed', handler);
      sensorListenersRef.current.push({ sensor: forceSensor, handler });
    }

    if (respRateSensor) {
      let nanCount = 0;
      let validCount = 0;
      let lastNanLogTime = 0;
      let lastSummaryTime = Date.now();

      const handler = (sensorObj: any) => {
        const raw = sensorObj.value;
        const now = Date.now();

        if (raw === undefined || raw === null) {
          nanCount++;
          return;
        }

        const strVal = String(raw).trim().toUpperCase();
        if (strVal === 'NAN' || strVal === 'UNDEFINED' || strVal === 'NULL' || strVal === '') {
          nanCount++;
          if (now - lastNanLogTime >= 10000) {
            lastNanLogTime = now;
            console.log(`RESP RATE: still NaN (${nanCount} NaN readings so far, ${validCount} valid)`);
          }
          if (now - lastSummaryTime >= 30000) {
            lastSummaryTime = now;
            console.log(`📊 RESP RATE summary: ${nanCount} NaN, ${validCount} valid readings`);
          }
          return;
        }

        const numVal = parseFloat(raw);
        if (isNaN(numVal) || !isFinite(numVal)) {
          nanCount++;
          return;
        }

        if (numVal <= 0 || numVal > 60) {
          return;
        }

        validCount++;
        const roundedRate = Math.round(numVal * 10) / 10;
        console.log(`✅ VALID RESPIRATION RATE: ${roundedRate} bpm (${validCount} valid out of ${nanCount + validCount} total)`);
        setDeviceBreathingRate(roundedRate);
        setBreathingRate(roundedRate);

        if (now - lastBreathRateRecordRef.current >= 1000) {
          lastBreathRateRecordRef.current = now;
          const elapsed = connectionStartTimeRef.current > 0
            ? Math.floor((now - connectionStartTimeRef.current) / 1000)
            : 0;
          setBreathRateHistory(prev => {
            const updated = [...prev, { time: elapsed, bpm: roundedRate }];
            if (updated.length % 30 === 0) {
              console.log(`📈 Breath rate history: ${updated.length} data points collected`);
            }
            return updated;
          });
        }
      };
      respRateSensor.on('value-changed', handler);
      sensorListenersRef.current.push({ sensor: respRateSensor, handler });
    }

    if (stepsSensor) {
      const handler = (sensorObj: any) => {
        const val = parseFloat(sensorObj.value);
        if (!isNaN(val)) setStepsCount(val);
      };
      stepsSensor.on('value-changed', handler);
      sensorListenersRef.current.push({ sensor: stepsSensor, handler });
    }

    if (stepRateSensor) {
      const handler = (sensorObj: any) => {
        const val = parseFloat(sensorObj.value);
        if (!isNaN(val)) setStepRate(val);
      };
      stepRateSensor.on('value-changed', handler);
      sensorListenersRef.current.push({ sensor: stepRateSensor, handler });
    }

    console.log(`=== ATTACHED ${sensorListenersRef.current.length} SENSOR LISTENERS ===`);
  }, [removeAllSensorListeners]);

  useEffect(() => {
    const existingDevice = (window as any).vernierDevice;
    console.log(`=== HOOK MOUNT — checking window.vernierDevice: ${existingDevice ? 'EXISTS' : 'null/undefined'}, adoptedRef: ${adoptedRef.current} ===`);
    if (existingDevice && !adoptedRef.current) {
      adoptedRef.current = true;
      console.log('=== AUTO-ADOPTING EXISTING VERNIER DEVICE ===');
      console.log(`Device: ${existingDevice.name || 'unknown'}, sensors: ${existingDevice.sensors?.length || 0}`);

      deviceRef.current = existingDevice;

      const sensors = discoverSensors(existingDevice);
      console.log(`Found sensors: force=${!!sensors.forceSensor}, respRate=${!!sensors.respRateSensor}, steps=${!!sensors.stepsSensor}, stepRate=${!!sensors.stepRateSensor}`);

      attachSensorListeners(sensors);

      connectionStartTimeRef.current = Date.now();
      sessionTimerRef.current = setInterval(() => {
        if (connectionStartTimeRef.current > 0) {
          setSessionElapsed(Math.floor((Date.now() - connectionStartTimeRef.current) / 1000));
        }
      }, 1000);

      setIsConnected(true);
      console.log('=== AUTO-ADOPT COMPLETE — useVernier will be true ===');
    }

    return () => {
      console.log('=== HOOK UNMOUNTING — cleaning up listeners ===');
      removeAllSensorListeners();
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
        sessionTimerRef.current = null;
      }
    };
  }, [discoverSensors, attachSensorListeners, removeAllSensorListeners]);

  const connectDevice = useCallback(async () => {
    try {
      setIsConnecting(true);
      setError(null);

      console.log('=== VERNIER GDX: Starting connection ===');

      const goDirectLib = await loadGoDirectLibrary();
      console.log('GoDirect library loaded');

      const gdxDevice = await goDirectLib.selectDevice(true);
      deviceRef.current = gdxDevice;
      (window as any).vernierDevice = gdxDevice;

      console.log(`Connected to: ${gdxDevice.name}`);
      console.log(`Order code: ${gdxDevice.orderCode}`);
      console.log(`Serial: ${gdxDevice.serialNumber}`);

      console.log('=== SENSOR DISCOVERY ===');
      console.log(`Total sensors available: ${gdxDevice.sensors.length}`);

      gdxDevice.sensors.forEach((sensor: any, index: number) => {
        console.log(`  Sensor[${index}]: name="${sensor.name}", unit="${sensor.unit}", number=${sensor.number}, enabled=${sensor.enabled}`);
      });

      const sensors = discoverSensors(gdxDevice);

      if (!sensors.forceSensor) {
        console.warn('No force sensor found on device!');
      }

      console.log('=== ENABLING SENSORS ===');
      if (sensors.forceSensor) {
        sensors.forceSensor.setEnabled(true);
        console.log(`  Enabled: ${sensors.forceSensor.name} (${sensors.forceSensor.unit})`);
      }
      if (sensors.respRateSensor) {
        sensors.respRateSensor.setEnabled(true);
        console.log(`  Enabled: ${sensors.respRateSensor.name} (${sensors.respRateSensor.unit})`);
      }
      if (sensors.stepsSensor) {
        sensors.stepsSensor.setEnabled(true);
        console.log(`  Enabled: ${sensors.stepsSensor.name} (${sensors.stepsSensor.unit})`);
      }
      if (sensors.stepRateSensor) {
        sensors.stepRateSensor.setEnabled(true);
        console.log(`  Enabled: ${sensors.stepRateSensor.name} (${sensors.stepRateSensor.unit})`);
      }

      attachSensorListeners(sensors);

      console.log('=== STARTING DATA COLLECTION ===');
      await gdxDevice.start(100);
      console.log('Data collection started with 100ms measurement period');

      connectionStartTimeRef.current = Date.now();
      sessionTimerRef.current = setInterval(() => {
        if (connectionStartTimeRef.current > 0) {
          setSessionElapsed(Math.floor((Date.now() - connectionStartTimeRef.current) / 1000));
        }
      }, 1000);

      setIsConnected(true);
      setIsConnecting(false);
      console.log('=== CONNECTION COMPLETE ===');

    } catch (err) {
      console.error('Connection failed:', err);
      setError(`Connection failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsConnecting(false);
      setIsConnected(false);
    }
  }, [discoverSensors, attachSensorListeners]);

  const processForceValue = useCallback((forceValue: number) => {
    const now = Date.now();
    forceDataRef.current.push({ timestamp: now, force: forceValue });

    const recentSamples = 100;
    if (forceDataRef.current.length > recentSamples) {
      forceDataRef.current = forceDataRef.current.slice(-recentSamples);
    }

    if (forceDataRef.current.length < 20) {
      setBreathAmplitude(0.5);
      lastForceValueRef.current = forceValue;
      lastForceUpdateRef.current = now;
      return;
    }

    const forces = forceDataRef.current.map(d => d.force);
    const sortedForces = [...forces].sort((a, b) => a - b);
    const p10 = sortedForces[Math.floor(sortedForces.length * 0.1)];
    const p90 = sortedForces[Math.floor(sortedForces.length * 0.9)];

    let range = p90 - p10;

    if (!initialRangeRef.current && range > 0.5) {
      initialRangeRef.current = range;
    }

    if (initialRangeRef.current) {
      const minAllowed = initialRangeRef.current * 0.15;
      if (range < minAllowed) range = minAllowed;
    }

    const bufferBelow = range * 0.6;
    const bufferAbove = range * 0.1;
    const dynamicMin = p10 - bufferBelow;
    const dynamicMax = p90 + bufferAbove;

    const normalizedAmplitude = Math.max(0, Math.min(1, (forceValue - dynamicMin) / (dynamicMax - dynamicMin)));
    setBreathAmplitude(normalizedAmplitude);

    if (now - lastForceUpdateRef.current > 100) {
      const forceChange = forceValue - lastForceValueRef.current;
      const changeThreshold = calibrationProfile
        ? calibrationProfile.forceRange * 0.04
        : 0.2;

      if (forceChange > changeThreshold) {
        if (breathPhase !== 'inhale') {
          breathCyclesRef.current.push(now);
          breathCyclesRef.current = breathCyclesRef.current.filter(t => now - t < 120000);
        }
        setBreathPhase('inhale');
      } else if (forceChange < -changeThreshold) {
        setBreathPhase('exhale');
      } else {
        setBreathPhase('pause');
      }

      if (now - lastRateUpdateRef.current > 10000) {
        const recentCycles = breathCyclesRef.current.filter(t => now - t < 60000);
        if (recentCycles.length >= 2) {
          const timeSpan = (now - recentCycles[0]) / 1000;
          const cyclesPerSecond = (recentCycles.length - 1) / timeSpan;
          const bpm = Math.round(cyclesPerSecond * 60 * 10) / 10;
          const calculatedRate = Math.max(4, Math.min(30, bpm));
          if (deviceBreathingRate === null) {
            setBreathingRate(calculatedRate);
          }
        }
        lastRateUpdateRef.current = now;
      }

      lastForceValueRef.current = forceValue;
      lastForceUpdateRef.current = now;
    }
  }, [calibrationProfile, breathPhase, deviceBreathingRate]);

  const finishCalibration = useCallback(() => {
    if (calibrationDataRef.current.length === 0) {
      setError('No calibration data collected');
      calibrationStartTimeRef.current = 0;
      return;
    }

    const forces = [...calibrationDataRef.current].sort((a, b) => a - b);
    const minForce = forces[0];
    const maxForce = forces[forces.length - 1];
    const baselineForce = forces[Math.floor(forces.length / 2)];
    const forceRange = maxForce - minForce;

    const profile = { minForce, maxForce, baselineForce, forceRange, isValid: forceRange > 0.5 };
    console.log('Calibration profile:', profile);

    if (profile.isValid) {
      setCalibrationProfile(profile);
      setCalibrationComplete(true);
      setIsCalibrating(false);
      setCalibrationProgress(1.0);
      initialRangeRef.current = forceRange;
    } else {
      setError('Calibration failed: insufficient force range. Try breathing more deeply.');
      setIsCalibrating(false);
      setCalibrationProgress(0);
    }

    calibrationDataRef.current = [];
    calibrationStartTimeRef.current = 0;
  }, []);

  const disconnectDevice = useCallback(async () => {
    try {
      removeAllSensorListeners();

      if (deviceRef.current) {
        console.log('Disconnecting from Vernier device...');
        try { await deviceRef.current.stop(); } catch (e) { /* ignore */ }
        try { deviceRef.current.close(); } catch (e) { /* ignore */ }
        deviceRef.current = null;
        (window as any).vernierDevice = null;
      }

      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
        sessionTimerRef.current = null;
      }

      adoptedRef.current = false;

      setIsConnected(false);
      setIsConnecting(false);
      setError(null);
      setBreathAmplitude(0);
      setBreathPhase('pause');
      setBreathingRate(0);
      setCurrentForce(0);
      setDeviceBreathingRate(null);
      setStepsCount(0);
      setStepRate(0);
      setSessionElapsed(0);

      setIsCalibrating(false);
      setCalibrationProgress(0);
      setCalibrationComplete(false);
      setCalibrationProfile(null);

      forceDataRef.current = [];
      calibrationDataRef.current = [];
      calibrationStartTimeRef.current = 0;
      breathCyclesRef.current = [];
      initialRangeRef.current = null;
      connectionStartTimeRef.current = 0;
      lastBreathRateRecordRef.current = 0;

      console.log('Device disconnected');
    } catch (err) {
      console.error('Disconnect error:', err);
      setError(`Disconnect error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [removeAllSensorListeners]);

  const forceDisconnectDevice = useCallback(async () => {
    await disconnectDevice();
  }, [disconnectDevice]);

  const startCalibration = useCallback(async () => {
    if (!isConnected) {
      setError('Device must be connected before calibration');
      return;
    }

    console.log('Starting calibration - breathe normally for 20 seconds');
    setIsCalibrating(true);
    setCalibrationProgress(0);
    setCalibrationComplete(false);
    setCalibrationProfile(null);
    setError(null);

    calibrationDataRef.current = [];
    calibrationStartTimeRef.current = Date.now();
  }, [isConnected]);

  const resetBreathRateHistory = useCallback(() => {
    console.log('🔄 Breath rate history RESET (new session starting)');
    setBreathRateHistory([]);
    lastBreathRateRecordRef.current = 0;
  }, []);

  return {
    isConnected,
    isConnecting,
    breathAmplitude,
    breathPhase,
    breathingRate,
    deviceBreathingRate,
    stepsCount,
    stepRate,
    connectDevice,
    disconnectDevice,
    forceDisconnectDevice,
    error,
    isCalibrating,
    calibrationProgress,
    startCalibration,
    calibrationComplete,
    currentForce,
    calibrationProfile,
    sessionElapsed,
    breathRateHistory,
    resetBreathRateHistory,
  };
}
