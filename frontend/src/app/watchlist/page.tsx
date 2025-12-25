"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { motion } from "framer-motion";
import { MovieCard } from "@/components/MovieCard";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";
import { Card } from "@/components/ui/card";

const authenticatedFetcher = async (url: string, getIdToken: () => Promise<string | null>) => {
  const idToken = await getIdToken();
  const response = await fetch(url, {
    headers: {
      ...(idToken && { 'Authorization': `Bearer ${idToken}` }),
    },
  });
  return response.json();
};

const genreMap: { [key: number]: string } = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
  27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi',
  10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western'
};

export default function WatchlistPage() {
  const { user, loading: authLoading, getIdToken } = useAuth();
  const router = useRouter();

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  // Fetch watchlist items
  const { data: watchlistData, error: watchlistError, isLoading: watchlistLoading } = useSWR(
    user ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/watchlist` : null,
    (url: string) => authenticatedFetcher(url, getIdToken)
  );

  const watchlistItems = watchlistData?.watchlist || [];

  // Fetch full content data for each watchlist item
  const { data: contentData, error: contentError, isLoading: contentLoading } = useSWR(
    watchlistItems.length > 0 ? watchlistItems.map((item: any) => `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/content/${item.contentType === 'movie' ? 'movies' : item.contentType}/${item.contentId}`) : null,
    async (urls: string[]) => {
      const responses = await Promise.all(urls.map(url => fetch(url)));
      const data = await Promise.all(responses.map(res => res.json()));

      // Transform TMDB data to MovieCard format
      return data.map((content, index) => {
        const item = watchlistItems[index];
        const isMovie = content.title !== undefined;
        return {
          id: content.id,
          title: isMovie ? content.title : content.name,
          poster: content.poster_path
            ? `https://image.tmdb.org/t/p/w500${content.poster_path}`
            : 'https://via.placeholder.com/500x750?text=No+Image',
          rating: content.vote_average,
          year: isMovie
            ? (content.release_date ? new Date(content.release_date).getFullYear().toString() : '2024')
            : (content.first_air_date ? new Date(content.first_air_date).getFullYear().toString() : '2024'),
          genres: content.genres?.slice(0, 2).map((genre: any) => genre.name) || ['Unknown'],
          category: item.contentType === 'movie' ? 'movies' : 'series'
        };
      }).filter(Boolean);
    }
  );

  // Show loading state while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#050510]">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
          <div className="animate-pulse">
            <div className="h-12 bg-gray-700 rounded w-1/4 mb-8"></div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="aspect-[2/3] bg-gray-700 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Don't render anything if not authenticated (will redirect)
  if (!user) {
    return null;
  }

  const isLoading = watchlistLoading || contentLoading;
  const error = watchlistError || contentError;
  const movies = contentData || [];

  return (
    <div className="min-h-screen bg-[#050510]">
      <Navbar />
      <div className="pt-32 pb-16 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-4xl md:text-5xl mb-4 bg-gradient-to-r from-cyan-300 to-violet-300 bg-clip-text text-transparent">
              My Watchlist
            </h1>
            <p className="text-lg text-cyan-100/60">
              Your personal collection of movies and TV shows to watch
            </p>
          </div>

        {/* Error State */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card className="p-6 bg-red-500/10 border-red-500/30">
              <p className="text-red-400">
                Failed to load watchlist. Please try again later.
              </p>
            </Card>
          </motion.div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="animate-pulse">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="aspect-[2/3] bg-gray-700 rounded-xl"></div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && movies.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center py-16"
          >
            <Card className="p-8 bg-black/40 backdrop-blur-sm border-cyan-500/20 max-w-md mx-auto">
              <div className="text-6xl mb-4">🎬</div>
              <h2 className="text-2xl font-bold text-cyan-100 mb-2">
                Your watchlist is empty
              </h2>
              <p className="text-cyan-100/60">
                Start adding movies to keep track of what you want to watch!
              </p>
            </Card>
          </motion.div>
        )}

        {/* Movies Grid */}
        {!isLoading && !error && movies.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {movies.map((movie: any, index: number) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  index={index}
                  category={movie.category}
                  enableWatchlistToggle={true}
                />
              ))}
            </div>
          </motion.div>
        )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
