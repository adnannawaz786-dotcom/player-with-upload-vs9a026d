import { useState, useEffect, useRef, useCallback } from 'react';

const useAudioContext = () => {
  const [audioContext, setAudioContext] = useState(null);
  const [analyser, setAnalyser] = useState(null);
  const [source, setSource] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState(null);
  
  const audioElementRef = useRef(null);
  const gainNodeRef = useRef(null);
  const dataArrayRef = useRef(null);
  const bufferLengthRef = useRef(0);

  // Initialize Web Audio API context
  const initializeContext = useCallback(async () => {
    try {
      if (audioContext && audioContext.state !== 'closed') {
        return;
      }

      const context = new (window.AudioContext || window.webkitAudioContext)();
      
      // Resume context if suspended (required for user interaction)
      if (context.state === 'suspended') {
        await context.resume();
      }

      const analyserNode = context.createAnalyser();
      analyserNode.fftSize = 2048;
      analyserNode.smoothingTimeConstant = 0.85;

      const gainNode = context.createGain();
      gainNode.gain.value = 1;

      // Connect nodes
      analyserNode.connect(gainNode);
      gainNode.connect(context.destination);

      const bufferLength = analyserNode.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      setAudioContext(context);
      setAnalyser(analyserNode);
      gainNodeRef.current = gainNode;
      dataArrayRef.current = dataArray;
      bufferLengthRef.current = bufferLength;
      setIsInitialized(true);
      setError(null);

    } catch (err) {
      console.error('Failed to initialize audio context:', err);
      setError('Failed to initialize audio system');
    }
  }, [audioContext]);

  // Connect audio element to Web Audio API
  const connectAudioElement = useCallback((audioElement) => {
    if (!audioContext || !analyser || !audioElement) {
      return null;
    }

    try {
      // Disconnect previous source if exists
      if (source) {
        source.disconnect();
      }

      // Create new source from audio element
      const mediaSource = audioContext.createMediaElementSource(audioElement);
      mediaSource.connect(analyser);
      
      audioElementRef.current = audioElement;
      setSource(mediaSource);
      
      return mediaSource;
    } catch (err) {
      console.error('Failed to connect audio element:', err);
      setError('Failed to connect audio source');
      return null;
    }
  }, [audioContext, analyser, source]);

  // Get frequency data for visualization
  const getFrequencyData = useCallback(() => {
    if (!analyser || !dataArrayRef.current) {
      return new Uint8Array(0);
    }

    analyser.getByteFrequencyData(dataArrayRef.current);
    return dataArrayRef.current;
  }, [analyser]);

  // Get time domain data for waveform visualization
  const getTimeDomainData = useCallback(() => {
    if (!analyser || !dataArrayRef.current) {
      return new Uint8Array(0);
    }

    analyser.getByteTimeDomainData(dataArrayRef.current);
    return dataArrayRef.current;
  }, [analyser]);

  // Set volume (0-1)
  const setVolume = useCallback((volume) => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = Math.max(0, Math.min(1, volume));
    }
  }, []);

  // Get current volume
  const getVolume = useCallback(() => {
    return gainNodeRef.current ? gainNodeRef.current.gain.value : 1;
  }, []);

  // Apply audio effects
  const applyLowPassFilter = useCallback((frequency = 1000) => {
    if (!audioContext || !source) return;

    try {
      const filter = audioContext.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = frequency;
      
      source.disconnect();
      source.connect(filter);
      filter.connect(analyser);
    } catch (err) {
      console.error('Failed to apply low pass filter:', err);
    }
  }, [audioContext, source, analyser]);

  const applyHighPassFilter = useCallback((frequency = 1000) => {
    if (!audioContext || !source) return;

    try {
      const filter = audioContext.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = frequency;
      
      source.disconnect();
      source.connect(filter);
      filter.connect(analyser);
    } catch (err) {
      console.error('Failed to apply high pass filter:', err);
    }
  }, [audioContext, source, analyser]);

  const removeFilters = useCallback(() => {
    if (!source || !analyser) return;

    try {
      source.disconnect();
      source.connect(analyser);
    } catch (err) {
      console.error('Failed to remove filters:', err);
    }
  }, [source, analyser]);

  // Get audio analysis data
  const getAudioAnalysis = useCallback(() => {
    const frequencyData = getFrequencyData();
    
    if (frequencyData.length === 0) {
      return {
        bass: 0,
        mid: 0,
        treble: 0,
        volume: 0,
        peak: 0
      };
    }

    const bassEnd = Math.floor(frequencyData.length * 0.1);
    const midEnd = Math.floor(frequencyData.length * 0.5);
    
    let bass = 0, mid = 0, treble = 0, peak = 0;
    
    // Calculate bass (0-10% of frequency range)
    for (let i = 0; i < bassEnd; i++) {
      bass += frequencyData[i];
      peak = Math.max(peak, frequencyData[i]);
    }
    bass /= bassEnd;
    
    // Calculate mid (10-50% of frequency range)
    for (let i = bassEnd; i < midEnd; i++) {
      mid += frequencyData[i];
      peak = Math.max(peak, frequencyData[i]);
    }
    mid /= (midEnd - bassEnd);
    
    // Calculate treble (50-100% of frequency range)
    for (let i = midEnd; i < frequencyData.length; i++) {
      treble += frequencyData[i];
      peak = Math.max(peak, frequencyData[i]);
    }
    treble /= (frequencyData.length - midEnd);
    
    const volume = (bass + mid + treble) / 3;
    
    return {
      bass: bass / 255,
      mid: mid / 255,
      treble: treble / 255,
      volume: volume / 255,
      peak: peak / 255
    };
  }, [getFrequencyData]);

  // Cleanup function
  const cleanup = useCallback(() => {
    try {
      if (source) {
        source.disconnect();
      }
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
      }
    } catch (err) {
      console.error('Error during cleanup:', err);
    }
    
    setAudioContext(null);
    setAnalyser(null);
    setSource(null);
    setIsInitialized(false);
    audioElementRef.current = null;
    gainNodeRef.current = null;
    dataArrayRef.current = null;
    bufferLengthRef.current = 0;
  }, [source, audioContext]);

  // Initialize on mount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // Handle audio context state changes
  useEffect(() => {
    if (!audioContext) return;

    const handleStateChange = () => {
      if (audioContext.state === 'suspended') {
        // Try to resume context
        audioContext.resume().catch(console.error);
      }
    };

    audioContext.addEventListener('statechange', handleStateChange);
    
    return () => {
      audioContext.removeEventListener('statechange', handleStateChange);
    };
  }, [audioContext]);

  return {
    // State
    isInitialized,
    error,
    audioContext,
    analyser,
    bufferLength: bufferLengthRef.current,
    
    // Methods
    initializeContext,
    connectAudioElement,
    getFrequencyData,
    getTimeDomainData,
    getAudioAnalysis,
    setVolume,
    getVolume,
    applyLowPassFilter,
    applyHighPassFilter,
    removeFilters,
    cleanup,
    
    // Refs for external access
    audioElementRef,
    gainNodeRef
  };
};

export default useAudioContext;
