import { MovieCard } from './MovieCard';
import { motion } from 'motion/react';

interface Movie {
  id: number;
  title: string;
  poster: string;
  rating: number;
  year: string;
  genres: string[];
  progress?: number;
  contentType?: string; // For continue watching ('movie', 'tv', 'anime')
}

interface MovieGridProps {
  title: string;
  movies: Movie[];
  category?: 'movies' | 'series' | 'anime';
  enableWatchlistToggle?: boolean;
  showProgress?: boolean;
}

export function MovieGrid({ title, movies, category = 'movies', enableWatchlistToggle = false, showProgress = false }: MovieGridProps) {
  return (
    <section className="py-16 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <h2 className="text-3xl md:text-4xl bg-gradient-to-r from-cyan-300 to-violet-300 bg-clip-text text-transparent inline-block relative">
            {title}
            <div
              className="absolute -bottom-2 left-0 h-1 w-20 bg-gradient-to-r from-cyan-400 to-violet-400 rounded-full"
              style={{ boxShadow: '0 0 20px rgba(6, 182, 212, 0.6)' }}
            />
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
          {movies.map((movie, index) => (
            <MovieCard key={`${movie.id}-${category}-${index}`} movie={movie} index={index} category={category} enableWatchlistToggle={enableWatchlistToggle} showProgress={showProgress} />
          ))}
        </div>
      </div>
    </section>
  );
}
