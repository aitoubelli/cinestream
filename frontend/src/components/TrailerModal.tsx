import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface Video {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
}

interface TrailerModalProps {
  isOpen: boolean;
  onClose: () => void;
  trailer?: Video;
  movieTitle: string;
}

export function TrailerModal({ isOpen, onClose, trailer, movieTitle }: TrailerModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/90 backdrop-blur-md z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="relative w-full max-w-6xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Glow Effect */}
              <div
                className="absolute inset-0 blur-3xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 rounded-3xl"
              />

              {/* Modal Content */}
              <div
                className="relative backdrop-blur-xl bg-black/80 border border-cyan-500/30 rounded-3xl overflow-hidden"
                style={{ boxShadow: '0 0 80px rgba(6, 182, 212, 0.4)' }}
              >
                {/* Close Button */}
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="absolute top-4 right-4 z-10 p-3 rounded-full bg-black/80 border border-cyan-500/30 hover:border-cyan-400/60 transition-all"
                  style={{ boxShadow: '0 0 20px rgba(6, 182, 212, 0.3)' }}
                >
                  <X className="w-6 h-6 text-cyan-300" />
                </motion.button>

                {/* Video Container */}
                <div className="relative aspect-video bg-black">
                  {trailer ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1&modestbranding=1&rel=0`}
                      title={trailer.name}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-2xl text-cyan-100 mb-2">{movieTitle}</p>
                        <p className="text-cyan-100/60">No trailer available</p>
                        <p className="text-sm text-cyan-100/40 mt-4">
                          Trailer not found for this title
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
