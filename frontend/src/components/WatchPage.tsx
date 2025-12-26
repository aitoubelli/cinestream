import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, Volume2, VolumeX, Maximize, Settings, ChevronLeft, ChevronRight, SkipForward, SkipBack, Star, Plus, Share2, Eye, EyeOff, RotateCcw, RotateCw, Zap, Search, X } from 'lucide-react';
import { MovieCard } from './MovieCard';
import { VideoPlayer } from './VideoPlayer';
import useSWR, { mutate } from 'swr';
import { getApiUrl } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

interface WatchPageProps {
  contentId: number;
  contentType: 'movie' | 'series';
}

interface Season {
  season_number: number;
  name: string;
  episode_count: number;
}

interface Episode {
  id: number;
  name: string;
  still_path: string | null;
  runtime: number;
  episode_number: number;
}

const authenticatedFetcher = async (url: string, token: string) => {
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error('Failed to fetch data');
  return response.json();
};

export function WatchPage({ contentId, contentType }: WatchPageProps) {
  const [selectedEpisode, setSelectedEpisode] = useState(0);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [hasInitializedSeries, setHasInitializedSeries] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const [episodeSearch, setEpisodeSearch] = useState('');
  const [startPlaying, setStartPlaying] = useState(false);
  const [videoTime, setVideoTime] = useState(0);
  const { user, getIdToken } = useAuth();

  // Auto-resume for Series: fetching the absolute latest watched episode
  const { data: resumeData } = useSWR(
    user && contentType === 'series' && !hasInitializedSeries ? getApiUrl(`/api/user/watch-progress?contentId=${contentId}&contentType=tv`) : null,
    async (url: string) => {
      const token = await getIdToken();
      if (!token) return null;
      return authenticatedFetcher(url, token);
    },
    { revalidateOnFocus: false }
  );

  useEffect(() => {
    if (resumeData && contentType === 'series' && !hasInitializedSeries) {
      if (resumeData.seasonNumber && resumeData.episodeNumber) {
        console.log('Resuming Series at:', resumeData.seasonNumber, resumeData.episodeNumber);
        setSelectedSeason(resumeData.seasonNumber);
        // Episode number is 1-based, index is 0-based
        setSelectedEpisode(resumeData.episodeNumber - 1);
      }
      setHasInitializedSeries(true);
    } else if (contentType !== 'series') {
      setHasInitializedSeries(true);
    }
  }, [resumeData, contentType, hasInitializedSeries]);

  // Fetch saved progress from backend for the CURRENT selected episode
  // Only fetch if initialized (to avoid fetching S1E1 progress then immediately switching)
  const { data: progressData } = useSWR(
    user && hasInitializedSeries ? getApiUrl(`/api/user/watch-progress?contentId=${contentId}&contentType=${contentType === 'series' ? 'tv' : 'movie'}${contentType === 'series' ? `&seasonNumber=${selectedSeason}&episodeNumber=${selectedEpisode + 1}` : ''}`) : null,
    async (url: string) => {
      const token = await getIdToken();
      if (!token) return { progressSeconds: 0 };
      return authenticatedFetcher(url, token);
    },
    { revalidateOnFocus: false } // Prevent overwrite while watching
  );

  useEffect(() => {
    if (progressData) {
      // If we just resumed, we might get the same data
      console.log('Progress Loaded:', progressData.progressSeconds);
      setVideoTime(progressData.progressSeconds || 0);
    }
  }, [progressData, contentId, contentType, selectedSeason, selectedEpisode]); // Added dependencies to reset on episode change logic

  const lastSaveTimeRef = useRef(0);
  const saveProgress = useCallback(async (time: number, duration: number) => {
    if (!user) return;
    const now = Date.now();
    if (now - lastSaveTimeRef.current < 5000 && time < duration - 5) return; // Debounce 5s, unless near end

    lastSaveTimeRef.current = now;
    try {
      const token = await getIdToken();
      if (!token) return;

      await fetch(getApiUrl('/api/user/continue-watching'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          contentId,
          contentType: contentType === 'series' ? 'tv' : 'movie',
          ...(contentType === 'series' && {
            seasonNumber: selectedSeason,
            episodeNumber: selectedEpisode + 1
          }),
          progressSeconds: time,
          durationSeconds: duration
        })
      });
    } catch (error) {
      console.error('Failed to save progress', error);
    }
  }, [contentId, contentType, selectedSeason, selectedEpisode, user, getIdToken]);

  const handleTimeUpdate = useCallback((time: number, duration: number) => {
    if (Math.abs(time - videoTime) > 2) { // Only update state if diff > 2s to avoid stutter
      setVideoTime(time);
    }
    saveProgress(time, duration);
  }, [saveProgress, videoTime]);

  useEffect(() => {
    console.log('[WatchPage] startPlaying state changed:', startPlaying, 'selectedEpisode:', selectedEpisode);
  }, [startPlaying, selectedEpisode]);


  const fetcher = (url: string) => fetch(url).then((res) => res.json());

  // Fetch content details
  const { data: contentData, error: contentError, isLoading: contentLoading } = useSWR(
    getApiUrl(`/api/content/${contentType === 'movie' ? 'movies' : 'series'}/${contentId}`),
    fetcher
  );

  // Fetch episodes for series
  const { data: seasonData, error: seasonError, isLoading: seasonLoading } = useSWR(
    contentType === 'series' ? getApiUrl(`/api/content/tv/${contentId}/season/${selectedSeason}`) : null,
    fetcher
  );

  // Fetch similar content
  const { data: similarData } = useSWR(
    getApiUrl(`/api/content/similar?contentId=${contentId}&contentType=${contentType === 'movie' ? 'movie' : 'tv'}`),
    fetcher
  );

  if (contentLoading) {
    return <div className="min-h-screen bg-[#050510] flex items-center justify-center">Loading...</div>;
  }

  if (contentError || !contentData) {
    return <div className="min-h-screen bg-[#050510] flex items-center justify-center">Error loading content</div>;
  }

  const content = contentData;
  const title = contentType === 'movie' ? content.title : content.name;
  const overview = content.overview;
  const poster = content.poster_path ? `https://image.tmdb.org/t/p/w500${content.poster_path}` : 'https://via.placeholder.com/500x750?text=No+Image';
  const backdrop = content.backdrop_path ? `https://image.tmdb.org/t/p/original${content.backdrop_path}` : null;
  const rating = content.vote_average;
  const releaseYear = contentType === 'movie' ? new Date(content.release_date).getFullYear() : new Date(content.first_air_date).getFullYear();
  const runtime = contentType === 'movie' ? content.runtime : content.episode_run_time?.[0];

  const seasons: Season[] = contentType === 'series' ? (content.seasons?.filter((s: any) => s.season_number > 0) || []) : [];
  const episodes: Episode[] = seasonData?.episodes || [];
  const currentSeason = seasons.find(s => s.season_number === selectedSeason);
  const currentEpisode = episodes[selectedEpisode];

  const displayTitle = contentType === 'series' ? `S${selectedSeason.toString().padStart(2, '0')}E${(selectedEpisode + 1).toString().padStart(2, '0')} : ${currentEpisode?.name || ''}` : title;

  const handleEnded = useCallback(() => {
    console.log('[WatchPage] handleEnded called, autoPlay:', autoPlay, 'selectedEpisode:', selectedEpisode, 'episodes.length:', episodes.length);
    if (contentType === 'series' && autoPlay && selectedEpisode < episodes.length - 1) {
      console.log('[WatchPage] Auto-playing next episode');
      setStartPlaying(true);
      setSelectedEpisode(prev => prev + 1);
    }
  }, [contentType, autoPlay, selectedEpisode, episodes.length]);


  // Filter episodes based on search
  const filteredEpisodes = episodes.filter(episode =>
    episode.name.toLowerCase().includes(episodeSearch.toLowerCase()) ||
    episode.episode_number.toString().includes(episodeSearch)
  );

  // Bunny video URL
  const videoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

  // Determine poster for video player
  const videoPoster = contentType === 'series' && currentEpisode?.still_path
    ? `https://image.tmdb.org/t/p/w1280${currentEpisode.still_path}`
    : poster;



  const handleNextEpisode = () => {
    if (selectedEpisode < episodes.length - 1) {
      setSelectedEpisode(selectedEpisode + 1);
    }
  };

  const handlePrevEpisode = () => {
    if (selectedEpisode > 0) {
      setSelectedEpisode(selectedEpisode - 1);
    }
  };

  const similarContent = similarData?.results?.slice(0, 8).map((item: any) => ({
    id: item.id,
    title: item.title || item.name,
    poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : 'https://via.placeholder.com/500x750?text=No+Image',
    rating: item.vote_average,
    year: item.release_date ? item.release_date.substring(0, 4) : item.first_air_date ? item.first_air_date.substring(0, 4) : 'N/A',
    genres: item.genre_ids || [],
    contentType: item.media_type === 'movie' ? 'movie' : 'tv'
  })) || [];

  return (
    <div className={`min-h-screen pb-16 ${focusMode ? 'bg-black' : ''}`} style={{ paddingTop: focusMode ? '0' : '120px' }}>
      {/* Focus Mode Modal */}
      <AnimatePresence>
        {focusMode && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setFocusMode(false)}
              className="fixed inset-0 bg-black/90 backdrop-blur-md z-50"
            />

            {/* Modal */}
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', duration: 0.5 }}
                className="relative w-full max-w-7xl"
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
                    onClick={() => setFocusMode(false)}
                    className="absolute top-4 right-4 z-10 p-3 rounded-full bg-black/80 border border-cyan-500/30 hover:border-cyan-400/60 transition-all"
                    style={{ boxShadow: '0 0 20px rgba(6, 182, 212, 0.3)' }}
                  >
                    <X className="w-6 h-6 text-cyan-300" />
                  </motion.button>

                  {/* Video Container */}
                  <div className="relative">
                    <VideoPlayer key={`${contentType}-${contentId}-${selectedSeason}-${selectedEpisode}`} src={videoUrl} poster={videoPoster} contentId={contentId} contentType={contentType} selectedSeason={selectedSeason} selectedEpisode={selectedEpisode} initialTime={videoTime} onTimeUpdate={handleTimeUpdate} startPlaying={startPlaying} onEnded={handleEnded} onStartedPlaying={() => setStartPlaying(false)} title={displayTitle} overview={overview} rating={rating} year={releaseYear} runtime={runtime} />
                  </div>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Video Player & Episodes Sidebar */}
      {!focusMode && (
        <div className="w-full bg-black">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
            <div className="grid lg:grid-cols-[2fr_1fr] gap-6">
              {/* Player Column */}
              <div className="flex flex-col gap-4 min-w-0">
                <VideoPlayer key={`${contentType}-${contentId}-${selectedSeason}-${selectedEpisode}`} src={videoUrl} poster={videoPoster} contentId={contentId} contentType={contentType} selectedSeason={selectedSeason} selectedEpisode={selectedEpisode} initialTime={videoTime} onTimeUpdate={handleTimeUpdate} startPlaying={startPlaying} onEnded={handleEnded} onStartedPlaying={() => setStartPlaying(false)} title={displayTitle} overview={overview} rating={rating} year={releaseYear} runtime={runtime} />

                {/* Player Controls Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-black/40 backdrop-blur-sm border border-cyan-500/20 rounded-xl p-4 gap-4 shadow-xl">
                  <div className="flex flex-wrap items-center gap-4">
                    {/* Episode Navigation */}
                    {contentType === 'series' && (
                      <>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handlePrevEpisode}
                          disabled={selectedEpisode === 0}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 hover:border-cyan-400/60 text-cyan-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span>Previous</span>
                        </motion.button>

                        <div className="text-cyan-100 text-sm">
                          Episode {selectedEpisode + 1} of {episodes.length}
                        </div>

                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleNextEpisode}
                          disabled={selectedEpisode === episodes.length - 1}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 hover:border-cyan-400/60 text-cyan-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                          <span>Next</span>
                          <RotateCw className="w-4 h-4" />
                        </motion.button>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Auto Play Toggle */}
                    {contentType === 'series' && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setAutoPlay(!autoPlay)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${autoPlay
                          ? 'bg-violet-500/20 border-violet-500/50 text-violet-300'
                          : 'bg-black/60 border-cyan-500/30 hover:border-cyan-400/60 text-cyan-100'
                          }`}
                      >
                        <Zap className={`w-4 h-4 ${autoPlay ? 'text-violet-400' : ''}`} />
                        <span>Auto Play</span>
                      </motion.button>
                    )}

                    {/* Focus Mode Toggle */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setFocusMode(!focusMode)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${focusMode
                        ? 'bg-violet-500/20 border-violet-500/50 text-violet-300'
                        : 'bg-black/60 border-cyan-500/30 hover:border-cyan-400/60 text-cyan-100'
                        }`}
                    >
                      {focusMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      <span>Focus Mode</span>
                    </motion.button>
                  </div>
                </div>
              </div>

              {/* Right Sidebar */}
              {contentType === 'series' ? (
                /* Episodes Sidebar for Series */
                <div className="hidden lg:block relative min-w-0">
                  <div
                    className="absolute inset-0 p-6 rounded-xl bg-black/40 backdrop-blur-sm border border-cyan-500/20 flex flex-col shadow-2xl"
                    style={{ boxShadow: '0 0 30px rgba(6, 182, 212, 0.15)' }}
                  >
                    <h3 className="text-xl text-cyan-100 mb-4 flex items-center gap-2">
                      <div className="w-1.5 h-6 bg-cyan-500 rounded-full" />
                      Episodes
                    </h3>

                    {/* Episode Search */}
                    <div className="relative mb-4">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-cyan-400" />
                      <input
                        type="text"
                        placeholder="Search episodes..."
                        value={episodeSearch}
                        onChange={(e) => setEpisodeSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg bg-black/60 border border-cyan-500/30 text-cyan-100 placeholder-cyan-100/50 focus:outline-none focus:border-cyan-400/60"
                      />
                    </div>

                    {/* Season Selector */}
                    <select
                      value={selectedSeason}
                      onChange={(e) => {
                        setSelectedSeason(Number(e.target.value));
                        setSelectedEpisode(0);
                      }}
                      className="w-full px-4 py-2 mb-4 rounded-lg bg-black/60 border border-cyan-500/30 text-cyan-100 focus:outline-none focus:border-cyan-400/60 cursor-pointer"
                    >
                      {seasons.map((season: Season) => (
                        <option key={season.season_number} value={season.season_number}>
                          Season {season.season_number}
                        </option>
                      ))}
                    </select>

                    {/* Episode List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 -mr-2 space-y-2">
                      {filteredEpisodes.map((episode: Episode) => {
                        const originalIndex = episodes.indexOf(episode);
                        return (
                          <motion.button
                            key={episode.id}
                            whileHover={{ scale: 1.02 }}
                            onClick={() => setSelectedEpisode(originalIndex)}
                            className={`w-full text-left p-3 rounded-lg transition-all ${selectedEpisode === originalIndex
                              ? 'bg-gradient-to-r from-cyan-500/20 to-violet-500/20 border border-cyan-400/60'
                              : 'bg-black/40 border border-cyan-500/20 hover:border-cyan-400/40'
                              }`}
                          >
                            <div className="flex gap-3">
                              <img
                                src={episode.still_path ? `https://image.tmdb.org/t/p/w300${episode.still_path}` : 'https://via.placeholder.com/300x169?text=No+Image'}
                                alt={episode.name}
                                className="w-16 h-10 object-cover rounded"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-cyan-100 text-sm mb-1 truncate">
                                  {episode.episode_number}. {episode.name}
                                </p>
                                <p className="text-cyan-100/60 text-xs">{episode.runtime ? `${episode.runtime} min` : 'N/A'}</p>
                              </div>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                /* Movie Sidebar */
                <div className="hidden lg:block relative min-w-0">
                  <div
                    className="absolute inset-0 p-6 rounded-xl bg-black/40 backdrop-blur-sm border border-cyan-500/20 flex flex-col shadow-2xl"
                    style={{ boxShadow: '0 0 30px rgba(6, 182, 212, 0.15)' }}
                  >
                    {/* Movie Quote */}
                    <div className="mb-6">
                      <div className="text-center">
                        <blockquote className="text-lg font-bold text-cyan-400 italic">
                          "{content.tagline || 'Every story has a beginning...'}"
                        </blockquote>
                      </div>
                    </div>

                    {/* Cast Preview */}
                    <div className="flex-1">
                      <h3 className="text-xl text-cyan-100 mb-4 flex items-center gap-2">
                        <div className="w-1.5 h-6 bg-cyan-500 rounded-full" />
                        Cast Preview
                      </h3>
                      <div className="space-y-3">
                        {content.credits?.cast?.slice(0, 5).map((actor: any) => (
                          <div key={actor.id} className="flex items-center gap-4 p-3 rounded-lg bg-black/40 hover:bg-black/60 transition-colors">
                            <img
                              src={actor.profile_path ? `https://image.tmdb.org/t/p/w92${actor.profile_path}` : 'https://via.placeholder.com/92x138?text=No+Image'}
                              alt={actor.name}
                              className="w-12 h-12 object-cover rounded-lg border border-cyan-500/20"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-cyan-100 text-base font-medium truncate">{actor.name}</p>
                              <p className="text-cyan-100/70 text-sm truncate">{actor.character}</p>
                            </div>
                          </div>
                        )) || <span className="text-cyan-100/60 text-sm">No cast information available</span>}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Content Below Player */}
      {!focusMode && (
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
          {/* Title Above Poster */}
          <h1 className="text-4xl text-cyan-100 mb-6 text-center md:text-left">
            {contentType === 'series' ? `${title} - S${selectedSeason.toString().padStart(2, '0')}E${(selectedEpisode + 1).toString().padStart(2, '0')} ${currentEpisode?.name || ''}` : title}
          </h1>

          {/* Unified Content Card */}
          <div className="relative mb-8 group/card">
            {/* Glow Effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-violet-600/20 rounded-3xl blur-xl opacity-40" />
            <div className="absolute -inset-2 bg-gradient-to-r from-cyan-500/10 to-violet-600/10 rounded-3xl blur-2xl opacity-30" />
            <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500/5 to-violet-600/5 rounded-3xl blur-3xl opacity-20 group-hover/card:opacity-80 transition duration-1000" />

            <div
              className="relative p-8 rounded-3xl bg-black/40 backdrop-blur-sm border border-cyan-500/20"
              style={{ boxShadow: '0 0 30px rgba(6, 182, 212, 0.15), 0 0 60px rgba(139, 92, 246, 0.08), 0 20px 40px -12px rgba(0, 0, 0, 0.4)' }}
            >
              <div className="flex flex-col lg:flex-row gap-8">
                {/* Poster */}
                <div className="flex-shrink-0 mx-auto lg:mx-0">
                  <img
                    src={poster}
                    alt={`${title} poster`}
                    className="w-48 h-72 object-cover rounded-2xl border border-cyan-500/20 shadow-2xl transition-transform duration-300 hover:scale-105"
                    style={{ boxShadow: '0 0 40px rgba(6, 182, 212, 0.3), 0 0 80px rgba(139, 92, 246, 0.2)' }}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 space-y-6">
                  {/* Overview */}
                  <div>
                    <h3 className="text-xl text-cyan-100 mb-3">Overview</h3>
                    <p className="text-cyan-100/80 leading-relaxed">
                      {overview}
                    </p>
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-cyan-100/60 text-sm">Genres:</span>
                        <div className="flex flex-wrap gap-2">
                          {content.genres?.slice(0, 3).map((genre: any) => (
                            <span key={genre.id} className="px-2 py-1 text-xs rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
                              {genre.name}
                            </span>
                          )) || <span className="text-cyan-100/60 text-sm">N/A</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-cyan-100/60 text-sm">Country:</span>
                        <span className="text-cyan-100">{content.production_countries?.[0]?.name || 'N/A'}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-cyan-100/60 text-sm">Studios:</span>
                        <span className="text-cyan-100">{content.production_companies?.[0]?.name || 'N/A'}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-cyan-100/60 text-sm">Broadcast Date:</span>
                        <span className="text-cyan-100">
                          {contentType === 'movie' ? (content.release_date ? new Date(content.release_date).toLocaleDateString() : 'N/A') : (content.first_air_date ? new Date(content.first_air_date).toLocaleDateString() : 'N/A')}
                        </span>
                      </div>

                      {contentType === 'movie' && (
                        <div className="flex items-center gap-2">
                          <span className="text-cyan-100/60 text-sm">Budget:</span>
                          <span className="text-cyan-100">
                            {content.budget ? `$${(content.budget / 1000000).toFixed(1)}M` : 'N/A'}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-cyan-100/60 text-sm">Director:</span>
                        <span className="text-cyan-100">
                          {content.credits?.crew?.find((c: any) => c.job === 'Director')?.name || 'N/A'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-cyan-100/60 text-sm">Streaming Platform:</span>
                        <span className="text-cyan-100">
                          {contentType === 'series' ? (content.networks?.[0]?.name || 'N/A') : 'N/A'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-cyan-100/60 text-sm">Runtime:</span>
                        <span className="text-cyan-100">
                          {contentType === 'movie' ? `${content.runtime} min` : `${content.episode_run_time?.[0] || 'N/A'} min`}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-cyan-100/60 text-sm">Rating:</span>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                          <span className="text-yellow-100">{rating?.toFixed(1)}/10</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>


          {/* Action Buttons */}
          <div className="flex gap-3 mb-8">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-6 py-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 hover:border-cyan-400/60 text-cyan-300 flex items-center gap-2 transition-all"
            >
              <Plus className="w-5 h-5" />
              My List
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-6 py-2.5 rounded-lg bg-violet-500/10 border border-violet-500/30 hover:border-violet-400/60 text-violet-300 flex items-center gap-2 transition-all"
            >
              <Share2 className="w-5 h-5" />
              Share
            </motion.button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content Info */}
            <div className="lg:col-span-3">
              {/* Similar Content */}
              <div>
                <h3 className="text-2xl text-cyan-100 mb-6">You May Also Like</h3>
                {similarContent.length > 0 ? (
                  <div className={`grid gap-4 px-2 grid-cols-2 md:grid-cols-4 lg:grid-cols-4`}>
                    {similarContent.map((item: any, index: number) => (
                      <MovieCard key={item.id} movie={item} index={index} />
                    ))}
                  </div>
                ) : (
                  <p className="text-cyan-100/60">No similar content found</p>
                )}
              </div>
            </div>

            {/* Episodes Sidebar (for series/anime) - Hidden for series since it's now next to player */}
            {contentType !== 'movie' && contentType !== 'series' && (
              <div>
                <div
                  className="p-6 rounded-xl bg-black/40 backdrop-blur-sm border border-cyan-500/20 sticky top-24"
                  style={{ boxShadow: '0 0 30px rgba(6, 182, 212, 0.15)' }}
                >
                  <h3 className="text-xl text-cyan-100 mb-4">Episodes</h3>

                  {/* Episode Search */}
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-cyan-400" />
                    <input
                      type="text"
                      placeholder="Search episodes..."
                      value={episodeSearch}
                      onChange={(e) => setEpisodeSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 rounded-lg bg-black/60 border border-cyan-500/30 text-cyan-100 placeholder-cyan-100/50 focus:outline-none focus:border-cyan-400/60"
                    />
                  </div>

                  {/* Season Selector */}
                  <select
                    value={selectedSeason}
                    onChange={(e) => {
                      setSelectedSeason(Number(e.target.value));
                      setSelectedEpisode(0);
                    }}
                    className="w-full px-4 py-2 mb-4 rounded-lg bg-black/60 border border-cyan-500/30 text-cyan-100 focus:outline-none focus:border-cyan-400/60 cursor-pointer"
                  >
                    {seasons.map((season: Season) => (
                      <option key={season.season_number} value={season.season_number}>
                        Season {season.season_number}
                      </option>
                    ))}
                  </select>

                  {/* Episode List */}
                  <div className="space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar">
                    {filteredEpisodes.map((episode: Episode) => {
                      const originalIndex = episodes.indexOf(episode);
                      return (
                        <motion.button
                          key={episode.id}
                          whileHover={{ scale: 1.02 }}
                          onClick={() => setSelectedEpisode(originalIndex)}
                          className={`w-full text-left p-3 rounded-lg transition-all ${selectedEpisode === originalIndex
                            ? 'bg-gradient-to-r from-cyan-500/20 to-violet-500/20 border border-cyan-400/60'
                            : 'bg-black/40 border border-cyan-500/20 hover:border-cyan-400/40'
                            }`}
                        >
                          <div className="flex gap-3">
                            <img
                              src={episode.still_path ? `https://image.tmdb.org/t/p/w300${episode.still_path}` : 'https://via.placeholder.com/300x169?text=No+Image'}
                              alt={episode.name}
                              className="w-24 h-14 object-cover rounded"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-cyan-100 text-sm mb-1 truncate">
                                {episode.episode_number}. {episode.name}
                              </p>
                              <p className="text-cyan-100/60 text-xs">{episode.runtime ? `${episode.runtime} min` : 'N/A'}</p>
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
