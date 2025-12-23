"use client";

import useSWR from "swr";
import { motion } from "framer-motion";
import { StarfieldBackground } from "@/components/StarfieldBackground";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { MovieGrid } from "@/components/MovieGrid";
import { MovieCard } from "@/components/MovieCard";
import { Footer } from "@/components/Footer";
import { Film, Tv, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getApiUrl } from '@/lib/utils';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Authenticated fetcher for continue watching
const authenticatedFetcher = async (url: string, user: any) => {
  const idToken = await user.getIdToken();
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${idToken}`,
    },
  });
  if (!response.ok) throw new Error('Failed to fetch continue watching');
  return response.json();
};

// Create a fallback backdrop generator
const generateFallbackBackdrop = () => {
  const svg = encodeURIComponent(`
    <svg width="1920" height="1080" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="backdropGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#1F2937"/>
          <stop offset="100%" style="stop-color:#111827"/>
        </linearGradient>
      </defs>
      <rect width="1920" height="1080" fill="url(#backdropGradient)"/>
      <text x="960" y="540" text-anchor="middle" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="48" font-weight="bold">No Image Available</text>
    </svg>
  `);
  return `data:image/svg+xml,${svg}`;
};

interface ContentItem {
  id: number;
  title: string;
  name?: string; // For series/anime
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  genre_ids: number[];
  progress?: number; // For continue watching
  contentType?: string; // For continue watching
}

export default function Home() {
  // Initialize activeCategory from localStorage or default to 'movies'
  const [activeCategory, setActiveCategory] = useState<'movies' | 'series'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('activeCategory');
      return (saved === 'movies' || saved === 'series') ? saved : 'movies';
    }
    return 'movies';
  });
  const { user } = useAuth();

  const handleCategoryChange = (category: 'movies' | 'series') => {
    setActiveCategory(category);
    localStorage.setItem('activeCategory', category);
  };

  const { data: trendingData, error: trendingError, isLoading: trendingLoading } = useSWR(
    activeCategory === 'movies' ? getApiUrl("/api/content/movies/trending") :
    getApiUrl("/api/content/series/trending"),
    fetcher,
  );

  const { data: popularData, error: popularError, isLoading: popularLoading } = useSWR(
    activeCategory === 'movies' ? getApiUrl("/api/content/movies/popular") :
    getApiUrl("/api/content/series/popular"),
    fetcher,
  );

  // Fetch popular movies for the current category (replaces static featured movies)
  const { data: featuredMoviesData, error: featuredMoviesError, isLoading: featuredMoviesLoading } = useSWR(
    getApiUrl(`/api/content/featured/popular/${activeCategory}`),
    fetcher,
  );

  // Fetch continue watching data (only if user is authenticated)
  const { data: continueWatchingData, error: continueWatchingError, isLoading: continueWatchingLoading } = useSWR(
    user ? getApiUrl("/api/continue-watching") : null,
    (url: string) => authenticatedFetcher(url, user),
  );

  // Fetch personalized recommendations (only if user is authenticated)
  const { data: recommendationsData, error: recommendationsError, isLoading: recommendationsLoading } = useSWR(
    user ? getApiUrl("/api/recommendations/personalized") : null,
    (url: string) => authenticatedFetcher(url, user),
  );

  // Fetch newest releases
  const { data: newestData, error: newestError, isLoading: newestLoading } = useSWR(
    activeCategory === 'movies' ? getApiUrl("/api/content/movies/now-playing") :
    getApiUrl("/api/content/tv/on-the-air"),
    fetcher,
  );



// Transform content data to match component interface
  const transformContent = (item: ContentItem) => ({
    id: item.id,
    title: item.title || item.name || 'Unknown Title',
    poster: item.poster_path && item.poster_path.startsWith('http')
      ? item.poster_path
      : (item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : '/fallback-poster.svg'),
    rating: item.vote_average,
    year: item.release_date ? new Date(item.release_date).getFullYear().toString() :
          item.first_air_date ? new Date(item.first_air_date).getFullYear().toString() : '2024',
    genres: ['Action', 'Sci-Fi'], // TODO: Map genre_ids to actual genre names
    contentType: activeCategory === 'movies' ? 'movie' : 'tv'
  });

  // Transform continue watching data
  const continueWatchingMovies = continueWatchingData?.data?.results?.slice(0, 6).map((item: ContentItem) => ({
    id: item.id,
    title: item.title || item.name || 'Unknown Title',
    poster: item.poster_path && item.poster_path.startsWith('http')
      ? item.poster_path
      : (item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : '/fallback-poster.svg'),
    rating: item.vote_average,
    year: item.release_date ? new Date(item.release_date).getFullYear().toString() :
          item.first_air_date ? new Date(item.first_air_date).getFullYear().toString() : '2024',
    genres: ['Action', 'Sci-Fi'], // TODO: Map genre_ids to actual genre names
    progress: item.progress,
    contentType: item.contentType, // Preserve content type from backend
  })) || [];





  // Transform newest releases data
  const newestMovies = newestData?.results?.slice(0, 12).map(transformContent) || [];

  const trendingMovies = trendingData?.results?.slice(1, 13).map(transformContent) || [];
  const popularMovies = popularData?.results?.slice(0, 12).map(transformContent) || [];

  // Transform featured movies data for carousel
  const featuredMoviesCarousel = featuredMoviesData?.map((movie: any) => ({
    id: movie.id,
    title: movie.title || 'Unknown Title',
    description: movie.description || 'No description available.',
    rating: movie.rating || 0,
    poster: movie.poster || '/fallback-poster.svg',
    backdrop: movie.backdrop || generateFallbackBackdrop()
  })) || [];

  // Transform personalized recommendations data
  const recommendedMovies = recommendationsData?.data?.results?.slice(0, 12).map((movie: any) => ({
    id: movie.id,
    title: movie.title || movie.name || 'Unknown Title',
    poster: movie.poster_path
      ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
      : '/fallback-poster.svg',
    rating: movie.vote_average || 0,
    year: movie.release_date ? new Date(movie.release_date).getFullYear().toString() :
          movie.first_air_date ? new Date(movie.first_air_date).getFullYear().toString() : '2024',
    genres: movie.genre_ids?.slice(0, 2).map((id: number) => {
      // Simple genre mapping - in production you'd want a proper genre lookup
      const genreMap: { [key: number]: string } = {
        28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
        99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
        27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi',
        10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western'
      };
      return genreMap[id] || 'Action';
    }) || ['Action', 'Sci-Fi'],
    contentType: movie.contentType, // Preserve content type from backend
  })) || [];

  if (trendingLoading || popularLoading || featuredMoviesLoading) {
    return (
      <div className="min-h-screen bg-[#050510] dark overflow-x-hidden flex items-center justify-center">
        <div className="text-cyan-400">Loading...</div>
      </div>
    );
  }

  if (trendingError || popularError) {
    return (
      <div className="min-h-screen bg-[#050510] dark overflow-x-hidden flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Error Loading Content
          </h1>
          <p className="text-gray-600">
            Failed to fetch content. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050510] dark overflow-x-hidden">
      <StarfieldBackground />
      <Navbar />
      <main>
        <Hero
          movies={featuredMoviesCarousel}
          category={activeCategory}
          error={!featuredMoviesLoading && featuredMoviesError ? 'Failed to load featured content' : undefined}
        />

        {/* Mobile Category Switcher - Horizontal with text */}
        <div className="md:hidden px-4 py-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex justify-center"
          >
            <div className="flex items-center gap-2 p-3 rounded-2xl backdrop-blur-md bg-black/40 border border-cyan-500/30 max-w-fit">
              {[
                { id: 'movies' as const, label: 'Movies', icon: Film },
                { id: 'series' as const, label: 'Series', icon: Tv }
              ].map((category) => {
                const Icon = category.icon;
                const isActive = activeCategory === category.id;

                return (
                  <motion.button
                    key={category.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleCategoryChange(category.id)}
                    className="relative px-4 py-2 rounded-xl transition-all flex items-center gap-2"
                  >
                    {isActive && (
                      <motion.div
                        layoutId="mobileActiveCategory"
                        className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500"
                        style={{ boxShadow: '0 0 30px rgba(6, 182, 212, 0.6)' }}
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-cyan-300'} transition-colors relative z-10`} />
                    <span className={`${isActive ? 'text-white' : 'text-cyan-100/80'} transition-colors text-sm font-medium relative z-10`}>
                      {category.label}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* Desktop Category Switcher - Vertical icons only */}
        <div className="fixed left-0 top-1/2 -translate-y-1/2 z-50 p-4 hidden md:block">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-start"
          >
            <div
              className="inline-flex flex-col items-center gap-2 p-2 rounded-2xl backdrop-blur-md bg-black/40 border border-cyan-500/30"
              style={{ boxShadow: '0 0 30px rgba(6, 182, 212, 0.2)' }}
            >
              {[
                { id: 'movies' as const, label: 'Movies', icon: Film },
                { id: 'series' as const, label: 'Series', icon: Tv }
              ].map((category) => {
                const Icon = category.icon;
                const isActive = activeCategory === category.id;

                return (
                  <motion.button
                    key={category.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleCategoryChange(category.id)}
                    className="relative px-6 py-3 rounded-xl transition-all"
                    title={category.label}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="desktopActiveCategory"
                        className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500"
                        style={{ boxShadow: '0 0 30px rgba(6, 182, 212, 0.6)' }}
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    <div className="relative flex items-center gap-2">
                      <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-cyan-300'} transition-colors`} />
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* Continue Watching Section */}
        {user && continueWatchingMovies.length > 0 && (
          <MovieGrid title="Continue Watching" movies={continueWatchingMovies} category="movies" enableWatchlistToggle={true} showProgress={true} />
        )}

        {/* Recommended For You Section */}
        {user && recommendedMovies.length > 0 && (
          <MovieGrid title="Recommended For You" movies={recommendedMovies} category="movies" enableWatchlistToggle={true} />
        )}

        {/* Newest Releases Section */}
        {newestMovies.length > 0 && (
          <MovieGrid title="Newest Releases" movies={newestMovies} category="movies" enableWatchlistToggle={true} />
        )}



        <MovieGrid title="Trending Now" movies={trendingMovies} category={activeCategory} enableWatchlistToggle={true} />
        <MovieGrid title="Popular This Week" movies={popularMovies} category={activeCategory} enableWatchlistToggle={true} />
      </main>
      <Footer />
    </div>
  );
}
