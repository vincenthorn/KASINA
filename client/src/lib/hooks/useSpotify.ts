import { useState, useEffect, useCallback, useRef } from 'react';

interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: { name: string; images: Array<{ url: string }> };
  duration_ms: number;
  paused: boolean;
  position: number;
}

interface SpotifyAudioFeatures {
  id: string;
  danceability: number;
  energy: number;
  key: number;
  loudness: number;
  mode: number;
  speechiness: number;
  acousticness: number;
  instrumentalness: number;
  liveness: number;
  valence: number;
  tempo: number;
}

interface SpotifyAudioAnalysis {
  beats: Array<{ start: number; duration: number; confidence: number }>;
  sections: Array<{ start: number; duration: number; key: number; mode: number; tempo: number }>;
  segments: Array<{ start: number; duration: number; loudness_start: number; pitches: number[] }>;
}

export const useSpotify = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [player, setPlayer] = useState<any>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrack | null>(null);
  const playerRef = useRef<any>(null);
  const spotifyApiRef = useRef<any>(null);

  // Initialize Spotify Web Playback SDK
  useEffect(() => {
    if (!window.Spotify) {
      // Load Spotify Web Playback SDK
      const script = document.createElement('script');
      script.src = 'https://sdk.scdn.co/spotify-player.js';
      script.async = true;
      document.body.appendChild(script);

      window.onSpotifyWebPlaybackSDKReady = () => {
        console.log('Spotify Web Playback SDK is ready');
      };
    }
  }, []);

  const connectSpotify = useCallback(async () => {
    try {
      // Check if we have stored tokens
      const storedToken = localStorage.getItem('spotify_access_token');
      if (storedToken) {
        setAccessToken(storedToken);
        await initializePlayer(storedToken);
        return;
      }

      // Redirect to Spotify authorization
      const clientId = process.env.REACT_APP_SPOTIFY_CLIENT_ID;
      if (!clientId) {
        throw new Error('Spotify Client ID not configured');
      }

      const redirectUri = `${window.location.origin}/spotify-callback`;
      const scopes = [
        'streaming',
        'user-read-email',
        'user-read-private',
        'user-read-playback-state',
        'user-modify-playback-state',
        'user-read-currently-playing'
      ].join(' ');

      const authUrl = `https://accounts.spotify.com/authorize?` +
        `client_id=${clientId}&` +
        `response_type=token&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent(scopes)}`;

      window.location.href = authUrl;
    } catch (error) {
      console.error('Error connecting to Spotify:', error);
    }
  }, []);

  const initializePlayer = useCallback(async (token: string) => {
    if (!window.Spotify || !token) return;

    const spotifyPlayer = new window.Spotify.Player({
      name: 'KASINA Musical Meditation',
      getOAuthToken: (cb: (token: string) => void) => { cb(token); },
      volume: 0.8
    });

    spotifyPlayer.addListener('ready', ({ device_id }: { device_id: string }) => {
      console.log('Spotify player ready with Device ID:', device_id);
      setDeviceId(device_id);
      setIsConnected(true);
    });

    spotifyPlayer.addListener('not_ready', ({ device_id }: { device_id: string }) => {
      console.log('Device ID has gone offline:', device_id);
      setIsConnected(false);
    });

    spotifyPlayer.addListener('player_state_changed', (state: any) => {
      if (state) {
        const track = state.track_window.current_track;
        setCurrentTrack({
          id: track.id,
          name: track.name,
          artists: track.artists,
          album: track.album,
          duration_ms: track.duration_ms,
          paused: state.paused,
          position: state.position
        });
      }
    });

    spotifyPlayer.connect();
    setPlayer(spotifyPlayer);
    playerRef.current = spotifyPlayer;
  }, []);

  // Handle Spotify callback (extract token from URL)
  useEffect(() => {
    const handleCallback = () => {
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      const token = params.get('access_token');
      
      if (token) {
        localStorage.setItem('spotify_access_token', token);
        setAccessToken(token);
        initializePlayer(token);
        
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };

    if (window.location.hash.includes('access_token')) {
      handleCallback();
    }
  }, [initializePlayer]);

  const disconnectSpotify = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.disconnect();
    }
    localStorage.removeItem('spotify_access_token');
    setIsConnected(false);
    setPlayer(null);
    setDeviceId(null);
    setAccessToken(null);
    setCurrentTrack(null);
  }, []);

  const spotifyApiCall = useCallback(async (endpoint: string) => {
    if (!accessToken) throw new Error('No access token');
    
    const response = await fetch(`https://api.spotify.com/v1${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Spotify API error: ${response.status}`);
    }
    
    return response.json();
  }, [accessToken]);

  const getCurrentTrack = useCallback(async () => {
    try {
      const data = await spotifyApiCall('/me/player/currently-playing');
      return data?.item || null;
    } catch (error) {
      console.error('Error getting current track:', error);
      return null;
    }
  }, [spotifyApiCall]);

  const getAudioFeatures = useCallback(async (trackId: string): Promise<SpotifyAudioFeatures | null> => {
    try {
      const data = await spotifyApiCall(`/audio-features/${trackId}`);
      return data;
    } catch (error) {
      console.error('Error getting audio features:', error);
      return null;
    }
  }, [spotifyApiCall]);

  const getAudioAnalysis = useCallback(async (trackId: string): Promise<SpotifyAudioAnalysis | null> => {
    try {
      const data = await spotifyApiCall(`/audio-analysis/${trackId}`);
      return {
        beats: data.beats || [],
        sections: data.sections || [],
        segments: data.segments || []
      };
    } catch (error) {
      console.error('Error getting audio analysis:', error);
      return null;
    }
  }, [spotifyApiCall]);

  const playTrack = useCallback(async () => {
    if (playerRef.current) {
      await playerRef.current.resume();
    }
  }, []);

  const pauseTrack = useCallback(async () => {
    if (playerRef.current) {
      await playerRef.current.pause();
    }
  }, []);

  const nextTrack = useCallback(async () => {
    if (playerRef.current) {
      await playerRef.current.nextTrack();
    }
  }, []);

  const previousTrack = useCallback(async () => {
    if (playerRef.current) {
      await playerRef.current.previousTrack();
    }
  }, []);

  return {
    isConnected,
    player,
    deviceId,
    accessToken,
    currentTrack,
    connectSpotify,
    disconnectSpotify,
    getCurrentTrack,
    getAudioFeatures,
    getAudioAnalysis,
    playTrack,
    pauseTrack,
    nextTrack,
    previousTrack
  };
};

// Extend Window interface for Spotify SDK
declare global {
  interface Window {
    Spotify: any;
    onSpotifyWebPlaybackSDKReady: () => void;
  }
}