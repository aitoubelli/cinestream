export interface FilterState {
  search: string;
  type: string;
  genre: string;
  year: string;
  rating: string;
  sortBy: string;
  language: string;
}

export interface MediaItem {
  id: number;
  title: string;
  poster: string;
  rating: number;
  year: string;
  genres: string[];
  type: string;
  original_language?: string;
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
  vote_average?: number;
}

// Genre ID to name mapping
export const genreMap: { [key: number]: string } = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  14: 'Fantasy',
  27: 'Horror',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Sci-Fi',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
  10759: 'Action & Adventure',
  10751: 'Family',
  10762: 'Kids',
  10763: 'News',
  10764: 'Reality',
  10765: 'Sci-Fi & Fantasy',
  10766: 'Soap',
  10767: 'Talk',
  10768: 'War & Politics'
};

/**
 * Client-side filtering logic for browse results.
 * This is now mainly used as a fallback or for search results.
 */
export const filterResultsClientSide = (results: MediaItem[], filters: FilterState): MediaItem[] => {
  let filtered = [...results];

  // 1. Content Type
  if (filters.type !== 'all') {
    filtered = filtered.filter(item => item.type === filters.type);
  }

  // 2. Year Filter
  if (filters.year && filters.year !== 'all') {
    filtered = filtered.filter(item => {
      const date = item.release_date || item.first_air_date;
      return date ? date.startsWith(filters.year) : (item.year === filters.year);
    });
  }

  // 3. Min Rating
  if (filters.rating && filters.rating !== 'all') {
    const minRating = parseFloat(filters.rating.replace('+', ''));
    filtered = filtered.filter(item => (item.vote_average || item.rating) >= minRating);
  }

  // 4. Language
  if (filters.language && filters.language !== 'all') {
    filtered = filtered.filter(item => item.original_language === filters.language);
  }

  // 5. Genre
  if (filters.genre && filters.genre !== 'all') {
    const genreName = filters.genre;
    filtered = filtered.filter(item => {
      return item.genres.some(g => g.toLowerCase() === genreName.toLowerCase());
    });
  }

  // 6. Search
  if (filters.search) {
    const query = filters.search.toLowerCase();
    filtered = filtered.filter(item =>
      item.title.toLowerCase().includes(query)
    );
  }

  return filtered;
};

/**
 * Sort results based on sortBy filter
 */
export const sortResults = (results: MediaItem[], sortBy: string): MediaItem[] => {
  const sorted = [...results];
  switch (sortBy) {
    case 'popular':
      return sorted.sort((a, b) => b.rating - a.rating);
    case 'top_rated':
      return sorted.sort((a, b) => b.rating - a.rating);
    case 'newest':
      return sorted.sort((a, b) => {
        const dateA = new Date(a.release_date || a.first_air_date || '1900-01-01');
        const dateB = new Date(b.release_date || b.first_air_date || '1900-01-01');
        return dateB.getTime() - dateA.getTime();
      });
    case 'trending':
      return sorted;
    default:
      return sorted;
  }
};
