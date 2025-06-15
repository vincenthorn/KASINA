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
  const [playlists, setPlaylists] = useState<any[]>([]);
  const playerRef = useRef<any>(null);
  const spotifyApiRef = useRef<any>(null);
  
  // Audio analysis cache to minimize API calls (PRD requirement)
  const audioFeaturesCache = useRef<Map<string, SpotifyAudioFeatures>>(new Map());
  const audioAnalysisCache = useRef<Map<string, SpotifyAudioAnalysis>>(new Map());

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
      const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
      if (!clientId) {
        throw new Error('Spotify Client ID not configured');
      }

      // Try exact redirect URI match with your Spotify app configuration
      const redirectUri = 'https://workspace.vjhorn.repl.co/musical-kasina';
      console.log('🎵 Spotify Auth Debug:', {
        origin: window.location.origin,
        redirectUri,
        clientId
      });
      
      const scopes = [
        'streaming',
        'user-read-email',
        'user-read-private',
        'user-read-playback-state',
        'user-modify-playback-state',
        'user-read-currently-playing',
        'playlist-read-private',
        'playlist-read-collaborative'
      ].join(' ');

      const authUrl = `https://accounts.spotify.com/authorize?` +
        `client_id=${clientId}&` +
        `response_type=token&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent(scopes)}`;

      console.log('🎵 Complete Spotify Auth URL:', authUrl);
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
      // Check cache first (PRD requirement for rate limiting)
      if (audioFeaturesCache.current.has(trackId)) {
        return audioFeaturesCache.current.get(trackId)!;
      }
      
      const data = await spotifyApiCall(`/audio-features/${trackId}`);
      if (data) {
        audioFeaturesCache.current.set(trackId, data);
      }
      return data;
    } catch (error) {
      console.error('Error getting audio features:', error);
      return null;
    }
  }, [spotifyApiCall]);

  const getAudioAnalysis = useCallback(async (trackId: string): Promise<SpotifyAudioAnalysis | null> => {
    try {
      // Check cache first (PRD requirement for rate limiting)
      if (audioAnalysisCache.current.has(trackId)) {
        return audioAnalysisCache.current.get(trackId)!;
      }
      
      const data = await spotifyApiCall(`/audio-analysis/${trackId}`);
      const analysis = {
        beats: data.beats || [],
        sections: data.sections || [],
        segments: data.segments || []
      };
      
      if (analysis) {
        audioAnalysisCache.current.set(trackId, analysis);
      }
      return analysis;
    } catch (error) {
      console.error('Error getting audio analysis:', error);
      return null;
    }
  }, [spotifyApiCall]);

  const getUserPlaylists = useCallback(async () => {
    try {
      const data = await spotifyApiCall('/me/playlists?limit=50');
      setPlaylists(data.items || []);
      return data.items || [];
    } catch (error) {
      console.error('Error getting playlists:', error);
      return [];
    }
  }, [spotifyApiCall]);

  const playPlaylist = useCallback(async (playlistId: string) => {
    try {
      const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          context_uri: `spotify:playlist:${playlistId}`
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error playing playlist:', error);
    }
  }, [accessToken, deviceId]);

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
    playlists,
    connectSpotify,
    disconnectSpotify,
    getCurrentTrack,
    getAudioFeatures,
    getAudioAnalysis,
    getUserPlaylists,
    playPlaylist,
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