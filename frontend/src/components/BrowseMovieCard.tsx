import { motion } from 'motion/react';
import { Star, Play } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Movie {
  id: string | number;
  title: string;
  poster: string;
  rating: number;
  year: string;
  genres: string[];
  progress?: number;
  type?: string;
}

interface MovieCardProps {
  movie: Movie;
  index: number;
  showProgress?: boolean;
}

export function MovieCard({ movie, index, showProgress = false }: MovieCardProps) {
  const router = useRouter();

  const handleCardClick = () => {
    // Navigate to the appropriate detail page based on content type
    const baseRoute =
      movie.type === 'anime' ? '/anime' :
      movie.type === 'tv' || movie.type === 'series' ? '/series' :
      '/movies';

    router.push(`${baseRoute}/${movie.id}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 0 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      whileHover={{ scale: 1.05, zIndex: 10 }}
      className="relative group cursor-pointer"
      onClick={handleCardClick}
    >
      {/* Card Container */}
      <div className="relative rounded-xl overflow-hidden aspect-[2/3]">
        {/* Glow Effect */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-2xl bg-gradient-to-br from-cyan-400/30 to-violet-400/30 -z-10"
        />

        {/* Poster Image */}
        <img
          src={movie.poster || '/fallback-poster.svg'}
          alt={movie.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (target.src !== '/fallback-poster.svg') {
              target.src = '/fallback-poster.svg';
            }
          }}
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />

        {/* Progress Bar (for Continue Watching) */}
        {showProgress && movie.progress !== undefined && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-violet-500"
              style={{ width: `${movie.progress}%` }}
            />
          </div>
        )}

        {/* Hover Overlay */}
        <div className="absolute inset-0 flex flex-col justify-end p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          {/* Play Button */}
          <div className="flex items-center justify-center mb-4">
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center"
              style={{ boxShadow: '0 0 30px rgba(6, 182, 212, 0.6)' }}
            >
              <Play className="w-5 h-5 text-white fill-white ml-0.5" />
            </motion.div>
          </div>

          {/* Info */}
          <div>
            <h3 className="text-white mb-2 line-clamp-2">{movie.title}</h3>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                <span className="text-yellow-100 text-sm">{movie.rating.toFixed(1)}</span>
              </div>
              <span className="text-cyan-100/60 text-sm">•</span>
              <span className="text-cyan-100/80 text-sm">{movie.year}</span>
            </div>
            {showProgress && movie.progress !== undefined && (
              <p className="text-cyan-100/80 text-xs">{movie.progress}% watched</p>
            )}
          </div>
        </div>

        {/* Rating Badge */}
        <div className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-black/80 backdrop-blur-sm border border-yellow-500/30">
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
            <span className="text-yellow-100 text-xs">{movie.rating.toFixed(1)}</span>
          </div>
        </div>
      </div>

      {/* Title (visible without hover on mobile) */}
      <div className="md:hidden mt-2">
        <h3 className="text-cyan-100 text-sm line-clamp-2">{movie.title}</h3>
        <p className="text-cyan-100/60 text-xs">{movie.year}</p>
      </div>
    </motion.div>
  );
}
