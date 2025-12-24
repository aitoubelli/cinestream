import React from 'react';
import { motion } from 'motion/react';
import { X, Search } from 'lucide-react';
import { FilterState } from '@/lib/filterUtils';

interface FilterSidebarProps {
  filters: FilterState;
  handleFilterChange: (key: string, value: string) => void;
  resetFilters: () => void;
  isMobileOpen: boolean;
  closeMobile: () => void;
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
  resetFilters,
  isMobileOpen,
  closeMobile
}) => {
  return (
    <>
      {/* Overlay for mobile */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={closeMobile}
        ></div>
      )}

      <aside className={`fixed inset-y-0 left-0 w-72 bg-black/90 border-r border-cyan-500/20 z-50 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:h-[calc(100vh-80px)] overflow-y-auto ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 space-y-8">

          {/* Header Mobile Only */}
          <div className="flex justify-between items-center lg:hidden">
            <h2 className="text-cyan-100 font-bold text-lg">Filters</h2>
            <button onClick={closeMobile} className="text-cyan-100/60 hover:text-cyan-100">
                <X className="w-6 h-6" />
            </button>
          </div>

          {/* Search */}
          <div>
            <h3 className="text-cyan-100/40 text-xs font-bold uppercase tracking-wider mb-3">Search</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-100/40" />
              <input
                type="text"
                placeholder="Search movies..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full bg-black/40 text-cyan-100 text-sm rounded-lg border border-cyan-500/20 pl-10 pr-4 py-2 focus:border-cyan-500/50 outline-none transition-all"
              />
            </div>
          </div>

          {/* Content Type */}
          <div>
            <h3 className="text-cyan-100/40 text-xs font-bold uppercase tracking-wider mb-3">Content Type</h3>
            <div className="flex bg-black/40 rounded-lg p-1 border border-cyan-500/20">
              {['all', 'movie', 'tv'].map((type) => (
                <button
                  key={type}
                  onClick={() => handleFilterChange('type', type)}
                  className={`flex-1 py-2 text-xs font-bold rounded-md capitalize transition-all ${filters.type === type ? 'bg-cyan-500/20 text-cyan-300 shadow-sm' : 'text-cyan-100/40 hover:text-cyan-100'}`}
                >
                  {type === 'tv' ? 'Series' : type}
                </button>
              ))}
            </div>
          </div>

          {/* Sort By */}
          <div>
            <h3 className="text-cyan-100/40 text-xs font-bold uppercase tracking-wider mb-3">Sort By</h3>
            <select
                className="w-full bg-black/40 text-cyan-100 text-sm rounded-lg border border-cyan-500/20 px-3 py-2 focus:border-cyan-500/50 outline-none transition-all cursor-pointer"
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
            >
                {sortOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
            </select>
          </div>

          {/* Year */}
          <div>
            <h3 className="text-cyan-100/40 text-xs font-bold uppercase tracking-wider mb-3">Year</h3>
            <select
                className="w-full bg-black/40 text-cyan-100 text-sm rounded-lg border border-cyan-500/20 px-3 py-2 focus:border-cyan-500/50 outline-none transition-all cursor-pointer"
                value={filters.year}
                onChange={(e) => handleFilterChange('year', e.target.value)}
            >
                {years.map(year => (
                  <option key={year} value={year.toLowerCase()}>{year}</option>
                ))}
            </select>
          </div>

          {/* Min Rating */}
          <div>
            <h3 className="text-cyan-100/40 text-xs font-bold uppercase tracking-wider mb-3 flex justify-between">
                <span>Min Rating</span>
                <span className="text-cyan-400">{filters.rating === 'all' ? '0+' : filters.rating}</span>
            </h3>
            <select
                className="w-full bg-black/40 text-cyan-100 text-sm rounded-lg border border-cyan-500/20 px-3 py-2 focus:border-cyan-500/50 outline-none transition-all cursor-pointer"
                value={filters.rating}
                onChange={(e) => handleFilterChange('rating', e.target.value)}
            >
                {ratings.map(rating => (
                  <option key={rating} value={rating.toLowerCase()}>{rating}</option>
                ))}
            </select>
          </div>

          {/* Language */}
          <div>
             <h3 className="text-cyan-100/40 text-xs font-bold uppercase tracking-wider mb-3">Language</h3>
             <select
                className="w-full bg-black/40 text-cyan-100 text-sm rounded-lg border border-cyan-500/20 px-3 py-2 focus:border-cyan-500/50 outline-none transition-all cursor-pointer"
                value={filters.language}
                onChange={(e) => handleFilterChange('language', e.target.value)}
             >
                {languages.map(lang => (
                  <option key={lang.value} value={lang.value}>{lang.label}</option>
                ))}
             </select>
          </div>

          {/* Genres */}
          <div>
            <h3 className="text-cyan-100/40 text-xs font-bold uppercase tracking-wider mb-3">Genres</h3>
            <div className="flex flex-wrap gap-2">
              {genres.map(genre => (
                <button
                  key={genre}
                  onClick={() => handleFilterChange('genre', genre.toLowerCase())}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all ${
                    filters.genre === genre.toLowerCase()
                      ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                      : 'border-cyan-500/10 text-cyan-100/40 hover:border-cyan-500/30 hover:text-cyan-100'
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>

           {/* Reset Button */}
           <motion.button
             whileHover={{ scale: 1.02 }}
             whileTap={{ scale: 0.98 }}
             onClick={resetFilters}
             className="w-full py-2.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-500/40 rounded-lg text-xs font-bold transition-all mt-4"
           >
             Reset Filters
           </motion.button>

        </div>
      </aside>
    </>
  );
};

export default FilterSidebar;
