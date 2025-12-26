import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, Volume2, VolumeX, Maximize, Settings, ChevronLeft, ChevronRight, SkipForward, SkipBack, Star, Plus, Share2, Eye, EyeOff, RotateCcw, RotateCw, Zap, Search, X } from 'lucide-react';

interface VideoPlayerProps {
   src: string;
   poster: string;
   contentId: number;
   contentType: 'movie' | 'series';
   selectedSeason?: number;
   selectedEpisode?: number;
   initialTime?: number;
   onTimeUpdate?: (time: number) => void;
   onEnded?: () => void;
}

export function VideoPlayer({ src, poster, contentId, contentType, selectedSeason, selectedEpisode, initialTime, onTimeUpdate, onEnded }: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const videoRef = useRef<HTMLVideoElement>(null);

  const volumeKey = 'videoVolume';

  // Load volume on mount
  useEffect(() => {
    const savedVolume = localStorage.getItem(volumeKey);
    if (savedVolume) {
      const vol = parseFloat(savedVolume);
      setVolume(vol);
      setIsMuted(vol === 0);
      if (videoRef.current) {
        videoRef.current.volume = vol;
        videoRef.current.muted = vol === 0;
      }
    } else {
      // Default volume 1, not muted
      setVolume(1);
      setIsMuted(false);
      if (videoRef.current) {
        videoRef.current.volume = 1;
        videoRef.current.muted = false;
      }
    }
  }, [volumeKey]);

  // Video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (onTimeUpdate) onTimeUpdate(video.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      if (initialTime !== undefined) {
        video.currentTime = initialTime;
        setCurrentTime(initialTime);
      }
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handleVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted);
    };

    const handleEnded = () => {
      if (onEnded) onEnded();
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('pause', handlePause);
    video.addEventListener('play', handlePlay);
    video.addEventListener('volumechange', handleVolumeChange);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('volumechange', handleVolumeChange);
      video.removeEventListener('ended', handleEnded);
    };
  }, [initialTime, onTimeUpdate, onEnded]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    localStorage.setItem(volumeKey, newVolume.toString());
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      videoRef.current.muted = newVolume === 0;
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const newMuted = !isMuted;
      videoRef.current.muted = newMuted;
      setIsMuted(newMuted);
      if (newMuted) {
        localStorage.setItem(volumeKey, '0');
      } else {
        localStorage.setItem(volumeKey, volume.toString());
      }
    }
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoRef.current.requestFullscreen();
      }
    }
  };

  return (
    <div className="relative group/glow">
      {/* Glow Effect */}
      <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/30 to-violet-600/30 rounded-2xl blur-2xl opacity-60 group-hover/glow:opacity-100 transition duration-1000" />
      <div className="absolute -inset-8 bg-gradient-to-r from-cyan-500/20 to-violet-600/20 rounded-3xl blur-3xl opacity-40 group-hover/glow:opacity-100 transition duration-1000" />

      <div
        className="relative w-full aspect-video max-h-[60vh] sm:max-h-[70vh] md:max-h-none bg-black group rounded-xl overflow-hidden shadow-2xl border border-white/5"
        style={{ boxShadow: '0 0 40px rgba(6, 182, 212, 0.3), 0 0 80px rgba(139, 92, 246, 0.2)' }}
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
      >
        {/* Video Element */}
        <video
          ref={videoRef}
          className="w-full h-full"
          src={src}
          onClick={togglePlay}
        />

        {/* Play Overlay */}
        {!isPlaying && (
          <div className="absolute inset-0">
            <img
              src={poster}
              alt="Poster"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={togglePlay}
                className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center"
                style={{ boxShadow: '0 0 60px rgba(6, 182, 212, 0.8)' }}
              >
                <Play className="w-10 h-10 text-white ml-1" fill="white" />
              </motion.button>
            </div>
          </div>
        )}

        {/* Controls Overlay */}
        <AnimatePresence>
          {showControls && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"
              style={{ pointerEvents: 'none' }}
            >
              {/* Bottom Controls */}
              <div className="absolute bottom-0 left-0 right-0 p-6" style={{ pointerEvents: 'auto' }}>
                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden cursor-pointer" onClick={handleProgressClick}>
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-violet-500 rounded-full transition-all"
                      style={{ width: `${(currentTime / duration) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Control Buttons */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Play/Pause */}
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={togglePlay}
                      className="text-white"
                    >
                      {isPlaying ? (
                        <Pause className="w-8 h-8" fill="white" />
                      ) : (
                        <Play className="w-8 h-8" fill="white" />
                      )}
                    </motion.button>

                    {/* Volume */}
                    <div className="flex items-center gap-2">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={toggleMute}
                        className="text-white"
                      >
                        {isMuted ? (
                          <VolumeX className="w-6 h-6" />
                        ) : (
                          <Volume2 className="w-6 h-6" />
                        )}
                      </motion.button>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={volume}
                        onChange={handleVolumeChange}
                        className="w-20 h-1 bg-white/20 rounded-full appearance-none cursor-pointer slider"
                      />
                    </div>

                    {/* Time */}
                    <span className="text-white text-sm">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Settings */}
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="text-white"
                    >
                      <Settings className="w-6 h-6" />
                    </motion.button>

                    {/* Fullscreen */}
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={toggleFullscreen}
                      className="text-white"
                    >
                      <Maximize className="w-6 h-6" />
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
