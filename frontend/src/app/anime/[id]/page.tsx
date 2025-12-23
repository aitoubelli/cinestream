"use client";

import { useState } from "react";
import useSWR from "swr";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Play, Plus, Share2, Star, Clock, Calendar, ThumbsUp, ArrowLeft } from "lucide-react";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { MovieCard } from "@/components/MovieCard";
import { TrailerModal } from "@/components/TrailerModal";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CommentsSection } from "@/components/CommentsSection";
import { RatingSection } from "@/components/RatingSection";
import { useAuth } from "@/context/AuthContext";
import { getAvatarUrl, getApiUrl } from "@/lib/utils";
import { toast } from "sonner";
import { use } from "react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

interface Genre {
  id: number;
  name: string;
}

interface Anime {
  id: number;
  name: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  overview: string;
  vote_average: number;
  vote_count: number;
  episode_run_time: number[];
  number_of_seasons: number;
  number_of_episodes: number;
  genres: Genre[];
  credits: {
    cast: CastMember[];
  };
  production_companies?: Array<{
    id: number;
    name: string;
  }>;
}

export default function AnimeDetail({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [isTrailerOpen, setIsTrailerOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'top'>('newest');
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set());
  const { user, profileData } = useAuth();

  const { data, error, isLoading } = useSWR(
    getApiUrl(`/api/movies/${resolvedParams.id}?type=anime`),
    fetcher,
  );



  // Authenticated fetcher for watchlist
  const authenticatedFetcher = async (url: string, user: any) => {
    const idToken = await user.getIdToken();
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${idToken}`,
      },
    });
    if (!response.ok) throw new Error('Failed to fetch watchlist');
    return response.json();
  };

  // Fetch watchlist if user is authenticated
  const { data: watchlistData, mutate: mutateWatchlist } = useSWR(
    user ? getApiUrl('/api/watchlist') : null,
    (url: string) => authenticatedFetcher(url, user)
  );

  // Fetch comments
  const { data: commentsData, mutate: mutateComments } = useSWR(
    getApiUrl(`/api/comments/${resolvedParams.id}?contentType=anime&sortBy=${sortBy}`),
    fetcher,
  );

  const isInWatchlist = watchlistData?.movieIds?.includes(parseInt(resolvedParams.id)) ?? false;

  const toggleWatchlist = async () => {
    if (!user) {
      toast.error('You must be logged in to use this functionality');
      return;
    }

    const previousWatchlist = watchlistData;
    const newIsInWatchlist = !isInWatchlist;

    // Optimistic update
    mutateWatchlist(
      {
        movieIds: newIsInWatchlist
          ? [...(watchlistData?.movieIds || []), parseInt(resolvedParams.id)]
          : (watchlistData?.movieIds || []).filter((id: number) => id !== parseInt(resolvedParams.id))
      },
      false
    );

    try {
      const idToken = await user.getIdToken();
      const response = await fetch(
        newIsInWatchlist ? getApiUrl('/api/watchlist') : getApiUrl(`/api/watchlist/${resolvedParams.id}`),
        {
          method: newIsInWatchlist ? 'POST' : 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`,
          },
          body: newIsInWatchlist ? JSON.stringify({ movieId: parseInt(resolvedParams.id) }) : undefined,
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update watchlist');
      }

      toast.success(
        newIsInWatchlist
          ? 'Added to watchlist'
          : 'Removed from watchlist'
      );
    } catch (error) {
      // Revert optimistic update on error
      mutateWatchlist(previousWatchlist, false);
      toast.error('Failed to update watchlist. Please try again.');
    }
  };

  const handleSortChange = (sort: 'newest' | 'top') => {
    setSortBy(sort);
  };

  const handleCommentTextChange = (text: string) => {
    setCommentText(text);
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('You must be logged in to post comments');
      return;
    }

    if (!commentText.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }

    try {
      const idToken = await user.getIdToken();
      const response = await fetch(getApiUrl('/api/comments'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          contentId: parseInt(resolvedParams.id),
          contentType: 'anime',
          text: commentText.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to post comment');
      }

      setCommentText('');
      mutateComments();
      toast.success('Comment posted successfully');
    } catch (error) {
      toast.error('Failed to post comment. Please try again.');
    }
  };

  const handleToggleReply = (commentId: number) => {
    setReplyingTo(replyingTo === commentId ? null : commentId);
  };

  const handleReplyTextChange = (text: string) => {
    setReplyText(text);
  };

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('You must be logged in to reply');
      return;
    }

    if (!replyText.trim()) {
      toast.error('Reply cannot be empty');
      return;
    }

    try {
      const idToken = await user.getIdToken();
      const response = await fetch(getApiUrl('/api/comments/reply'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          commentId: replyingTo,
          text: replyText.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to post reply');
      }

      setReplyText('');
      setReplyingTo(null);
      mutateComments();
      toast.success('Reply posted successfully');
    } catch (error) {
      toast.error('Failed to post reply. Please try again.');
    }
  };

  const handleToggleReplies = (commentId: number) => {
    const newExpanded = new Set(expandedComments);
    if (newExpanded.has(commentId)) {
      newExpanded.delete(commentId);
    } else {
      newExpanded.add(commentId);
    }
    setExpandedComments(newExpanded);
  };

  const handleLikeComment = async (commentId: number) => {
    if (!user) {
      toast.error('You must be logged in to like comments');
      return;
    }

    try {
      const idToken = await user.getIdToken();
      const response = await fetch(getApiUrl(`/api/comments/${commentId}/like`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to like comment');
      }

      mutateComments();
    } catch (error) {
      toast.error('Failed to like comment. Please try again.');
    }
  };

  const handleLikeReply = async (replyId: number) => {
    if (!user) {
      toast.error('You must be logged in to like replies');
      return;
    }

    try {
      const idToken = await user.getIdToken();
      const response = await fetch(getApiUrl(`/api/comments/reply/${replyId}/like`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to like reply');
      }

      mutateComments();
    } catch (error) {
      toast.error('Failed to like reply. Please try again.');
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-[#050510]">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <Link
              href="/"
              className="group inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-black/60 backdrop-blur-md border border-cyan-500/30 hover:border-cyan-400/60 transition-all text-cyan-100 hover:text-cyan-300"
              style={{ boxShadow: '0 0 40px rgba(6, 182, 212, 0.3)' }}
            >
              <ArrowLeft className="w-5 h-5 text-cyan-300 group-hover:-translate-x-1 transition-transform duration-300" />
              <span className="font-medium">Back to Home</span>
            </Link>
          </motion.div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-400 mb-4">
              Error Loading Anime
            </h1>
            <p className="text-cyan-100/60">
              Failed to fetch anime details. Please try again later.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050510]">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <Link
              href="/"
              className="group inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-black/60 backdrop-blur-md border border-cyan-500/30 hover:border-cyan-400/60 transition-all text-cyan-100 hover:text-cyan-300"
              style={{ boxShadow: '0 0 40px rgba(6, 182, 212, 0.3)' }}
            >
              <ArrowLeft className="w-5 h-5 text-cyan-300 group-hover:-translate-x-1 transition-transform duration-300" />
              <span className="font-medium">Back to Home</span>
            </Link>
          </motion.div>
          <div className="animate-pulse">
            <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-8 mb-16">
              <div className="w-full aspect-[2/3] bg-gray-700 rounded-2xl"></div>
              <div className="space-y-8">
                <div className="space-y-4">
                  <div className="h-12 bg-gray-700 rounded w-3/4"></div>
                  <div className="h-6 bg-gray-700 rounded w-1/4"></div>
                  <div className="h-4 bg-gray-700 rounded"></div>
                  <div className="h-4 bg-gray-700 rounded w-5/6"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const anime: Anime & { videos?: { results: Array<{ id: string; key: string; name: string; site: string; type: string }> } } = data?.data;

  // Find the first YouTube trailer
  const trailer = anime?.videos?.results?.find(video =>
    video.site === 'YouTube' && video.type === 'Trailer'
  );

  if (!anime) {
    return (
      <div className="min-h-screen bg-[#050510]">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <Link
              href="/"
              className="group inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-black/60 backdrop-blur-md border border-cyan-500/30 hover:border-cyan-400/60 transition-all text-cyan-100 hover:text-cyan-300"
              style={{ boxShadow: '0 0 40px rgba(6, 182, 212, 0.3)' }}
            >
              <ArrowLeft className="w-5 h-5 text-cyan-300 group-hover:-translate-x-1 transition-transform duration-300" />
              <span className="font-medium">Back to Home</span>
            </Link>
          </motion.div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-400 mb-4">
              Anime Not Found
            </h1>
            <p className="text-cyan-100/60">
              The anime you're looking for doesn't exist.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const topCast = anime.credits?.cast?.slice(0, 6) || [];

  const transformedComments = commentsData?.comments?.map((comment: any) => ({
    id: comment._id,
    author: comment.userName || 'Anonymous',
    avatar: comment.userAvatar !== undefined ? getAvatarUrl(comment.userAvatar) : 'https://via.placeholder.com/150x150?text=' + (comment.userName?.charAt(0)?.toUpperCase() || 'U'),
    text: comment.text,
    timestamp: new Date(comment.createdAt).toLocaleDateString(),
    createdAt: new Date(comment.createdAt),
    likes: comment.likes?.length || 0,
    likedByCurrentUser: user ? comment.likes?.includes(user.uid) : false,
    replies: comment.replies?.map((reply: any) => ({
      id: reply._id,
      author: reply.userName || 'Anonymous',
      avatar: reply.userAvatar !== undefined ? getAvatarUrl(reply.userAvatar) : 'https://via.placeholder.com/150x150?text=' + (reply.userName?.charAt(0)?.toUpperCase() || 'U'),
      text: reply.text,
      timestamp: new Date(reply.createdAt).toLocaleDateString(),
      likes: reply.likes?.length || 0,
      likedByCurrentUser: user ? reply.likes?.includes(user.uid) : false,
    })) || [],
  })) || [];

  return (
    <div className="min-h-screen bg-[#050510]">
      <Navbar />
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12" style={{ paddingTop: '120px' }}>


        {/* Hero Section - Two Column Layout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-8 mb-16"
        >
          {/* Left: Poster */}
          <div className="relative">
            <div className="sticky top-24">
              <div className="relative">
                <div className="absolute inset-0 blur-3xl bg-gradient-to-br from-cyan-400/30 to-violet-400/30" />
                <ImageWithFallback
                  src={anime.poster_path && anime.poster_path.startsWith('http')
                    ? anime.poster_path
                    : (anime.poster_path ? `https://image.tmdb.org/t/p/w500${anime.poster_path}` : 'https://via.placeholder.com/500x750?text=No+Image')}
                  alt={anime.name}
                  className="relative w-full aspect-[2/3] object-cover rounded-2xl border-2 border-cyan-500/30"
                  style={{ boxShadow: '0 0 60px rgba(6, 182, 212, 0.4)' }}
                />
              </div>

              {/* Action Buttons */}
              <div className="mt-6 space-y-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={async () => {
                    if (user) {
                      try {
                        const idToken = await user.getIdToken();
                        const response = await fetch(getApiUrl('/api/continue-watching'), {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${idToken}`,
                          },
                          body: JSON.stringify({ contentId: resolvedParams.id, contentType: 'anime' }),
                        });

                        if (!response.ok) {
                          throw new Error('Failed to add to continue watching');
                        }

                        toast.success('Anime added to continue watching');
                      } catch (error) {
                        toast.error('Failed to start watching. Please try again.');
                      }
                    }
                  }}
                  className="w-full group relative px-6 py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 overflow-hidden"
                  style={{ boxShadow: '0 0 40px rgba(6, 182, 212, 0.5)' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-violet-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative flex items-center justify-center gap-2 text-white">
                    <Play className="w-5 h-5 fill-white" />
                    <span>Watch Now</span>
                  </div>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setIsTrailerOpen(true)}
                  className="w-full px-4 py-3 rounded-xl bg-black/60 backdrop-blur-sm border border-violet-500/30 hover:border-violet-400/60 transition-all text-violet-100 flex items-center justify-center gap-2"
                >
                  <Play className="w-5 h-5" />
                  <span>Watch Trailer</span>
                </motion.button>

                <div className="grid grid-cols-2 gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={toggleWatchlist}
                    className={`px-4 py-3 rounded-xl backdrop-blur-sm border transition-all flex items-center justify-center gap-2 ${
                      isInWatchlist
                        ? 'bg-red-500/20 border-red-500/50 hover:border-red-400/70 text-red-100'
                        : 'bg-black/60 border-cyan-500/30 hover:border-cyan-400/60 text-cyan-100'
                    }`}
                  >
                    <Plus className={`w-5 h-5 ${isInWatchlist ? 'rotate-45' : ''} transition-transform duration-200`} />
                    <span>{isInWatchlist ? 'In List' : 'My List'}</span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-4 py-3 rounded-xl bg-black/60 backdrop-blur-sm border border-violet-500/30 hover:border-violet-400/60 transition-all text-violet-100 flex items-center justify-center gap-2"
                  >
                    <Share2 className="w-5 h-5" />
                    <span>Share</span>
                  </motion.button>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Anime Info */}
          <div className="space-y-8">
            {/* Title and Meta */}
            <div>
              <h1 className="text-4xl md:text-5xl mb-2 bg-gradient-to-r from-cyan-200 via-white to-violet-200 bg-clip-text text-transparent">
                {anime.name}
              </h1>
              <p className="text-lg text-cyan-100/60 mb-4">
                {new Date(anime.first_air_date).getFullYear()}
              </p>

              {/* Rating */}
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-black/60 backdrop-blur-sm border border-yellow-500/30">
                  <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  <span className="text-yellow-100">{anime.vote_average.toFixed(1)}</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-black/60 backdrop-blur-sm border border-cyan-500/20">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  <span className="text-cyan-100 text-sm">{anime.episode_run_time?.[0] ? `${anime.episode_run_time[0]} min` : 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-black/60 backdrop-blur-sm border border-violet-500/20">
                  <Calendar className="w-4 h-4 text-violet-400" />
                  <span className="text-violet-200 text-sm">{new Date(anime.first_air_date).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Genres */}
              <div className="flex flex-wrap gap-2 mb-6">
                {anime.genres.map((genre) => (
                  <span
                    key={genre.id}
                    className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500/20 to-violet-500/20 border border-cyan-500/30 text-cyan-200 text-sm backdrop-blur-sm"
                  >
                    {genre.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Overview */}
            <div>
              <h2 className="text-2xl mb-4 bg-gradient-to-r from-cyan-300 to-violet-300 bg-clip-text text-transparent">
                Overview
              </h2>
              <p className="text-lg text-cyan-100/80 leading-relaxed">
                {anime.overview}
              </p>
            </div>

            {/* Production Info */}
            {anime.production_companies && anime.production_companies.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-black/40 backdrop-blur-sm border border-cyan-500/20">
                  <p className="text-cyan-100/60 text-sm mb-1">Studio</p>
                  <p className="text-cyan-100">{anime.production_companies[0].name}</p>
                </div>
                <div className="p-4 rounded-xl bg-black/40 backdrop-blur-sm border border-cyan-500/20">
                  <p className="text-cyan-100/60 text-sm mb-1">Seasons</p>
                  <p className="text-cyan-100">{anime.number_of_seasons}</p>
                </div>
                <div className="p-4 rounded-xl bg-black/40 backdrop-blur-sm border border-cyan-500/20">
                  <p className="text-cyan-100/60 text-sm mb-1">Episodes</p>
                  <p className="text-cyan-100">{anime.number_of_episodes}</p>
                </div>
              </div>
            )}

            {/* Top Cast */}
            {topCast.length > 0 && (
              <div>
                <h2 className="text-2xl mb-6 bg-gradient-to-r from-cyan-300 to-violet-300 bg-clip-text text-transparent">
                  Top Cast
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  {topCast.map((actor) => (
                    <motion.div
                      key={actor.id}
                      whileHover={{ scale: 1.02 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-black/40 backdrop-blur-sm border border-cyan-500/20 hover:border-cyan-400/40 transition-all cursor-pointer"
                    >
                      <div className="relative flex-shrink-0">
                        <ImageWithFallback
                          src={actor.profile_path ? `https://image.tmdb.org/t/p/w185${actor.profile_path}` : 'https://via.placeholder.com/150x150?text=No+Image'}
                          alt={actor.name}
                          className="w-12 h-12 rounded-full object-cover border border-cyan-500/30"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-cyan-100 truncate">{actor.name}</p>
                        <p className="text-cyan-100/60 text-sm truncate">{actor.character}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>



        {/* Rating Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-16 pt-8"
        >
          <RatingSection
            contentId={parseInt(resolvedParams.id)}
            contentType="anime"
          />
        </motion.section>

        {/* Comments Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-16"
        >
          <CommentsSection
            comments={transformedComments}
            sortBy={sortBy}
            onSortChange={handleSortChange}
            commentText={commentText}
            onCommentTextChange={handleCommentTextChange}
            onSubmitComment={handleSubmitComment}
            replyingTo={replyingTo}
            replyText={replyText}
            onReplyTextChange={handleReplyTextChange}
            onSubmitReply={handleSubmitReply}
            onToggleReply={handleToggleReply}
            expandedComments={expandedComments}
            onToggleReplies={handleToggleReplies}
            onLikeComment={handleLikeComment}
            onLikeReply={handleLikeReply}
          />
        </motion.section>
      </div>

      {/* Trailer Modal */}
      <TrailerModal
        isOpen={isTrailerOpen}
        onClose={() => setIsTrailerOpen(false)}
        trailer={trailer}
        movieTitle={anime.name}
      />
      <Footer />
    </div>
  );
}
