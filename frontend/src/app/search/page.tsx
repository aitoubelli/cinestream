"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import { StarfieldBackground } from '@/components/StarfieldBackground';
import { Navbar } from '@/components/Navbar';
import { MovieCard } from '@/components/MovieCard';
import { Footer } from '@/components/Footer';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/Pagination';
import { Search, Loader2 } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface SearchResult {
  id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  release_date?: string;
  genre_ids: number[];
}

interface MovieCardData {
  id: number;
  title: string;
  poster: string;
  rating: number;
  year: string;
  genres: string[];
}

function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [debouncedQuery, setDebouncedQuery] = useState(searchParams.get('q') || '');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchType, setSearchType] = useState<'movie' | 'tv'>('movie');

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Update URL when debounced query changes and reset page
  useEffect(() => {
    if (debouncedQuery.trim()) {
      router.replace(`/search?q=${encodeURIComponent(debouncedQuery.trim())}`);
      setCurrentPage(1); // Reset to first page when query changes
    } else {
      router.replace('/search');
    }
  }, [debouncedQuery, router]);

  // Fetch search results
  const { data: searchData, error: searchError, isLoading: searchLoading } = useSWR(
    debouncedQuery.trim().length >= 2 ? `/api/movies/search?q=${encodeURIComponent(debouncedQuery.trim())}&type=${searchType}&page=${currentPage}` : null,
    fetcher,
  );

  // Transform search results to match MovieCard interface
  const transformSearchResult = (item: SearchResult) => ({
    id: item.id,
    title: item.title || 'Unknown Title',
    poster: item.poster_path
      ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
      : 'https://via.placeholder.com/500x750?text=No+Image',
    rating: item.vote_average,
    year: item.release_date ? new Date(item.release_date).getFullYear().toString() : '2024',
    genres: ['Action', 'Drama'], // TODO: Map genre_ids to actual genre names
  });

  const searchResults = searchData?.results?.map(transformSearchResult) || [];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setDebouncedQuery(searchQuery);
  };

  return (
    <div className="min-h-screen bg-[#050510] dark overflow-x-hidden">
      <StarfieldBackground />
      <Navbar />

      <main className="pt-24 pb-16 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Search Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl md:text-5xl bg-gradient-to-r from-cyan-300 to-violet-300 bg-clip-text text-transparent inline-block relative mb-6">
              Search Movies
              <div
                className="absolute -bottom-2 left-0 h-1 w-32 bg-gradient-to-r from-cyan-400 to-violet-400 rounded-full mx-auto"
                style={{ boxShadow: '0 0 20px rgba(6, 182, 212, 0.6)' }}
              />
            </h1>

            {/* Search Form */}
            <form onSubmit={handleSearch} className="max-w-md mx-auto mb-8">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search for movies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-black/40 border-cyan-500/30 text-white placeholder:text-cyan-300/50 focus:border-cyan-400 focus:ring-cyan-400/20"
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-400" />
                <Button
                  type="submit"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-600 hover:to-violet-600"
                >
                  Search
                </Button>
              </div>
            </form>

            {/* Search Status */}
            {debouncedQuery.trim().length > 0 && debouncedQuery.trim().length < 2 && (
              <p className="text-cyan-300/70">Please enter at least 2 characters to search</p>
            )}
          </motion.div>

          {/* Loading State */}
          {searchLoading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
              <span className="ml-3 text-cyan-300">Searching...</span>
            </div>
          )}

          {/* Error State */}
          {searchError && (
            <div className="text-center py-16">
              <h2 className="text-2xl font-bold text-red-600 mb-4">Search Error</h2>
              <p className="text-gray-400">Failed to search movies. Please try again.</p>
            </div>
          )}

          {/* No Results */}
          {!searchLoading && !searchError && debouncedQuery.trim().length >= 2 && searchResults.length === 0 && (
            <div className="text-center py-16">
              <h2 className="text-2xl font-bold text-cyan-300 mb-4">No Results Found</h2>
              <p className="text-gray-400">
                No movies found for "{debouncedQuery}". Try a different search term.
              </p>
            </div>
          )}

          {/* Search Results */}
          {!searchLoading && !searchError && searchResults.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
            >
              <div className="mb-8">
                <h2 className="text-2xl md:text-3xl text-cyan-300 mb-2">
                  Search Results for "{debouncedQuery}"
                </h2>
                <p className="text-cyan-300/70">
                  Found {searchData?.results?.length || 0} movies
                </p>
              </div>

              {/* Results Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                {searchResults.map((movie: MovieCardData, index: number) => (
                  <MovieCard
                    key={movie.id}
                    movie={movie}
                    index={index}
                    category="movies"
                    enableWatchlistToggle={true}
                  />
                ))}
              </div>

              {/* Pagination */}
              <Pagination
                currentPage={currentPage}
                totalPages={searchData?.total_pages || 1}
                onPageChange={setCurrentPage}
              />
            </motion.div>
          )}

          {/* Initial State */}
          {!debouncedQuery.trim() && (
            <div className="text-center py-16">
              <Search className="w-16 h-16 text-cyan-400/50 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-cyan-300 mb-4">Start Searching</h2>
              <p className="text-gray-400 max-w-md mx-auto">
                Enter a movie title above to search through our extensive movie database.
                Find your favorite films and discover new ones to watch.
              </p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#050510] dark overflow-x-hidden flex items-center justify-center">
        <div className="text-cyan-400">Loading...</div>
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
}
