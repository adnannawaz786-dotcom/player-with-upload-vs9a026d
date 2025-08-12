import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Music } from 'lucide-react';
import AudioPlayer from './components/AudioPlayer';
import Visualizer from './components/Visualizer';
import useAudioContext from './hooks/useAudioContext';
import './styles/glassmorphism.css';

const App = () => {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [playlist, setPlaylist] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState('none'); // 'none', 'one', 'all'
  const [isDragging, setIsDragging] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  const audioRef = useRef(null);
  const fileInputRef = useRef(null);
  const { analyser, audioContext, connectAudioElement, getFrequencyData } = useAudioContext();

  const sampleTracks = [
    {
      id: 1,
      title: "Synthwave Dreams",
      artist: "Digital Artist",
      duration: 240,
      url: null,
      albumArt: "https://via.placeholder.com/300x300/667eea/ffffff?text=Synthwave"
    },
    {
      id: 2,
      title: "Neon Nights",
      artist: "Retro Wave",
      duration: 195,
      url: null,
      albumArt: "https://via.placeholder.com/300x300/764ba2/ffffff?text=Neon"
    }
  ];

  useEffect(() => {
    if (playlist.length === 0) {
      setPlaylist(sampleTracks);
      setCurrentTrack(sampleTracks[0]);
    }
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => {
      if (!isDragging) {
        setCurrentTime(audio.currentTime);
      }
    };

    const updateDuration = () => {
      setDuration(audio.duration || 0);
    };

    const handleEnded = () => {
      handleNext();
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [isDragging, repeatMode, isShuffled, playlist, currentTrack]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio && audioContext && analyser) {
      connectAudioElement(audio);
    }
  }, [currentTrack, audioContext, analyser, connectAudioElement]);

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    
    files.forEach(file => {
      if (file.type.startsWith('audio/')) {
        const url = URL.createObjectURL(file);
        const newTrack = {
          id: Date.now() + Math.random(),
          title: file.name.replace(/\.[^/.]+$/, ""),
          artist: "Unknown Artist",
          duration: 0,
          url: url,
          albumArt: "https://via.placeholder.com/300x300/4facfe/ffffff?text=♪"
        };
        
        setPlaylist(prev => [...prev, newTrack]);
        
        if (!currentTrack) {
          setCurrentTrack(newTrack);
        }
      }
    });
    
    setShowUpload(false);
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(console.error);
    }
    setIsPlaying(!isPlaying);
  };

  const handleNext = () => {
    if (!playlist.length) return;
    
    const currentIndex = playlist.findIndex(track => track.id === currentTrack?.id);
    let nextIndex;
    
    if (repeatMode === 'one') {
      nextIndex = currentIndex;
    } else if (isShuffled) {
      nextIndex = Math.floor(Math.random() * playlist.length);
    } else {
      nextIndex = (currentIndex + 1) % playlist.length;
    }
    
    setCurrentTrack(playlist[nextIndex]);
    setIsPlaying(true);
  };

  const handlePrevious = () => {
    if (!playlist.length) return;
    
    const currentIndex = playlist.findIndex(track => track.id === currentTrack?.id);
    let prevIndex;
    
    if (isShuffled) {
      prevIndex = Math.floor(Math.random() * playlist.length);
    } else {
      prevIndex = currentIndex === 0 ? playlist.length - 1 : currentIndex - 1;
    }
    
    setCurrentTrack(playlist[prevIndex]);
    setIsPlaying(true);
  };

  const handleSeek = (newTime) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleVolumeChange = (newVolume) => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = newVolume;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    }
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (audio) {
      if (isMuted) {
        audio.volume = volume;
        setIsMuted(false);
      } else {
        audio.volume = 0;
        setIsMuted(true);
      }
    }
  };

  const formatTime = (time) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-70"
          animate={{ x: [0, 100, 0], y: [0, -100, 0] }}
          transition={{ duration: 20, repeat: Infinity, repeatType: "reverse" }}
        />
        <motion.div
          className="absolute -bottom-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-70"
          animate={{ x: [0, -100, 0], y: [0, 100, 0] }}
          transition={{ duration: 15, repeat: Infinity, repeatType: "reverse" }}
        />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Audio Player
          </h1>
          <p className="text-white/70 text-lg">Upload and visualize your music</p>
        </motion.div>

        {/* Player & Visualizer */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6">
            <Visualizer analyser={analyser} isPlaying={isPlaying} getFrequencyData={getFrequencyData} />
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="glass-card p-6">
            <AudioPlayer
              currentTrack={currentTrack}
              playlist={playlist}
              isPlaying={isPlaying}
              currentTime={currentTime}
              duration={duration}
              volume={volume}
              isMuted={isMuted}
              onPlay={togglePlay}
              onNext={handleNext}
              onPrevious={handlePrevious}
              onSeek={handleSeek}
              onVolumeChange={handleVolumeChange}
              onMute={toggleMute}
              onTrackSelect={setCurrentTrack}
              formatTime={formatTime}
              isDragging={isDragging}
              setIsDragging={setIsDragging}
            />
          </motion.div>
        </div>

        {/* Upload Button */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="flex justify-center mt-8">
          <button onClick={() => setShowUpload(true)} className="glass-button flex items-center gap-2 px-6 py-3 text-white hover:scale-105 transition-all duration-300">
            <Upload size={20} />
            Upload Music
          </button>
        </motion.div>

        {/* Upload Modal */}
        <AnimatePresence>
          {showUpload && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowUpload(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="glass-card p-8 max-w-md w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-2xl font-bold text-white mb-4">Upload Audio Files</h3>
                <div
                  className="border-2 border-dashed border-white/30 rounded-lg p-8 text-center hover:border-white/50 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Music size={48} className="mx-auto mb-4 text-white/70" />
                  <p className="text-white/70 mb-2">Click to select audio files</p>
                  <p className="text-sm text-white/50">MP3, WAV, M4A supported</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".mp3,audio/mpeg"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button onClick={() => setShowUpload(false)} className="mt-4 w-full glass-button py-2 text-white">
                  Cancel
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hidden Audio Element */}
        <audio
          ref={audioRef}
          src={currentTrack?.url}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          preload="metadata"
        />
      </div>
    </div>
  );
};

export default App;
