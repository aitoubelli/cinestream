"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SlidersHorizontal, Grid3x3, List, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MovieCard } from '@/components/BrowseMovieCard';
import { getApiUrl } from '@/lib/utils';
import { filterResultsClientSide, type FilterState, type MediaItem } from '@/lib/filterUtils';
import FilterSidebar from './FilterSidebar';

const ITEMS_PER_PAGE_DISPLAY = 18;

export function BrowsePage() {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
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

        // Slice to 18 items per page display
        const displayResults = fetchedResults.slice(0, ITEMS_PER_PAGE_DISPLAY);
        setResults(displayResults);
        setTotalPages(data.totalPages || 1);
        setTotalResults(data.totalResults || fetchedResults.length);
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
    <div className="min-h-screen bg-[#050505] text-white font-sans flex flex-col pt-20">
      <div className="flex flex-1 overflow-hidden relative">

        {/* Sidebar */}
        <FilterSidebar
            filters={filters}
            handleFilterChange={handleFilterChange}
            resetFilters={resetFilters}
            isMobileOpen={isMobileSidebarOpen}
            closeMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Main Content */}
        <main className="flex-1 h-[calc(100vh-80px)] overflow-y-auto p-4 lg:p-8 bg-gradient-to-br from-black to-zinc-900/50">
            <div className="max-w-7xl mx-auto">

                {/* Mobile Filter Toggle & Controls */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsMobileSidebarOpen(true)}
                            className="lg:hidden flex items-center gap-2 bg-zinc-900 text-white px-4 py-2.5 rounded-xl text-sm font-bold border border-zinc-800 hover:border-cyan-500/50 transition-all"
                        >
                            <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
                            Filters
                        </button>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                                {filters.search ? `Results for "${filters.search}"` : 'Browse Library'}
                            </h1>
                            <p className="text-zinc-500 text-sm mt-1">
                                {loading ? 'Updating results...' : `Showing ${results.length} of ${totalResults} titles`}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* View Mode Toggle */}
                        <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-900 border border-zinc-800">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-cyan-500/20 text-cyan-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                                <Grid3x3 className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-cyan-500/20 text-cyan-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                                <List className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
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
                            className="p-2.5 bg-zinc-900 text-white rounded-xl disabled:opacity-30 border border-zinc-800 hover:border-cyan-500/50 hover:bg-zinc-800 transition-all"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>

                        <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2">
                            <span className="text-zinc-400 text-sm font-bold">
                                Page <span className="text-white">{currentPage}</span> <span className="text-zinc-600 px-1">/</span> {totalPages}
                            </span>
                        </div>

                        <button
                            onClick={() => goToPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="p-2.5 bg-zinc-900 text-white rounded-xl disabled:opacity-30 border border-zinc-800 hover:border-cyan-500/50 hover:bg-zinc-800 transition-all"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                )}
            </div>
        </main>
      </div>
    </div>
  );
}
