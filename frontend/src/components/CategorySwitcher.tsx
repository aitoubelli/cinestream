import { motion } from 'motion/react';
import { Film, Tv, Sparkles } from 'lucide-react';

interface CategorySwitcherProps {
  activeCategory: 'movies' | 'series' | 'anime';
  onCategoryChange: (category: 'movies' | 'series' | 'anime') => void;
}

export function CategorySwitcher({ activeCategory, onCategoryChange }: CategorySwitcherProps) {
  const categories = [
    { id: 'movies' as const, label: 'Movies', icon: Film },
    { id: 'series' as const, label: 'Series', icon: Tv },
    { id: 'anime' as const, label: 'Anime', icon: Sparkles }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="flex justify-center"
    >
      <div
        className="inline-flex items-center gap-2 p-2 rounded-2xl backdrop-blur-md bg-black/40 border border-cyan-500/30"
        style={{ boxShadow: '0 0 30px rgba(6, 182, 212, 0.2)' }}
      >
        {categories.map((category) => {
          const Icon = category.icon;
          const isActive = activeCategory === category.id;

          return (
            <motion.button
              key={category.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onCategoryChange(category.id)}
              className="relative px-6 py-3 rounded-xl transition-all"
            >
              {isActive && (
                <motion.div
                  layoutId="activeCategory"
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500"
                  style={{ boxShadow: '0 0 30px rgba(6, 182, 212, 0.6)' }}
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              <div className="relative flex items-center gap-2">
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-cyan-300'} transition-colors`} />
                <span className={`${isActive ? 'text-white' : 'text-cyan-100/80'} transition-colors`}>
                  {category.label}
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
