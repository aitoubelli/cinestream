"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SlidersHorizontal, Grid3x3, List, ChevronLeft, ChevronRight, Search, ChevronDown } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MovieCard } from '@/components/BrowseMovieCard';
import { Footer } from '@/components/Footer';
import { getApiUrl } from '@/lib/utils';
import { filterResultsClientSide, type FilterState, type MediaItem } from '@/lib/filterUtils';

const ITEMS_PER_PAGE_DISPLAY = 18;

export function BrowsePage() {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [results, setResults] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  const router = useRouter();
  const searchParams = useSearchParams();
  const isInitialMount = useRef(true);

  // Filters state
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    type: 'all',
    genre: 'all',
    year: 'all',
    rating: 'all',
    sortBy: 'popular',
    language: 'all'
  });

  // Handle Card Click
  const handleCardClick = (movie: any) => {
    const baseRoute =
      movie.type === 'anime' ? '/anime' :
      movie.type === 'tv' || movie.type === 'series' ? '/series' :
      '/movies';
    router.push(`${baseRoute}/${movie.id}`);
  };

  // Sync state with URL on mount
  useEffect(() => {
    const urlFilters: FilterState = {
      search: searchParams.get('search') || '',
      type: searchParams.get('type') || 'all',
      genre: searchParams.get('genre') || 'all',
      year: searchParams.get('year') || 'all',
      rating: searchParams.get('rating') || 'all',
      sortBy: searchParams.get('sortBy') || 'popular',
      language: searchParams.get('language') || 'all'
    };
    setFilters(urlFilters);
    const page = parseInt(searchParams.get('page') || '1');
    setCurrentPage(page);
  }, []);

  // Update URL when filters or page change
  const updateUrl = (newFilters: FilterState, page: number) => {
    const params = new URLSearchParams();
    if (newFilters.search) params.set('search', newFilters.search);
    if (newFilters.type !== 'all') params.set('type', newFilters.type);
    if (newFilters.genre !== 'all') params.set('genre', newFilters.genre);
    if (newFilters.year !== 'all') params.set('year', newFilters.year);
    if (newFilters.rating !== 'all') params.set('rating', newFilters.rating);
    if (newFilters.sortBy !== 'popular') params.set('sortBy', newFilters.sortBy);
    if (newFilters.language !== 'all') params.set('language', newFilters.language);
    if (page > 1) params.set('page', page.toString());

    const newPath = params.toString() ? `/browse?${params.toString()}` : '/browse';
    router.replace(newPath, { scroll: false });
  };

  const handleFilterChange = (key: string, value: string) => {
    setCurrentPage(1);
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    updateUrl(newFilters, 1);
  };

  const resetFilters = () => {
    const resetState: FilterState = {
      search: '',
      type: 'all',
      genre: 'all',
      year: 'all',
      rating: 'all',
      sortBy: 'popular',
      language: 'all'
    };
    setFilters(resetState);
    setCurrentPage(1);
    router.replace('/browse', { scroll: false });
  };

  const fetchBrowseData = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        type: filters.type === 'all' ? 'movie' : filters.type, // Backend currently expects movie or tv
        genre: filters.genre,
        year: filters.year,
        rating: filters.rating,
        sortBy: filters.sortBy,
        language: filters.language,
        page: currentPage.toString()
      });

      // Special case: if type is 'all' and no other major filters, maybe show trending all?
      // For now, let's follow the backend /browse which requires movie or tv.
      // If 'all' is selected, we'll fetch movies as default but the logic can be expanded.

      const endpoint = '/api/content/browse';
      const response = await fetch(`${getApiUrl(endpoint)}?${queryParams}`);
      const data = await response.json();

      if (data.results) {
        let fetchedResults = data.results;

        // If we have a search query, and backend /browse doesn't support it,
        // we might need to use /search endpoint or client-side filtering.
        // content-service /search is multi-search.
        // Let's check if there is a search query
        if (filters.search) {
            // Option A: Use client-side filtering on the results (limited)
            // Option B: Fetch from /search instead
            const searchResponse = await fetch(`${getApiUrl('/api/content/search')}?q=${encodeURIComponent(filters.search)}`);
            const searchData = await searchResponse.json();
            if (searchData.results) {
                // Transform search results to MediaItem
                fetchedResults = searchData.results
                    .filter((item: any) => item.media_type !== 'person')
                    .map((item: any) => ({
                        id: item.id,
                        title: item.title || item.name,
                        poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
                        rating: item.vote_average,
                        year: item.release_date ? item.release_date.substring(0, 4) : item.first_air_date ? item.first_air_date.substring(0, 4) : 'N/A',
                        genres: [], // Search multi doesn't always provide genre names easily
                        type: item.media_type,
                        original_language: item.original_language,
                        release_date: item.release_date,
                        first_air_date: item.first_air_date,
                        vote_average: item.vote_average
                    }));

                // Still apply other filters client-side if they are set
                fetchedResults = filterResultsClientSide(fetchedResults, filters);
            }
        }

        // Slice to 18 items per page display, accounting for current page
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE_DISPLAY;
        const displayResults = fetchedResults.slice(startIndex, startIndex + ITEMS_PER_PAGE_DISPLAY);
        setResults(displayResults);

        // For search results, calculate pagination based on actual results
        if (filters.search) {
          const totalSearchResults = fetchedResults.length;
          setTotalResults(totalSearchResults);
          setTotalPages(Math.ceil(totalSearchResults / ITEMS_PER_PAGE_DISPLAY));
        } else {
          setTotalPages(data.totalPages || 1);
          setTotalResults(data.totalResults || fetchedResults.length);
        }
      } else {
        setResults([]);
      }
    } catch (error) {
      console.error('Error fetching browse data:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [filters, currentPage]);

  useEffect(() => {
    if (isInitialMount.current) {
        isInitialMount.current = false;
        // The first load is handled by the mount sync
    }
    fetchBrowseData();
  }, [fetchBrowseData]);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      updateUrl(filters, page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans pt-20 pb-16 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mt-16 mb-8">
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
            {/* Search - Full Width */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-100/40" />
                <input
                  type="text"
                  placeholder="Search movies..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="w-full bg-black/60 text-cyan-100 text-sm rounded-lg border border-cyan-500/30 pl-10 pr-4 py-2.5 focus:border-cyan-400/60 outline-none transition-all"
                />
              </div>
            </div>

            {/* Quick Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              {/* Content Type */}
              <div>
                <label className="block text-sm text-cyan-100/80 mb-2">Content Type</label>
                <select
                  value={filters.type}
                  onChange={(e) => handleFilterChange('type', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-black/60 border border-cyan-500/30 text-cyan-100 focus:outline-none focus:border-cyan-400/60 cursor-pointer"
                >
                  <option value="all">All</option>
                  <option value="movie">Movies</option>
                  <option value="tv">Series</option>
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
                  <option value="all">All</option>
                  <option value="Action">Action</option>
                  <option value="Adventure">Adventure</option>
                  <option value="Animation">Animation</option>
                  <option value="Comedy">Comedy</option>
                  <option value="Crime">Crime</option>
                  <option value="Documentary">Documentary</option>
                  <option value="Drama">Drama</option>
                  <option value="Fantasy">Fantasy</option>
                  <option value="Horror">Horror</option>
                  <option value="Mystery">Mystery</option>
                  <option value="Romance">Romance</option>
                  <option value="Sci-Fi">Sci-Fi</option>
                  <option value="Thriller">Thriller</option>
                  <option value="War">War</option>
                  <option value="Western">Western</option>
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
                  <option value="all">All</option>
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                  <option value="2023">2023</option>
                  <option value="2022">2022</option>
                  <option value="2021">2021</option>
                  <option value="2020">2020</option>
                  <option value="2019">2019</option>
                  <option value="2018">2018</option>
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
                  <option value="popular">Most Popular</option>
                  <option value="top_rated">Top Rated</option>
                  <option value="newest">Newest</option>
                  <option value="trending">Trending</option>
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
                        <option value="all">All</option>
                        <option value="9+">9+</option>
                        <option value="8+">8+</option>
                        <option value="7+">7+</option>
                        <option value="6+">6+</option>
                        <option value="5+">5+</option>
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
                        <option value="all">All Languages</option>
                        <option value="en">English</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                        <option value="ja">Japanese</option>
                        <option value="ko">Korean</option>
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

        {/* Content Grid/List */}
        {loading && results.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="aspect-[2/3] bg-zinc-900/50 rounded-2xl animate-pulse border border-zinc-800/50" />
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-20 h-20 rounded-full bg-zinc-900 flex items-center justify-center mb-4 border border-zinc-800">
              <SlidersHorizontal className="w-8 h-8 text-zinc-700" />
            </div>
            <h3 className="text-xl font-bold text-white">No results found</h3>
            <p className="text-zinc-500 mt-2 max-w-xs">
              We couldn't find any content matching your current filters. Try adjusting them.
            </p>
            <button
              onClick={resetFilters}
              className="mt-6 text-cyan-400 hover:text-cyan-300 font-bold text-sm underline underline-offset-4"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className={
            viewMode === 'grid'
              ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6"
              : "flex flex-col gap-4"
          }>
            {results.map((movie, index) => (
              viewMode === 'grid' ? (
                <MovieCard key={`${movie.type}_${movie.id}`} movie={movie} index={index} />
              ) : (
                <motion.div
                  key={`${movie.type}_${movie.id}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="flex gap-6 p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/50 hover:border-cyan-500/30 hover:bg-zinc-900/60 transition-all cursor-pointer group"
                  onClick={() => handleCardClick(movie)}
                >
                  <div className="relative w-24 md:w-32 aspect-[2/3] shrink-0 overflow-hidden rounded-xl shadow-2xl">
                    <img
                      src={movie.poster || '/fallback-poster.svg'}
                      alt={movie.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  </div>
                  <div className="flex-1 py-2">
                    <div className="flex items-start justify-between">
                      <h3 className="text-lg md:text-xl font-bold text-white group-hover:text-cyan-400 transition-colors line-clamp-1">
                        {movie.title}
                      </h3>
                      <div className="flex items-center gap-1 bg-yellow-500/10 text-yellow-500 px-2 py-1 rounded-lg text-xs font-bold border border-yellow-500/20">
                        ⭐ {movie.rating.toFixed(1)}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{movie.type}</span>
                      <span className="w-1 h-1 rounded-full bg-zinc-700" />
                      <span className="text-xs font-bold text-cyan-500/80">{movie.year}</span>
                    </div>
                    <p className="text-zinc-500 text-sm mt-4 line-clamp-2 md:line-clamp-3 leading-relaxed">
                      {movie.genres.join(' • ')}
                    </p>
                  </div>
                </motion.div>
              )
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-16 flex items-center justify-center gap-3 pb-12">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2.5 bg-black/60 text-cyan-100 rounded-xl disabled:opacity-30 border border-cyan-500/30 hover:border-cyan-400/60 hover:bg-cyan-500/20 transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center bg-black/60 border border-cyan-500/30 rounded-xl px-4 py-2">
              <span className="text-cyan-100/80 text-sm font-bold">
                Page <span className="text-cyan-300">{currentPage}</span> <span className="text-cyan-100/60 px-1">/</span> {totalPages}
              </span>
            </div>

            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2.5 bg-black/60 text-cyan-100 rounded-xl disabled:opacity-30 border border-cyan-500/30 hover:border-cyan-400/60 hover:bg-cyan-500/20 transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
