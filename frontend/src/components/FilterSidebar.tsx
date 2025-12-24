import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { FilterState } from '@/lib/filterUtils';

interface FilterSidebarProps {
  filters: FilterState;
  handleFilterChange: (key: string, value: string) => void;
  resetFilters: () => void;
}

const genres = [
  'All', 'Action', 'Adventure', 'Animation', 'Comedy', 'Crime',
  'Documentary', 'Drama', 'Fantasy', 'Horror', 'Mystery',
  'Romance', 'Sci-Fi', 'Thriller', 'War', 'Western'
];

const years = ['All', '2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018'];
const ratings = ['All', '9+', '8+', '7+', '6+', '5+'];
const sortOptions = [
  { label: 'Most Popular', value: 'popular' },
  { label: 'Top Rated', value: 'top_rated' },
  { label: 'Newest', value: 'newest' },
  { label: 'Trending', value: 'trending' }
];
const languages = [
  { label: 'All Languages', value: 'all' },
  { label: 'English', value: 'en' },
  { label: 'Spanish', value: 'es' },
  { label: 'French', value: 'fr' },
  { label: 'Japanese', value: 'ja' },
  { label: 'Korean', value: 'ko' }
];

const FilterSidebar: React.FC<FilterSidebarProps> = ({
  filters,
  handleFilterChange,
  resetFilters
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
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
                <option key={option.value} value={option.value}>{option.label}</option>
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
                      <option key={lang.value} value={lang.value}>{lang.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default FilterSidebar;
