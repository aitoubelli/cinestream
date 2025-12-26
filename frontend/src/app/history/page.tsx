"use client";

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import { StarfieldBackground } from '@/components/StarfieldBackground';
import { Navbar } from '@/components/Navbar';
import { MovieCard } from '@/components/MovieCard';
import { Footer } from '@/components/Footer';
import { History, CheckCircle, PlayCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getApiUrl } from '@/lib/utils';

const authenticatedFetcher = async (url: string, token: string) => {
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error('Failed to fetch history');
  return response.json();
};

type FilterType = 'all' | 'completed' | 'in-progress';

export default function HistoryPage() {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const { user, getIdToken } = useAuth();

  const { data: historyData, error: historyError, isLoading: historyLoading } = useSWR(
    user ? `${getApiUrl('/api/user/history')}?filter=${activeFilter}` : null,
    async (url: string) => {
      const token = await getIdToken();
      if (!token) throw new Error('No token available');
      return authenticatedFetcher(url, token);
    },
  );

  const [enrichedHistory, setEnrichedHistory] = useState<any[]>([]);

  useEffect(() => {
    const enrichData = async () => {
      if (!historyData?.data) return;

      // Group by content (Movies are individual, Series are aggregated)
      const groups: { [key: string]: any[] } = {};
      historyData.data.forEach((item: any) => {
        const key = `${item.contentType}-${item.contentId}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
      });

      const enriched = await Promise.all(
        Object.keys(groups).map(async (key) => {
          const items = groups[key];
          const latestItem = items.sort((a, b) => new Date(b.lastWatchedAt).getTime() - new Date(a.lastWatchedAt).getTime())[0];
          const { contentId, contentType } = latestItem;

          try {
            const contentResponse = await fetch(getApiUrl(`/api/content/${contentType === 'movie' ? 'movies' : 'series'}/${contentId}`));
            if (contentResponse.ok) {
              const content = await contentResponse.json();

              let isCompleted = false;
              let progressPercent = 0;
              let displayTitle = content.title || content.name || 'Unknown Title';
              let displayEpisodeName = '';

              if (contentType === 'movie') {
                const item = items[0];
                progressPercent = item.durationSeconds > 0 ? (item.progressSeconds / item.durationSeconds) * 100 : 0;
                isCompleted = item.completed; // Backend handles simple completion logic
                // Double check 90% rule if backend logic differs or is missing
                if (progressPercent >= 90) isCompleted = true;
              } else {
                // Series Logic
                // To be "Completed", user must have watched ALL episodes.
                // We need to know total episodes.
                // Content details usually have `number_of_episodes`.
                const totalEpisodes = content.number_of_episodes || 0;
                // Count unique episodes in history
                const watchedEpisodes = new Set(items.map((i: any) => `${i.seasonNumber}-${i.episodeNumber}`));

                // Check if all episodes are watched relative to what we know. 
                // Note: `watchedEpisodes.size` might be less than `totalEpisodes`.
                // For "Completed" tab, we need strict equality approx.
                // For "In Progress", we check if < total.

                // For display, show the LATEST watched episode info.
                if (latestItem.seasonNumber && latestItem.episodeNumber) {
                  displayTitle = `${content.name}`; // Keep Series Title main
                  try {
                    // Fetch episode name for subtitle
                    const episodeResponse = await fetch(getApiUrl(`/api/content/tv/${contentId}/season/${latestItem.seasonNumber}/episode/${latestItem.episodeNumber}`));
                    if (episodeResponse.ok) {
                      const ep = await episodeResponse.json();
                      displayEpisodeName = `S${latestItem.seasonNumber}E${latestItem.episodeNumber}: ${ep.name}`;
                    } else {
                      displayEpisodeName = `S${latestItem.seasonNumber}E${latestItem.episodeNumber}`;
                    }
                  } catch (e) { /* ignore */ }
                }

                // Progress for the SERIES card?
                // Maybe aggregate progress? Or just show the progress of the active episode?
                // User: "show... most recently watched episode... and progress".
                progressPercent = latestItem.durationSeconds > 0 ? (latestItem.progressSeconds / latestItem.durationSeconds) * 100 : 0;

                // Mark series as completed if (watchedEpisodes >= totalEpisodes) AND (last episode is completed).
                // Simplification: if watchedEpisodes.size >= totalEpisodes.
                if (totalEpisodes > 0 && watchedEpisodes.size >= totalEpisodes) {
                  // Check if the very last episode is actually finished? 
                  // Assume yes if it's in history as "completed".
                  // We'll trust the count.
                  isCompleted = true;
                }
              }

              // Client-side filtering based on computed status
              if (activeFilter === 'completed' && !isCompleted) return null;
              if (activeFilter === 'in-progress' && isCompleted) return null;

              return {
                id: contentId,
                title: displayTitle,
                poster: content.poster_path ? `https://image.tmdb.org/t/p/w500${content.poster_path}` : '/fallback-poster.svg',
                rating: content.vote_average,
                year: content.release_date ? new Date(content.release_date).getFullYear().toString() :
                  content.first_air_date ? new Date(content.first_air_date).getFullYear().toString() : '2024',
                genres: content.genres ? content.genres.map((g: any) => g.name) : ['Action', 'Sci-Fi'],
                progress: progressPercent,
                contentType: contentType,
                // Extra info
                seasonNumber: latestItem.seasonNumber,
                episodeNumber: latestItem.episodeNumber,
                episodeName: displayEpisodeName,
                isCompleted // Internal flag
              };
            }
          } catch (error) {
            console.error('Error fetching content details:', error);
          }
          return null;
        })
      );

      setEnrichedHistory(enriched.filter(Boolean));
    };

    enrichData();
  }, [historyData, activeFilter]);

  const filters: { id: FilterType; label: string; icon: any }[] = [
    { id: 'all', label: 'All', icon: History },
    { id: 'completed', label: 'Completed', icon: CheckCircle },
    { id: 'in-progress', label: 'In Progress', icon: PlayCircle }
  ];

  if (!user) {
    return (
      <div className="min-h-screen bg-[#050510] dark overflow-x-hidden flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600">Please sign in to view your watch history.</p>
        </div>
      </div>
    );
  }

  if (historyLoading) {
    return (
      <div className="min-h-screen bg-[#050510] dark overflow-x-hidden flex items-center justify-center">
        <div className="text-cyan-400">Loading history...</div>
      </div>
    );
  }

  if (historyError) {
    return (
      <div className="min-h-screen bg-[#050510] dark overflow-x-hidden flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading History</h1>
          <p className="text-gray-600">Failed to fetch watch history. Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050510] dark overflow-x-hidden">
      <StarfieldBackground />
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="mb-8">
            <h1 className="text-4xl text-cyan-100 mb-6 text-center md:text-left flex items-center gap-3 justify-center md:justify-start">
              <History className="w-10 h-10" />
              Watch History
            </h1>

            {/* Filter Tabs */}
            <div className="flex justify-center md:justify-start">
              <div className="flex items-center gap-2 p-2 rounded-2xl backdrop-blur-md bg-black/40 border border-cyan-500/30">
                {filters.map((filter) => {
                  const Icon = filter.icon;
                  const isActive = activeFilter === filter.id;

                  return (
                    <motion.button
                      key={filter.id}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setActiveFilter(filter.id)}
                      className="relative px-4 py-2 rounded-xl transition-all flex items-center gap-2"
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeFilter"
                          className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500"
                          style={{ boxShadow: '0 0 30px rgba(6, 182, 212, 0.6)' }}
                          transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-cyan-300'} transition-colors relative z-10`} />
                      <span className={`${isActive ? 'text-white' : 'text-cyan-100/80'} transition-colors text-sm font-medium relative z-10`}>
                        {filter.label}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* History Grid */}
          {enrichedHistory.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {enrichedHistory.map((item, index) => (
                <MovieCard
                  key={`${item.contentType}-${item.id}-${item.seasonNumber}-${item.episodeNumber}`}
                  movie={item}
                  index={index}
                  category={item.contentType === 'movie' ? 'movies' : 'series'}
                  enableWatchlistToggle={false}
                  showProgress={true}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <History className="w-16 h-16 text-cyan-400/50 mx-auto mb-4" />
              <h3 className="text-xl text-cyan-100 mb-2">No history found</h3>
              <p className="text-cyan-100/60">
                {activeFilter === 'all'
                  ? "You haven't watched anything yet."
                  : activeFilter === 'completed'
                    ? "You haven't completed any content yet."
                    : "You don't have any content in progress."
                }
              </p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
