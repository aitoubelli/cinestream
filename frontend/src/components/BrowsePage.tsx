"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SlidersHorizontal, X, ChevronDown, Grid3x3, List } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MovieCard } from '@/components//BrowseMovieCard';
import { getApiUrl } from '@/lib/utils';

export function BrowsePage() {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [appending, setAppending] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const isUpdatingUrl = useRef(false);

  const handleCardClick = (movie: any) => {
    const baseRoute =
      movie.type === 'anime' ? '/anime' :
      movie.type === 'tv' || movie.type === 'series' ? '/series' :
      '/movies';

    router.push(`${baseRoute}/${movie.id}`);
  };

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    type: 'movie',
    genre: 'all',
    year: 'all',
    rating: 'all',
    sortBy: 'popular',
    language: 'all'
  });

  const genres = [
    'All', 'Action', 'Adventure', 'Animation', 'Comedy', 'Crime',
    'Documentary', 'Drama', 'Fantasy', 'Horror', 'Mystery',
    'Romance', 'Sci-Fi', 'Thriller', 'War', 'Western'
  ];

  const years = ['All', '2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018'];
  const ratings = ['All', '9+', '8+', '7+', '6+', '5+'];
  const sortOptions = ['Popular', 'Top Rated', 'Newest', 'Trending'];
  const languages = ['All', 'English', 'Japanese', 'Korean', 'Spanish', 'French'];

  const handleFilterChange = (key: string, value: string) => {
    // Clear results and reset state when changing filters (especially content type)
    setResults([]);
    setCurrentPage(1);
    setAppending(false); // Reset appending state
    setFilters(prev => {
      const newFilters = { ...prev, [key]: value };
      // Update URL after state change
      setTimeout(() => updateUrlFromFilters(), 0);
      return newFilters;
    });
  };

  const resetFilters = () => {
    setResults([]);
    setCurrentPage(1);

    const resetState = {
      search: '',
      type: 'movie',
      genre: 'all',
      year: 'all',
      rating: 'all',
      sortBy: 'popular',
      language: 'all'
    };
    setFilters(resetState);

    // Update URL to remove all filters
    isUpdatingUrl.current = true;
    router.replace('/browse', { scroll: false });
    // Reset the flag after a brief delay to allow URL to update
    setTimeout(() => {
      isUpdatingUrl.current = false;
    }, 10);
  };

  // Initialize filters from URL on mount
  useEffect(() => {
    const type = searchParams.get('type');
    const genre = searchParams.get('genre');
    const year = searchParams.get('year');
    const sortBy = searchParams.get('sortBy');
    const rating = searchParams.get('rating');
    const language = searchParams.get('language');
    const search = searchParams.get('search');

    const urlFilters = {
      search: search || '',
      type: type && ['all', 'movie', 'tv', 'anime'].includes(type) ? type as 'all' | 'movie' | 'tv' | 'anime' : 'movie',
      genre: genre || 'all',
      year: year || 'all',
      rating: rating || 'all',
      sortBy: sortBy || 'popular',
      language: language || 'all',
    } as const;

    setFilters(urlFilters);
  }, []); // Only run on mount

  // Update URL when filters change (after user interaction)
  const updateUrlFromFilters = () => {
    const params = new URLSearchParams();

    if (filters.type !== 'movie') params.set('type', filters.type);
    if (filters.genre !== 'all') params.set('genre', filters.genre);
    if (filters.year !== 'all') params.set('year', filters.year);
    if (filters.sortBy !== 'popular') params.set('sortBy', filters.sortBy);
    if (filters.rating !== 'all') params.set('rating', filters.rating);
    if (filters.language !== 'all') params.set('language', filters.language);
    if (filters.search) params.set('search', filters.search);

    const newPath = params.toString() ? `/browse?${params.toString()}` : '/browse';
    router.replace(newPath, { scroll: false });
  };

  const fetchBrowseData = async (page = 1, appendResults = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        ...filters,
        page: page.toString()
      });

      // Use unified browse API for all content types
      const response = await fetch(`${getApiUrl('/api/browse')}?${params}`);
      const data = await response.json();

      if (data.success) {
        if (appendResults) {
          // Append new results to existing results
          setResults(prevResults => [...prevResults, ...(data.results || [])]);
        } else {
          // Replace results for initial load or filter change
          setResults(data.results || []);
          setCurrentPage(data.page || 1); // Only update currentPage when not appending
        }
        setTotalPages(data.totalPages || 1);
        setTotalResults(data.totalResults || 0);
        setAppending(false); // Reset appending state after fetch
      } else {
        console.error('Failed to fetch browse data:', data.error);
        if (!appendResults) {
          setResults([]);
        }
      }
    } catch (error) {
      console.error('Error fetching browse data:', error);
      if (!appendResults) {
        setResults([]);
      }
    } finally {
      setLoading(false);
      setAppending(false); // Always reset appending state
    }
  };



  // Fetch data when filters or page changes (but not during append)
  useEffect(() => {
    if (!appending) {
      fetchBrowseData(currentPage);
    }
  }, [filters, currentPage]);

  const loadMore = () => {
    if (currentPage < totalPages) {
      setAppending(true);
      fetchBrowseData(currentPage + 1, true); // Load next page and append results
    }
  };

  return (
    <div className="min-h-screen pt-32 pb-16 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl mb-4 bg-gradient-to-r from-cyan-300 to-violet-300 bg-clip-text text-transparent">
            Browse Content
          </h1>
          <p className="text-cyan-100/60">
            {filters.search ? `Search results for "${filters.search}"` : 'Discover your next favorite movie or series'}
          </p>
        </div>

        {/* Filter Bar */}
        <div className="mb-8">
          <div
            className="p-6 rounded-2xl backdrop-blur-md bg-black/40 border border-cyan-500/20"
            style={{ boxShadow: '0 0 30px rgba(6, 182, 212, 0.15)' }}
          >
            {/* Quick Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              {/* Type */}
              <div>
                <label className="block text-sm text-cyan-100/80 mb-2">Content Type</label>
                <select
                  value={filters.type}
                  onChange={(e) => handleFilterChange('type', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-black/60 border border-cyan-500/30 text-cyan-100 focus:outline-none focus:border-cyan-400/60 cursor-pointer"
                >
                  <option value="movie">Movies</option>
                  <option value="tv">Series</option>
                  <option value="anime">Anime</option>
                </select>
              </div>

              {/* Genre */}
              <div>
                <label className="block text-sm text-cyan-100/80 mb-2">Genre</label>
                <select
                  value={filters.genre}
                  onChange={(e) => handleFilterChange('genre', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-black/60 border border-cyan-500/30 text-cyan-100 focus:outline-none focus:border-cyan-400/60 cursor-pointer"
                >
                  {genres.map(genre => (
                    <option key={genre} value={genre.toLowerCase()}>{genre}</option>
                  ))}
                </select>
              </div>

              {/* Year */}
              <div>
                <label className="block text-sm text-cyan-100/80 mb-2">Year</label>
                <select
                  value={filters.year}
                  onChange={(e) => handleFilterChange('year', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-black/60 border border-cyan-500/30 text-cyan-100 focus:outline-none focus:border-cyan-400/60 cursor-pointer"
                >
                  {years.map(year => (
                    <option key={year} value={year.toLowerCase()}>{year}</option>
                  ))}
                </select>
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-sm text-cyan-100/80 mb-2">Sort By</label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-black/60 border border-cyan-500/30 text-cyan-100 focus:outline-none focus:border-cyan-400/60 cursor-pointer"
                >
                  {sortOptions.map(option => (
                    <option key={option} value={option.toLowerCase().replace(' ', '-')}>{option}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Advanced Filters Toggle */}
            <div className="flex items-center justify-between pt-4 border-t border-cyan-500/20">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-500/10 border border-violet-500/30 hover:border-violet-400/60 transition-all text-violet-300"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>{showAdvanced ? 'Hide' : 'Show'} Advanced Filters</span>
                <motion.div
                  animate={{ rotate: showAdvanced ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ChevronDown className="w-4 h-4" />
                </motion.div>
              </motion.button>

              <div className="flex items-center gap-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={resetFilters}
                  className="px-4 py-2 rounded-lg text-cyan-300/80 hover:text-cyan-300 transition-colors"
                >
                  Reset Filters
                </motion.button>

                {/* View Mode Toggle */}
                <div className="flex items-center gap-2 p-1 rounded-lg bg-black/60 border border-cyan-500/30">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded ${viewMode === 'grid' ? 'bg-cyan-500/20 text-cyan-300' : 'text-cyan-100/60'}`}
                  >
                    <Grid3x3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded ${viewMode === 'list' ? 'bg-cyan-500/20 text-cyan-300' : 'text-cyan-100/60'}`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Advanced Filters */}
            <AnimatePresence>
              {showAdvanced && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="pt-4 mt-4 border-t border-cyan-500/20"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Rating */}
                    <div>
                      <label className="block text-sm text-cyan-100/80 mb-2">Minimum Rating</label>
                      <select
                        value={filters.rating}
                        onChange={(e) => handleFilterChange('rating', e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg bg-black/60 border border-cyan-500/30 text-cyan-100 focus:outline-none focus:border-cyan-400/60 cursor-pointer"
                      >
                        {ratings.map(rating => (
                          <option key={rating} value={rating.toLowerCase()}>{rating}</option>
                        ))}
                      </select>
                    </div>

                    {/* Language */}
                    <div>
                      <label className="block text-sm text-cyan-100/80 mb-2">Language</label>
                      <select
                        value={filters.language}
                        onChange={(e) => handleFilterChange('language', e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg bg-black/60 border border-cyan-500/30 text-cyan-100 focus:outline-none focus:border-cyan-400/60 cursor-pointer"
                      >
                        {languages.map(lang => (
                          <option key={lang} value={lang.toLowerCase()}>{lang}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6 flex items-center justify-between">
          <p className="text-cyan-100/60">
            {loading ? 'Loading...' : `Found ${totalResults} results`}
          </p>
        </div>

        {/* Results Grid */}
        <div className={
          viewMode === 'grid'
            ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6"
            : "flex flex-col gap-6"
        }>
          {results.map((movie, index) => (
            viewMode === 'grid' ? (
              <MovieCard key={`${movie.type}_${movie.id}`} movie={movie} index={index} />
            ) : (
              <motion.div
                key={`${movie.type}_${movie.id}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                className="flex gap-4 p-4 rounded-xl bg-black/40 backdrop-blur-sm border border-cyan-500/20 hover:border-cyan-400/40 transition-all cursor-pointer"
                onClick={() => handleCardClick(movie)}
              >
                <img
                  src={movie.poster}
                  alt={movie.title}
                  className="w-24 h-36 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <h3 className="text-cyan-100 mb-2">{movie.title}</h3>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 rounded bg-cyan-500/20 text-cyan-300 text-xs">
                      {movie.year}
                    </span>
                    <span className="px-2 py-1 rounded bg-yellow-500/20 text-yellow-300 text-xs flex items-center gap-1">
                      ⭐ {movie.rating.toFixed(1)}
                    </span>
                  </div>
                  <p className="text-cyan-100/60 text-sm line-clamp-2">
                    {movie.genres.join(', ')}
                  </p>
                </div>
              </motion.div>
            )
          ))}
        </div>

        {/* Load More */}
        {!loading && currentPage < totalPages && (
          <div className="mt-12 text-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={loadMore}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 text-white"
              style={{ boxShadow: '0 0 30px rgba(6, 182, 212, 0.4)' }}
            >
              Load More
            </motion.button>
          </div>
        )}

        {/* Loading indicator */}
        {loading && (
          <div className="mt-12 text-center">
            <div className="inline-block w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
          </div>
        )}

        {/* No results */}
        {!loading && results.length === 0 && (
          <div className="mt-12 text-center">
            <p className="text-cyan-100/60 text-lg">No results found. Try adjusting your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
