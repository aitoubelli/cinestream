import { Star } from 'lucide-react';

export interface RatingDisplayProps {
  rating: number;
  maxRating?: number;
  showStars?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showMaxRating?: boolean;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6'
};

export function RatingDisplay({
  rating,
  maxRating = 10,
  showStars = true,
  className = '',
  size = 'md',
  showMaxRating = false
}: RatingDisplayProps) {
  const roundedRating = Math.round(rating * 10) / 10; // Round to 1 decimal place

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showStars && (
        <div className="flex items-center gap-1">
          <Star className={`${sizeClasses[size]} text-cyan-400 fill-cyan-400`} />
          <span className="text-cyan-100 font-semibold">
            {roundedRating}{showMaxRating ? `/${maxRating}` : ''}
          </span>
        </div>
      )}
      {!showStars && (
        <span className="text-cyan-100 font-semibold">
          {roundedRating}{showMaxRating ? `/${maxRating}` : ''}
        </span>
      )}
    </div>
  );
}

export default RatingDisplay;
