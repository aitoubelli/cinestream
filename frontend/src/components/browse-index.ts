// Main components
export { BrowsePage } from './BrowsePage';
export { MovieCard } from './BrowseMovieCard';
export { ImageWithFallback } from './BrowseImageWithFallback';

// Types
export interface Movie {
  title: string;
  poster: string;
  rating: number;
  year: string;
  genres: string[];
  progress?: number;
}

export interface BrowsePageProps {
  initialFilters?: {
    category?: string;
    year?: string;
    genre?: string;
    search?: string;
    type?: 'all' | 'movies' | 'series';
  };
}
