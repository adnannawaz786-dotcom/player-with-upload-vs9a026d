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
      
      if (context.state === 'suspended') {
        await context.resume();
      }

      const analyserNode = context.createAnalyser();
      analyserNode.fftSize = 2048;
      analyserNode.smoothingTimeConstant = 0.85;

      const gainNode = context.createGain();
      gainNode.gain.value = 1;

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
      if (source) {
        source.disconnect();
      }

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

  const getFrequencyData = useCallback(() => {
    if (!analyser || !dataArrayRef.current) {
      return new Uint8Array(0);
    }

    analyser.getByteFrequencyData(dataArrayRef.current);
    return dataArrayRef.current;
  }, [analyser]);

  const getTimeDomainData = useCallback(() => {
    if (!analyser || !dataArrayRef.current) {
      return new Uint8Array(0);
    }

    analyser.getByteTimeDomainData(dataArrayRef.current);
    return dataArrayRef.current;
  }, [analyser]);

  const setVolume = useCallback((volume) => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = Math.max(0, Math.min(1, volume));
    }
  }, []);

  const getVolume = useCallback(() => {
    return gainNodeRef.current ? gainNodeRef.current.gain.value : 1;
  }, []);

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
    
    for (let i = 0; i < bassEnd; i++) {
      bass += frequencyData[i];
      peak = Math.max(peak, frequencyData[i]);
    }
    bass /= bassEnd;
    
    for (let i = bassEnd; i < midEnd; i++) {
      mid += frequencyData[i];
      peak = Math.max(peak, frequencyData[i]);
    }
    mid /= (midEnd - bassEnd);
    
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

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  useEffect(() => {
    if (!audioContext) return;

    const handleStateChange = () => {
      if (audioContext.state === 'suspended') {
        audioContext.resume().catch(console.error);
      }
    };

    audioContext.addEventListener('statechange', handleStateChange);
    
    return () => {
      audioContext.removeEventListener('statechange', handleStateChange);
    };
  }, [audioContext]);

  return {
    isInitialized,
    error,
    audioContext,
    analyser,
    bufferLength: bufferLengthRef.current,
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
    audioElementRef,
    gainNodeRef
  };
};

export default useAudioContext;
