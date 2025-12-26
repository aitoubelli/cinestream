import { motion } from 'motion/react';
import { Play, Star } from 'lucide-react';
import { HeartIcon as HeartIconOutline } from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import useSWR from 'swr';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

interface MovieCardProps {
  movie: {
    id: number;
    title: string;
    poster: string;
    rating: number;
    year: string;
    genres: string[];
    progress?: number; // For continue watching (0-100)
    contentType?: string; // For continue watching ('movie', 'tv', 'anime')
    formattedProgress?: string;
    seasonEpisodeLabel?: string;
    episodeName?: string;
  };
  index: number;
  category?: 'movies' | 'series' | 'anime';
  enableWatchlistToggle?: boolean;
  showProgress?: boolean;
  linkToWatchPage?: boolean;
}

export function MovieCard({ movie, index, category = 'movies', enableWatchlistToggle = false, showProgress = false, linkToWatchPage = false }: MovieCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { user } = useAuth();

  // Determine the correct route based on contentType or fallback to category
  const getRoutePath = () => {
    if (movie.contentType) {
      switch (movie.contentType) {
        case 'movie':
          return 'movies';
        case 'tv':
        case 'series':
          return 'series';
        case 'anime':
          return 'anime';
        default:
          return category;
      }
    }
    return category;
  };

  const routePath = getRoutePath();
  const finalLink = linkToWatchPage
    ? `/watch/${movie.id}?type=${movie.contentType === 'movie' ? 'movie' : 'series'}`
    : `/${routePath}/${movie.id}`;

  const { getIdToken } = useAuth();

  // Fetch watchlist if user is authenticated and watchlist toggle is enabled
  const authenticatedFetcher = async (url: string, getIdToken: () => Promise<string | null>) => {
    const token = await getIdToken();
    const response = await fetch(url, {
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    });
    if (!response.ok) throw new Error('Failed to fetch watchlist');
    return response.json();
  };

  const { data: watchlistData, mutate: mutateWatchlist } = useSWR(
    user && enableWatchlistToggle ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/watchlist` : null,
    (url: string) => authenticatedFetcher(url, getIdToken)
  );

  const isInWatchlist = watchlistData?.watchlist?.some((item: any) => item.contentId === movie.id && item.contentType === (category === 'movies' ? 'movie' : 'tv')) ?? false;

  const toggleWatchlist = async () => {
    if (!user) {
      toast.error('Please sign in to manage your watchlist');
      return;
    }

    const previousWatchlist = watchlistData;
    const newIsInWatchlist = !isInWatchlist;
    const contentType = category === 'movies' ? 'movie' : 'tv';

    // Optimistic update
    mutateWatchlist(
      {
        watchlist: newIsInWatchlist
          ? [...(watchlistData?.watchlist || []), { contentId: movie.id, contentType }]
          : (watchlistData?.watchlist || []).filter((item: any) => !(item.contentId === movie.id && item.contentType === contentType))
      },
      false
    );

    try {
      const token = await getIdToken();
      const response = await fetch(
        newIsInWatchlist ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/watchlist` : `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/watchlist/${movie.id}`,
        {
          method: newIsInWatchlist ? 'POST' : 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
          },
          body: newIsInWatchlist ? JSON.stringify({ contentId: movie.id, contentType }) : undefined,
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update watchlist');
      }

      toast.success(
        newIsInWatchlist
          ? 'Added to watchlist'
          : 'Removed from watchlist'
      );
    } catch (error) {
      // Revert optimistic update on error
      mutateWatchlist(previousWatchlist, false);
      toast.error('Failed to update watchlist. Please try again.');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
      whileHover={{ scale: 1.05, zIndex: 10 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="relative group cursor-pointer"
    >
      <Link href={finalLink}>
        <div className="relative overflow-hidden rounded-xl aspect-[2/3]">
          {/* Poster Image */}
          <Image
            src={movie.poster || '/fallback-poster.svg'}
            alt={movie.title}
            fill
            className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110"
            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
          />

          {/* Gradient Overlay */}
          <div
            className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300"
          />

          {/* Progress Bar (for Continue Watching) */}
          {showProgress && movie.progress !== undefined && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-violet-500"
                style={{ width: `${movie.progress}%` }}
              />
            </div>
          )}

          {/* Glow Effect on Hover */}
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
            style={{
              boxShadow: 'inset 0 0 80px rgba(6, 182, 212, 0.4)',
              border: '2px solid rgba(6, 182, 212, 0.5)',
              borderRadius: '0.75rem'
            }}
          />

          {/* Outer Glow */}
          <div
            className="absolute -inset-2 bg-gradient-to-br from-cyan-500/0 to-violet-500/0 group-hover:from-cyan-500/30 group-hover:to-violet-500/30 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"
          />

          {/* Watchlist Button */}
          {user && enableWatchlistToggle && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleWatchlist();
              }}
              className="absolute top-3 left-3 p-2 rounded-lg bg-black/60 backdrop-blur-sm border border-white/20 hover:bg-black/80 transition-colors"
            >
              {isInWatchlist ? (
                <HeartIconSolid className="w-5 h-5 text-red-500" />
              ) : (
                <HeartIconOutline className="w-5 h-5 text-white" />
              )}
            </button>
          )}

          {/* Rating Badge */}
          <div className="absolute top-3 right-3 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm border border-yellow-500/30">
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            <span className="text-sm text-yellow-100">{movie.rating.toFixed(1)}</span>
          </div>

          {/* Content Overlay */}
          <motion.div
            initial={false}
            animate={{ opacity: isHovered ? 1 : 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 flex flex-col justify-end p-4"
          >
            {/* Play Button - Centered when hovered */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: isHovered ? 1 : 0, opacity: isHovered ? 1 : 0 }}
              transition={{ duration: 0.3, type: 'spring', stiffness: 200 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            >
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                <Play className="w-6 h-6 text-white fill-white ml-1" />
              </div>
            </motion.div>

            {/* Movie Info */}
            <div className="space-y-1 relative z-20">
              <h3 className="text-white line-clamp-1 font-semibold text-sm md:text-base leading-tight drop-shadow-md">
                {movie.title}
              </h3>

              {showProgress ? (
                <>
                  {/* Render logic for Continue Watching / History */}
                  {movie.contentType === 'movie' ? (
                    /* Movie: Show Progress Time */
                    <div className="text-cyan-300 text-xs font-medium">
                      {movie.formattedProgress || 'Resume'}
                    </div>
                  ) : (
                    /* Series: Show SxxExx + Time + Episode Name */
                    <>
                      <div className="flex items-center gap-2 text-cyan-300 text-xs font-medium">
                        <span>{movie.seasonEpisodeLabel}</span>
                        {movie.formattedProgress && (
                          <>
                            <span className="text-cyan-200/40">•</span>
                            <span>{movie.formattedProgress}</span>
                          </>
                        )}
                      </div>
                      {movie.episodeName && (
                        <div className="text-cyan-100/80 text-xs line-clamp-1 font-light">
                          {movie.episodeName}
                        </div>
                      )}
                    </>
                  )}
                </>
              ) : null}

              <div className="flex items-center gap-2 text-xs text-cyan-200/60 pt-1">
                <span>{movie.year}</span>
                <span>•</span>
                <span className="line-clamp-1">{movie.genres.join(', ')}</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Glassmorphism Border Effect */}
        <div
          className="absolute inset-0 rounded-xl border border-cyan-500/0 group-hover:border-cyan-500/40 transition-all duration-500 pointer-events-none"
        />
      </Link>
    </motion.div>
  );
}
