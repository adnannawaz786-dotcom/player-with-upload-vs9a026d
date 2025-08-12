import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Radio, Waves, Zap } from 'lucide-react';

const Visualizer = ({ 
  audioElement, 
  isPlaying, 
  currentTrack,
  className = "" 
}) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const analyserRef = useRef(null);
  const audioContextRef = useRef(null);
  const sourceRef = useRef(null);
  const dataArrayRef = useRef(null);
  
  const [visualizerType, setVisualizerType] = useState('bars');
  const [isInitialized, setIsInitialized] = useState(false);

  const visualizerTypes = [
    { id: 'bars', icon: BarChart3, name: 'Bars' },
    { id: 'wave', icon: Waves, name: 'Wave' },
    { id: 'circular', icon: Radio, name: 'Circular' },
    { id: 'particles', icon: Zap, name: 'Particles' }
  ];

  // Initialize audio context and analyser
  useEffect(() => {
    if (!audioElement || isInitialized) return;

    const initializeAudio = async () => {
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }

        if (!sourceRef.current) {
          sourceRef.current = audioContextRef.current.createMediaElementSource(audioElement);
        }

        if (!analyserRef.current) {
          analyserRef.current = audioContextRef.current.createAnalyser();
          analyserRef.current.fftSize = 256;
          analyserRef.current.smoothingTimeConstant = 0.8;
          
          sourceRef.current.connect(analyserRef.current);
          analyserRef.current.connect(audioContextRef.current.destination);
          
          const bufferLength = analyserRef.current.frequencyBinCount;
          dataArrayRef.current = new Uint8Array(bufferLength);
        }

        setIsInitialized(true);
      } catch (error) {
        console.error('Error initializing audio context:', error);
      }
    };

    initializeAudio();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [audioElement, isInitialized]);

  // Animation loop
  useEffect(() => {
    if (!isInitialized || !analyserRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    const animate = () => {
      if (!isPlaying) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      // Resume audio context if suspended
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume();
      }

      analyserRef.current.getByteFrequencyData(dataArrayRef.current);
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw visualization based on type
      switch (visualizerType) {
        case 'bars':
          drawBars(ctx, canvas, dataArrayRef.current);
          break;
        case 'wave':
          drawWave(ctx, canvas, dataArrayRef.current);
          break;
        case 'circular':
          drawCircular(ctx, canvas, dataArrayRef.current);
          break;
        case 'particles':
          drawParticles(ctx, canvas, dataArrayRef.current);
          break;
        default:
          drawBars(ctx, canvas, dataArrayRef.current);
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, visualizerType, isInitialized]);

  // Resize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      
      const ctx = canvas.getContext('2d');
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  const drawBars = (ctx, canvas, dataArray) => {
    const width = canvas.width / window.devicePixelRatio;
    const height = canvas.height / window.devicePixelRatio;
    const barWidth = width / dataArray.length;
    
    const gradient = ctx.createLinearGradient(0, height, 0, 0);
    gradient.addColorStop(0, '#8b5cf6');
    gradient.addColorStop(0.5, '#06b6d4');
    gradient.addColorStop(1, '#10b981');
    
    ctx.fillStyle = gradient;
    
    for (let i = 0; i < dataArray.length; i++) {
      const barHeight = (dataArray[i] / 255) * height * 0.8;
      const x = i * barWidth;
      const y = height - barHeight;
      
      ctx.fillRect(x, y, barWidth - 1, barHeight);
    }
  };

  const drawWave = (ctx, canvas, dataArray) => {
    const width = canvas.width / window.devicePixelRatio;
    const height = canvas.height / window.devicePixelRatio;
    const centerY = height / 2;
    
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    for (let i = 0; i < dataArray.length; i++) {
      const x = (i / dataArray.length) * width;
      const amplitude = (dataArray[i] / 255) * (height / 3);
      const y = centerY + Math.sin(i * 0.1) * amplitude;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    
    ctx.stroke();
  };

  const drawCircular = (ctx, canvas, dataArray) => {
    const width = canvas.width / window.devicePixelRatio;
    const height = canvas.height / window.devicePixelRatio;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 4;
    
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius * 2);
    gradient.addColorStop(0, '#8b5cf6');
    gradient.addColorStop(0.5, '#06b6d4');
    gradient.addColorStop(1, 'transparent');
    
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;
    
    for (let i = 0; i < dataArray.length; i++) {
      const angle = (i / dataArray.length) * Math.PI * 2;
      const amplitude = (dataArray[i] / 255) * radius;
      const x1 = centerX + Math.cos(angle) * radius;
      const y1 = centerY + Math.sin(angle) * radius;
      const x2 = centerX + Math.cos(angle) * (radius + amplitude);
      const y2 = centerY + Math.sin(angle) * (radius + amplitude);
      
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  };

  const drawParticles = (ctx, canvas, dataArray) => {
    const width = canvas.width / window.devicePixelRatio;
    const height = canvas.height / window.devicePixelRatio;
    
    const gradient = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, width/2);
    gradient.addColorStop(0, '#8b5cf6');
    gradient.addColorStop(0.5, '#06b6d4');
    gradient.addColorStop(1, '#10b981');
    
    ctx.fillStyle = gradient;
    
    for (let i = 0; i < dataArray.length; i += 4) {
      const intensity = dataArray[i] / 255;
      if (intensity > 0.1) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const size = intensity * 6;
        
        ctx.globalAlpha = intensity;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    ctx.globalAlpha = 1;
  };

  return (
    <div className={`relative ${className}`}>
      {/* Visualizer Canvas */}
      <div className="relative h-64 w-full rounded-xl overflow-hidden bg-gradient-to-br from-purple-900/20 to-cyan-900/20 backdrop-blur-md border border-white/10">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ filter: 'drop-shadow(0 0 20px rgba(139, 92, 246, 0.3))' }}
        />
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
        
        {/* Track info overlay */}
        {currentTrack && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-4 left-4 text-white"
          >
            <h3 className="font-semibold text-lg drop-shadow-lg">
              {currentTrack.title}
            </h3>
            <p className="text-white/70 text-sm drop-shadow">
              {currentTrack.artist}
            </p>
          </motion.div>
        )}
      </div>

      {/* Visualizer Type Selector */}
      <div className="flex justify-center mt-4 space-x-2">
        {visualizerTypes.map((type) => {
          const Icon = type.icon;
          return (
            <motion.button
              key={type.id}
              onClick={() => setVisualizerType(type.id)}
              className={`
                p-3 rounded-lg backdrop-blur-md border transition-all duration-200
                ${visualizerType === type.id 
                  ? 'bg-purple-500/30 border-purple-400/50 text-white shadow-lg shadow-purple-500/20' 
                  : 'bg-white/10 border-white/20 text-white/70 hover:bg-white/20 hover:text-white'
                }
              `}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title={type.name}
            >
              <Icon size={18} />
            </motion.button>
          );
        })}
      </div>

      {/* Status indicator */}
      <div className="flex justify-center mt-2">
        <div className={`
          px-3 py-1 rounded-full text-xs font-medium backdrop-blur-md border
          ${isPlaying 
            ? 'bg-green-500/20 border-green-400/30 text-green-300' 
            : 'bg-gray-500/20 border-gray-400/30 text-gray-300'
          }
        `}>
          {isPlaying ? '● Live' : '○ Paused'}
        </div>
      </div>
    </div>
  );
};

export default Visualizer;