import { useState } from 'react';
import { motion } from 'motion/react';
import { Star } from 'lucide-react';

export interface StarRatingProps {
  initialRating?: number;
  maxRating?: number;
  onRatingChange?: (rating: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-5 h-5',
  md: 'w-8 h-8',
  lg: 'w-10 h-10'
};

export function StarRating({
  initialRating = 0,
  maxRating = 10,
  onRatingChange,
  readonly = false,
  size = 'md',
  className = ''
}: StarRatingProps) {
  const [userRating, setUserRating] = useState(initialRating);
  const [hoverRating, setHoverRating] = useState(0);

  const handleRating = (rating: number) => {
    if (readonly) return;
    setUserRating(rating);
    onRatingChange?.(rating);
  };

  const currentRating = hoverRating || userRating;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {Array.from({ length: maxRating }, (_, index) => index + 1).map((rating) => (
        <motion.button
          key={rating}
          whileHover={!readonly ? { scale: 1.2 } : {}}
          whileTap={!readonly ? { scale: 0.9 } : {}}
          onClick={() => handleRating(rating)}
          onMouseEnter={() => !readonly && setHoverRating(rating)}
          onMouseLeave={() => !readonly && setHoverRating(0)}
          disabled={readonly}
          className={readonly ? 'cursor-default' : 'cursor-pointer'}
        >
          <Star
            className={`${sizeClasses[size]} transition-colors ${
              rating <= currentRating
                ? 'text-cyan-400 fill-cyan-400'
                : 'text-cyan-500/30'
            }`}
            style={
              rating <= currentRating
                ? { filter: 'drop-shadow(0 0 8px rgba(6, 182, 212, 0.6))' }
                : {}
            }
          />
        </motion.button>
      ))}
      {userRating > 0 && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2 ml-4"
        >
          <span className="text-cyan-100 text-lg font-semibold">
            {userRating}/{maxRating}
          </span>
          {!readonly && (
            <span className="px-3 py-1 rounded-lg bg-green-500/20 border border-green-500/30 text-green-300 text-sm">
              ✓ Rated
            </span>
          )}
        </motion.div>
      )}
    </div>
  );
}

export default StarRating;
