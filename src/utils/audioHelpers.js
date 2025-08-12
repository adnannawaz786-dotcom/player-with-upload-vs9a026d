// Audio processing and visualization utility functions
export const createAudioContext = () => {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  return new AudioContext();
};

// Create analyser node with optimal settings for visualization
export const createAnalyser = (audioContext, fftSize = 2048) => {
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = fftSize;
  analyser.smoothingTimeConstant = 0.8;
  analyser.minDecibels = -90;
  analyser.maxDecibels = -10;
  return analyser;
};

// Load audio file and create audio buffer
export const loadAudioFile = async (file, audioContext) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const arrayBuffer = event.target.result;
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        resolve(audioBuffer);
      } catch (error) {
        reject(new Error('Failed to decode audio file'));
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
};

// Create audio source from buffer
export const createAudioSource = (audioContext, audioBuffer) => {
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  return source;
};

// Get frequency data for visualization
export const getFrequencyData = (analyser) => {
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteFrequencyData(dataArray);
  return dataArray;
};

// Get time domain data for waveform visualization
export const getTimeDomainData = (analyser) => {
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteTimeDomainData(dataArray);
  return dataArray;
};

// Draw frequency bars visualization
export const drawFrequencyBars = (canvas, dataArray, options = {}) => {
  const {
    color = '#00ff88',
    backgroundColor = 'rgba(0, 0, 0, 0.1)',
    barWidth = null,
    barSpacing = 2
  } = options;
  
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  
  // Clear canvas with background
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);
  
  const actualBarWidth = barWidth || (width / dataArray.length) - barSpacing;
  
  ctx.fillStyle = color;
  
  for (let i = 0; i < dataArray.length; i++) {
    const barHeight = (dataArray[i] / 255) * height;
    const x = i * (actualBarWidth + barSpacing);
    const y = height - barHeight;
    
    ctx.fillRect(x, y, actualBarWidth, barHeight);
  }
};

// Draw circular frequency visualization
export const drawCircularFrequency = (canvas, dataArray, options = {}) => {
  const {
    color = '#00ff88',
    backgroundColor = 'rgba(0, 0, 0, 0.1)',
    radius = 100,
    centerX = null,
    centerY = null
  } = options;
  
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  const cx = centerX || width / 2;
  const cy = centerY || height / 2;
  
  // Clear canvas
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);
  
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  
  const angleStep = (Math.PI * 2) / dataArray.length;
  
  ctx.beginPath();
  
  for (let i = 0; i < dataArray.length; i++) {
    const angle = i * angleStep;
    const amplitude = (dataArray[i] / 255) * radius;
    const x = cx + Math.cos(angle) * (radius + amplitude);
    const y = cy + Math.sin(angle) * (radius + amplitude);
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  
  ctx.closePath();
  ctx.stroke();
};

// Draw waveform visualization
export const drawWaveform = (canvas, dataArray, options = {}) => {
  const {
    color = '#00ff88',
    backgroundColor = 'rgba(0, 0, 0, 0.1)',
    lineWidth = 2
  } = options;
  
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  
  // Clear canvas
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);
  
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  
  const sliceWidth = width / dataArray.length;
  let x = 0;
  
  for (let i = 0; i < dataArray.length; i++) {
    const v = dataArray[i] / 128.0;
    const y = v * height / 2;
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
    
    x += sliceWidth;
  }
  
  ctx.stroke();
};

// Format time duration
export const formatTime = (seconds) => {
  if (isNaN(seconds)) return '0:00';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

// Validate audio file type
export const isValidAudioFile = (file) => {
  const validTypes = [
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/ogg',
    'audio/aac',
    'audio/m4a'
  ];
  
  return validTypes.includes(file.type) || 
         file.name.match(/\.(mp3|wav|ogg|aac|m4a)$/i);
};

// Extract metadata from audio file
export const extractAudioMetadata = (file) => {
  return new Promise((resolve) => {
    const audio = document.createElement('audio');
    const url = URL.createObjectURL(file);
    
    audio.addEventListener('loadedmetadata', () => {
      const metadata = {
        duration: audio.duration,
        name: file.name.replace(/\.[^/.]+$/, ''),
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
      };
      
      URL.revokeObjectURL(url);
      resolve(metadata);
    });
    
    audio.addEventListener('error', () => {
      URL.revokeObjectURL(url);
      resolve({
        name: file.name.replace(/\.[^/.]+$/, ''),
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        duration: 0
      });
    });
    
    audio.src = url;
  });
};

// Create gain node for volume control
export const createGainNode = (audioContext, initialGain = 1) => {
  const gainNode = audioContext.createGain();
  gainNode.gain.setValueAtTime(initialGain, audioContext.currentTime);
  return gainNode;
};

// Smooth volume change
export const setVolume = (gainNode, volume, duration = 0.1) => {
  const audioContext = gainNode.context;
  const currentTime = audioContext.currentTime;
  
  gainNode.gain.cancelScheduledValues(currentTime);
  gainNode.gain.setValueAtTime(gainNode.gain.value, currentTime);
  gainNode.gain.linearRampToValueAtTime(volume, currentTime + duration);
};

// Create audio buffer from URL
export const loadAudioFromUrl = async (url, audioContext) => {
  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    return audioBuffer;
  } catch (error) {
    throw new Error(`Failed to load audio from URL: ${error.message}`);
  }
};

// Calculate RMS (Root Mean Square) for volume level indication
export const calculateRMS = (dataArray) => {
  let sum = 0;
  for (let i = 0; i < dataArray.length; i++) {
    const normalized = (dataArray[i] - 128) / 128;
    sum += normalized * normalized;
  }
  return Math.sqrt(sum / dataArray.length);
};

// Get dominant frequency
export const getDominantFrequency = (dataArray, sampleRate) => {
  let maxIndex = 0;
  let maxValue = 0;
  
  for (let i = 0; i < dataArray.length; i++) {
    if (dataArray[i] > maxValue) {
      maxValue = dataArray[i];
      maxIndex = i;
    }
  }
  
  return (maxIndex * sampleRate) / (dataArray.length * 2);
};

// Create default placeholder album art
export const createPlaceholderArt = (canvas, title = 'Unknown Track') => {
  const ctx = canvas.getContext('2d');
  const size = Math.min(canvas.width, canvas.height);
  
  // Create gradient background
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#667eea');
  gradient.addColorStop(1, '#764ba2');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Add music note icon (simple representation)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.font = `${size * 0.3}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('♪', canvas.width / 2, canvas.height / 2);
  
  // Add title
  ctx.font = `${size * 0.08}px Arial`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.fillText(title, canvas.width / 2, canvas.height * 0.8);
};