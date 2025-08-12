import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX, 
  Upload,
  Music,
  Shuffle,
  Repeat,
  Heart,
  MoreHorizontal
} from 'lucide-react';
import { useAudioContext } from '../hooks/useAudioContext';

const AudioPlayer = ({ onVisualizerData }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [playlist, setPlaylist] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState('none'); // none, one, all
  const [isLiked, setIsLiked] = useState(false);

  const audioRef = useRef(null);
  const fileInputRef = useRef(null);
  const progressRef = useRef(null);
  const volumeRef = useRef(null);
  
  const { analyserNode, connectAudio } = useAudioContext();

  // Initialize audio element
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
      if (repeatMode === 'one') {
        audio.currentTime = 0;
        audio.play();
      } else if (repeatMode === 'all' || currentTrack < playlist.length - 1) {
        handleNext();
      } else {
        setIsPlaying(false);
      }
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentTrack, playlist.length, repeatMode, isDragging]);

  // Connect audio to Web Audio API for visualization
  useEffect(() => {
    if (audioRef.current && analyserNode) {
      connectAudio(audioRef.current);
    }
  }, [analyserNode, connectAudio]);

  // Update volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    const audioFiles = files.filter(file => file.type.startsWith('audio/'));
    
    const newTracks = audioFiles.map((file, index) => ({
      id: Date.now() + index,
      name: file.name.replace(/\.[^/.]+$/, ""),
      artist: 'Unknown Artist',
      url: URL.createObjectURL(file),
      duration: 0,
      file: file
    }));

    setPlaylist(prev => [...prev, ...newTracks]);
    
    if (playlist.length === 0 && newTracks.length > 0) {
      setCurrentTrack(0);
      loadTrack(0, newTracks);
    }
  };

  const loadTrack = (index, trackList = playlist) => {
    if (trackList[index]) {
      const audio = audioRef.current;
      audio.src = trackList[index].url;
      audio.load();
      setCurrentTrack(index);
    }
  };

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio.src) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(console.error);
    }
    setIsPlaying(!isPlaying);
  };

  const handleNext = () => {
    let nextIndex;
    if (isShuffled) {
      nextIndex = Math.floor(Math.random() * playlist.length);
    } else {
      nextIndex = (currentTrack + 1) % playlist.length;
    }
    loadTrack(nextIndex);
    if (isPlaying) {
      setTimeout(() => audioRef.current?.play(), 100);
    }
  };

  const handlePrevious = () => {
    const prevIndex = currentTrack === 0 ? playlist.length - 1 : currentTrack - 1;
    loadTrack(prevIndex);
    if (isPlaying) {
      setTimeout(() => audioRef.current?.play(), 100);
    }
  };

  const handleProgressClick = (event) => {
    const rect = progressRef.current.getBoundingClientRect();
    const percent = (event.clientX - rect.left) / rect.width;
    const newTime = percent * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (event) => {
    const rect = volumeRef.current.getBoundingClientRect();
    const percent = (event.clientX - rect.left) / rect.width;
    const newVolume = Math.max(0, Math.min(1, percent));
    setVolume(newVolume);
    setIsMuted(false);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const toggleShuffle = () => {
    setIsShuffled(!isShuffled);
  };

  const toggleRepeat = () => {
    const modes = ['none', 'all', 'one'];
    const currentIndex = modes.indexOf(repeatMode);
    setRepeatMode(modes[(currentIndex + 1) % modes.length]);
  };

  const formatTime = (time) => {
    if (!time || isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const currentTrackData = playlist[currentTrack];

  return (
    <div className="glassmorphism rounded-3xl p-8 max-w-md mx-auto">
      <audio ref={audioRef} />
      
      {/* Upload Button */}
      <div className="mb-8">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="audio/*"
          onChange={handleFileUpload}
          className="hidden"
        />
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => fileInputRef.current?.click()}
          className="w-full glassmorphism-light rounded-2xl p-4 flex items-center justify-center gap-3 text-white/80 hover:text-white transition-colors"
        >
          <Upload size={20} />
          <span>Upload Music</span>
        </motion.button>
      </div>

      {/* Album Art & Track Info */}
      <div className="text-center mb-8">
        <div className="w-48 h-48 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center overflow-hidden">
          {currentTrackData ? (
            <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Music size={64} className="text-white/60" />
            </div>
          ) : (
            <Music size={64} className="text-white/30" />
          )}
        </div>
        
        <AnimatePresence mode="wait">
          {currentTrackData && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-2"
            >
              <h3 className="text-xl font-bold text-white truncate">
                {currentTrackData.name}
              </h3>
              <p className="text-white/60">
                {currentTrackData.artist}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div
          ref={progressRef}
          onClick={handleProgressClick}
          className="w-full h-2 bg-white/10 rounded-full cursor-pointer mb-2"
        >
          <div
            className="h-full bg-gradient-to-r from-blue-400 to-purple-500 rounded-full transition-all duration-300"
            style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
          />
        </div>
        <div className="flex justify-between text-sm text-white/60">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Main Controls */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={toggleShuffle}
          className={`p-2 rounded-full transition-colors ${
            isShuffled ? 'text-blue-400' : 'text-white/60 hover:text-white'
          }`}
        >
          <Shuffle size={20} />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handlePrevious}
          disabled={playlist.length === 0}
          className="p-3 rounded-full text-white/80 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <SkipBack size={24} />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={togglePlayPause}
          disabled={playlist.length === 0}
          className="p-4 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPlaying ? <Pause size={28} /> : <Play size={28} />}
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleNext}
          disabled={playlist.length === 0}
          className="p-3 rounded-full text-white/80 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <SkipForward size={24} />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={toggleRepeat}
          className={`p-2 rounded-full transition-colors ${
            repeatMode !== 'none' ? 'text-blue-400' : 'text-white/60 hover:text-white'
          }`}
        >
          <Repeat size={20} />
          {repeatMode === 'one' && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-400 rounded-full text-xs flex items-center justify-center">
              1
            </span>
          )}
        </motion.button>
      </div>

      {/* Secondary Controls */}
      <div className="flex items-center justify-between">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsLiked(!isLiked)}
          className={`p-2 rounded-full transition-colors ${
            isLiked ? 'text-red-400' : 'text-white/60 hover:text-white'
          }`}
        >
          <Heart size={20} fill={isLiked ? 'currentColor' : 'none'} />
        </motion.button>

        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleMute}
            className="p-2 rounded-full text-white/60 hover:text-white"
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </motion.button>
          
          <div
            ref={volumeRef}
            onClick={handleVolumeChange}
            className="w-20 h-1 bg-white/20 rounded-full cursor-pointer"
          >
            <div
              className="h-full bg-white rounded-full transition-all duration-200"
              style={{ width: `${isMuted ? 0 : volume * 100}%` }}
            />
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="p-2 rounded-full text-white/60 hover:text-white"
        >
          <MoreHorizontal size={20} />
        </motion.button>
      </div>

      {/* Playlist */}
      {playlist.length > 0 && (
        <div className="mt-6 max-h-32 overflow-y-auto">
          <h4 className="text-sm font-semibold text-white/80 mb-2">Playlist</h4>
          <div className="space-y-1">
            {playlist.map((track, index) => (
              <motion.div
                key={track.id}
                whileHover={{ scale: 1.02 }}
                onClick={() => {
                  loadTrack(index);
                  if (isPlaying) {
                    setTimeout(() => audioRef.current?.play(), 100);
                  }
                }}
                className={`p-2 rounded-lg cursor-pointer transition-colors text-sm ${
                  index === currentTrack
                    ? 'bg-white/20 text-white'
                    : 'text-white/60 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="truncate font-medium">{track.name}</div>
                <div className="truncate text-xs opacity-60">{track.artist}</div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AudioPlayer;