"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MovieCard } from '@/components/MovieCard';

interface FeaturedMovie {
  id: number;
  title: string;
  poster: string;
  rating: number;
  year: string;
  genres: string[];
}

interface FeaturedCarouselProps {
  movies: FeaturedMovie[];
  category?: 'movies' | 'series' | 'anime';
  autoPlay?: boolean;
  autoPlayInterval?: number;
}

export function FeaturedCarousel({
  movies,
  category,
  autoPlay = true,
  autoPlayInterval = 5000
}: FeaturedCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(autoPlay);

  // Auto-advance functionality
  useEffect(() => {
    if (!isAutoPlaying || movies.length === 0) return;

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

  if (movies.length === 0) return null;

  // Determine how many movies to show based on screen size
  const getVisibleMovies = () => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768 ? 1 : window.innerWidth < 1024 ? 3 : 5;
    }
    return 3; // Default for SSR
  };

  const visibleMovies = getVisibleMovies();
  const startIndex = Math.max(0, Math.min(currentIndex, movies.length - visibleMovies));
  const displayedMovies = movies.slice(startIndex, startIndex + visibleMovies);

  return (
    <div
      className="relative w-full overflow-hidden"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Navigation Buttons */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/60 backdrop-blur-md border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 transition-all duration-200 hidden md:flex items-center justify-center"
        aria-label="Previous movies"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/60 backdrop-blur-md border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 transition-all duration-200 hidden md:flex items-center justify-center"
        aria-label="Next movies"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Carousel Content */}
      <motion.div
        className="flex gap-4 md:gap-6 transition-all duration-500 ease-out"
        animate={{ x: -(startIndex * (100 / visibleMovies)) + '%' }}
      >
        <AnimatePresence mode="wait">
          {displayedMovies.map((movie, index) => (
            <motion.div
              key={`${movie.id}-${startIndex + index}`}
              className={`flex-shrink-0 ${
                visibleMovies === 1 ? 'w-full' :
                visibleMovies === 3 ? 'w-1/3' :
                visibleMovies === 5 ? 'w-[20%]' : 'w-1/3'
              }`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
            >
              <MovieCard
                movie={movie}
                index={startIndex + index}
                category={category}
                enableWatchlistToggle={true}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Dots Indicator - Mobile */}
      <div className="flex justify-center space-x-2 mt-6 md:hidden">
        {Array.from({ length: Math.ceil(movies.length / visibleMovies) }, (_, i) => (
          <button
            key={i}
            onClick={() => goToSlide(i * visibleMovies)}
            className={`w-2 h-2 rounded-full transition-all duration-200 ${
              i * visibleMovies === startIndex
                ? 'bg-cyan-400 shadow-lg shadow-cyan-400/50'
                : 'bg-cyan-600/50 hover:bg-cyan-500/75'
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
