import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Info, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface MovieData {
  id?: number;
  title: string;
  description: string;
  rating: number;
  poster: string;
  backdrop: string;
}

interface HeroProps {
  movies: MovieData[];
  category?: 'movies' | 'series' | 'anime';
  error?: string;
  autoPlay?: boolean;
  autoPlayInterval?: number;
}

export function Hero({ movies, category = 'movies', error, autoPlay = true, autoPlayInterval = 4000 }: HeroProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(autoPlay);

  const currentMovie = movies[currentIndex] || movies[0]; // Fallback to first movie

  // Determine the correct route path based on category
  const getRoutePath = () => {
    switch (category) {
      case 'movies':
        return 'movies';
      case 'series':
        return 'series';
      case 'anime':
        return 'anime';
      default:
        return 'movies';
    }
  };

  const routePath = getRoutePath();

  // Auto-advance functionality
  useEffect(() => {
    if (!isAutoPlaying || movies.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % movies.length);
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [isAutoPlaying, movies.length, autoPlayInterval]);

  // Pause auto-play on hover
  const handleMouseEnter = () => setIsAutoPlaying(false);
  const handleMouseLeave = () => setIsAutoPlaying(true);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % movies.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + movies.length) % movies.length);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  // Handle drag end
  const handleDragEnd = (event: any, info: any) => {
    const dragThreshold = 50;

    if (info.offset.x > dragThreshold) {
      prevSlide(); // Dragged right, go to previous
    } else if (info.offset.x < -dragThreshold) {
      nextSlide(); // Dragged left, go to next
    }
  };

  // Handle empty movies array or error - show placeholder
  const hasMovies = movies && movies.length > 0;
  const showPlaceholder = !hasMovies || error;

  if (showPlaceholder) {
    return (
      <motion.div
        className="relative w-full h-[85vh] min-h-[600px] overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Background Pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='36' cy='36' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        {/* Content */}
        <div className="relative z-10 h-full max-w-7xl mx-auto px-4 md:px-8 flex items-center">
          <motion.div
            className="max-w-3xl pt-20 text-center w-full"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            {/* Placeholder Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-gradient-to-r from-gray-500/20 to-gray-600/20 border border-gray-500/30 backdrop-blur-sm">
              <Star className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-300">
                {error ? 'Service Temporarily Unavailable' : `Discover ${category.charAt(0).toUpperCase() + category.slice(1)}`}
              </span>
            </div>

            {/* Placeholder Title */}
            <h1 className="text-5xl md:text-7xl mb-6 bg-gradient-to-r from-gray-300 via-white to-gray-300 bg-clip-text text-transparent">
              {error ? 'Content Loading...' : 'Coming Soon'}
            </h1>

            {/* Placeholder Description */}
            <p className="text-lg text-gray-400/80 mb-8 leading-relaxed max-w-2xl mx-auto">
              {error
                ? `${error} The service is currently rate limited. Please try again later or browse other categories.`
                : `Explore amazing ${category} from our collection. Switch categories to discover available content.`
              }
            </p>

            {/* Placeholder CTA Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="group relative px-8 py-4 rounded-xl bg-gradient-to-r from-gray-600 to-gray-700 overflow-hidden hover:from-gray-500 hover:to-gray-600 transition-all duration-300"
              style={{ boxShadow: '0 0 20px rgba(107, 114, 128, 0.3)' }}
            >
              <div className="relative flex items-center gap-2 text-white">
                <Info className="w-5 h-5" />
                <span>{error ? 'Try Again Later' : 'Browse Other Categories'}</span>
              </div>
            </motion.button>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="relative w-full h-[85vh] min-h-[600px] overflow-hidden"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      drag={movies.length > 1 ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
      onDragEnd={handleDragEnd}
    >
      {/* Background Image with Gradient Overlay */}
      <div
        key={currentMovie.backdrop}
        className="absolute inset-0"
      >
        <Image
          src={currentMovie.backdrop}
          alt={currentMovie.title}
          fill
          className="object-cover"
          priority
        />
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to right, rgba(5, 5, 16, 0.95) 0%, rgba(5, 5, 16, 0.7) 50%, rgba(5, 5, 16, 0.95) 100%), linear-gradient(to top, rgba(5, 5, 16, 1) 0%, rgba(5, 5, 16, 0) 50%)'
          }}
        />
        {/* Neon Glow Effect */}
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background: 'radial-gradient(ellipse at 50% 50%, rgba(6, 182, 212, 0.15), transparent 60%)',
          }}
        />
      </div>

      {/* Navigation Buttons */}
      {movies.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              prevSlide();
            }}
            className="absolute left-8 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-black/40 backdrop-blur-sm border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 transition-all duration-300 opacity-0 hover:opacity-100"
            aria-label="Previous movie"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              nextSlide();
            }}
            className="absolute right-8 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-black/40 backdrop-blur-sm border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 transition-all duration-300 opacity-0 hover:opacity-100"
            aria-label="Next movie"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Content */}
      <div className="relative z-10 h-full max-w-7xl mx-auto px-4 md:px-8 flex items-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={`content-${currentIndex}`}
            className="max-w-3xl pt-20"
            initial={{ x: 50 }}
            animate={{ x: 0 }}
            exit={{ x: -50 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
          >
            {/* Featured Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-gradient-to-r from-cyan-500/20 to-violet-500/20 border border-cyan-500/30 backdrop-blur-sm">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <span className="text-sm text-cyan-100">Featured Today</span>
            </div>

            {/* Title - Clickable */}
            <h1
              className="text-5xl md:text-7xl mb-6 bg-gradient-to-r from-cyan-200 via-white to-violet-200 bg-clip-text text-transparent cursor-pointer hover:from-cyan-300 hover:via-cyan-100 hover:to-violet-300 transition-all duration-300 line-clamp-2"
              onClick={() => window.location.href = `/${routePath}/${currentMovie.id || 1}`}
            >
              {currentMovie.title}
            </h1>

            {/* Rating */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-black/40 backdrop-blur-sm border border-cyan-500/20">
                <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                <span className="text-cyan-100">{currentMovie.rating.toFixed(1)}</span>
              </div>
              <div className="px-4 py-2 rounded-lg bg-black/40 backdrop-blur-sm border border-violet-500/20">
                <span className="text-violet-200">2024</span>
              </div>
              <div className="px-4 py-2 rounded-lg bg-black/40 backdrop-blur-sm border border-cyan-500/20">
                <span className="text-cyan-200">Action • Sci-Fi</span>
              </div>
            </div>

            {/* Description - Clickable */}
            <p
              className="text-lg text-cyan-100/80 mb-8 leading-relaxed max-w-2xl cursor-pointer hover:text-cyan-100 transition-colors duration-300 line-clamp-3"
              onClick={() => window.location.href = `/${routePath}/${currentMovie.id || 1}`}
            >
              {currentMovie.description}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="group relative px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 overflow-hidden"
                style={{ boxShadow: '0 0 40px rgba(6, 182, 212, 0.5)' }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-violet-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative flex items-center gap-2 text-white">
                  <Play className="w-5 h-5 fill-white" />
                  <span>Watch</span>
                </div>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = `/${routePath}/${currentMovie.id || 1}`;
                }}
                className="group px-8 py-4 rounded-xl bg-black/40 backdrop-blur-sm border border-cyan-500/30 hover:border-cyan-400/60 transition-all"
                style={{ boxShadow: '0 0 20px rgba(6, 182, 212, 0.2)' }}
              >
                <div className="flex items-center gap-2 text-cyan-100 group-hover:text-cyan-300 transition-colors">
                  <Info className="w-5 h-5" />
                  <span>Watch Trailer</span>
                </div>
              </motion.button>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Poster with Glow */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`poster-${currentIndex}`}
            className="hidden lg:block absolute right-8 top-1/2 -translate-y-1/2"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.7 }}
          >
            <div className="relative">
              <div
                className="absolute inset-0 blur-3xl bg-gradient-to-br from-cyan-400/30 to-violet-400/30 transform scale-105"
              />
              <Image
                src={currentMovie.poster}
                alt={currentMovie.title}
                width={320}
                height={480}
                className="relative w-80 h-[480px] object-cover rounded-2xl border-2 border-cyan-500/30"
                style={{ boxShadow: '0 0 60px rgba(6, 182, 212, 0.4)' }}
              />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dot Indicators */}
      {movies.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex space-x-3 z-20">
          {movies.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                goToSlide(index);
              }}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? 'bg-cyan-400 shadow-lg shadow-cyan-400/50'
                  : 'bg-cyan-600/50 hover:bg-cyan-500/75'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Bottom Fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32 z-20"
        style={{
          background: 'linear-gradient(to top, rgba(5, 5, 16, 1), transparent)'
        }}
      />
    </motion.div>
  );
}
