import { motion, AnimatePresence } from 'motion/react';
import { ThumbsUp, MessageCircle, Send, ChevronDown, Crown, Trophy, Medal, Edit } from 'lucide-react';
import { ImageWithFallback } from './ImageWithFallback';
import { toast } from 'sonner';
import { getAvatarUrl, formatRelativeTime } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

interface Reply {
  id: number;
  author: string;
  avatar: string;
  text: string;
  timestamp: string;
  likes: number;
  likedByCurrentUser: boolean;
  isEdited?: boolean;
}

interface Comment {
  id: number;
  author: string;
  avatar: string;
  text: string;
  timestamp: string;
  createdAt: Date;
  editedAt?: Date;
  likes: number;
  likedByCurrentUser: boolean;
  isEdited?: boolean;
  replies: Reply[];
}

interface CommentsSectionProps {
  comments: Comment[];
  sortBy: 'newest' | 'top';
  onSortChange: (sort: 'newest' | 'top') => void;
  commentText: string;
  onCommentTextChange: (text: string) => void;
  onSubmitComment: (e: React.FormEvent) => void;
  replyingTo: number | null;
  replyText: string;
  onReplyTextChange: (text: string) => void;
  onSubmitReply: (e: React.FormEvent) => void;
  onToggleReply: (commentId: number) => void;
  expandedComments: Set<number>;
  onToggleReplies: (commentId: number) => void;
  onLikeComment: (commentId: number) => void;
  onLikeReply: (replyId: number) => void;
  editingComment: string | null;
  editText: string;
  onEditTextChange: (text: string) => void;
  onSubmitEdit: (commentId: string) => void;
  onToggleEdit: (commentId: string, currentText: string) => void;
  userAvatar?: string;
  onOpenLoginModal?: () => void;
}

export function CommentsSection({
  comments,
  sortBy,
  onSortChange,
  commentText,
  onCommentTextChange,
  onSubmitComment,
  replyingTo,
  replyText,
  onReplyTextChange,
  onSubmitReply,
  onToggleReply,
  expandedComments,
  onToggleReplies,
  onLikeComment,
  onLikeReply,
  editingComment,
  editText,
  onEditTextChange,
  onSubmitEdit,
  onToggleEdit,
  userAvatar,
  onOpenLoginModal,
}: CommentsSectionProps) {
  const { profileData, user } = useAuth();
  // Calculate badge rankings based on creation date (earliest first)
  const getBadgeRank = (commentId: number): number | null => {
    const earliestComments = [...comments]
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .slice(0, 3)
      .map(c => c.id);

    const rankIndex = earliestComments.indexOf(commentId);
    return rankIndex >= 0 ? rankIndex + 1 : null;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-3xl bg-gradient-to-r from-cyan-300 to-violet-300 bg-clip-text text-transparent">
          Comments ({comments.length})
        </h2>

        {/* Sort Dropdown */}
        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as 'newest' | 'top')}
            className="px-4 py-2 rounded-lg bg-black/60 backdrop-blur-sm border border-cyan-500/30 text-cyan-100 focus:outline-none focus:border-cyan-400/60 cursor-pointer appearance-none pr-10"
            style={{ boxShadow: '0 0 20px rgba(6, 182, 212, 0.2)' }}
          >
            <option value="newest">Newest First</option>
            <option value="top">Top Comments</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400 pointer-events-none" />
        </div>
      </div>

      {/* Comment Input - Only show for authenticated users */}
      {user && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <form onSubmit={onSubmitComment} className="relative">
            <div
              className="p-6 rounded-2xl bg-black/40 backdrop-blur-sm border border-cyan-500/20"
              style={{ boxShadow: '0 0 30px rgba(6, 182, 212, 0.15)' }}
            >
              <div className="flex gap-4">
                <div className="relative flex-shrink-0">
                  <div
                    className="p-4 rounded-2xl bg-black/40 backdrop-blur-sm border border-cyan-500/20 border-r-cyan-500/30 text-center h-full"
                    style={{ boxShadow: '0 0 30px rgba(6, 182, 212, 0.15)' }}
                  >
                    <p className="text-sm mb-3 font-semibold">
                      {profileData?.username ? (
                        <>
                          <span className="bg-gradient-to-r from-cyan-300 to-violet-300 bg-clip-text text-transparent">
                            {profileData.username.split('#')[0]}
                          </span>
                          {profileData.username.includes('#') && (
                            <span className="text-violet-400 font-bold">#{profileData.username.split('#')[1]}</span>
                          )}
                        </>
                      ) : (
                        <span className="bg-gradient-to-r from-cyan-300 to-violet-300 bg-clip-text text-transparent">You</span>
                      )}
                    </p>
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ImageWithFallback
                        src={userAvatar || (profileData ? getAvatarUrl(profileData.avatar) : getAvatarUrl(0))}
                        alt="Your avatar"
                        className="w-24 h-24 rounded-full object-cover border-2 border-cyan-500/30 mx-auto"
                      />
                    </motion.div>
                  </div>
                </div>

                <div className="flex-1">
                  <textarea
                    value={commentText}
                    onChange={(e) => onCommentTextChange(e.target.value)}
                    placeholder="Share your thoughts about this movie..."
                    rows={3}
                    className="w-full px-4 py-3 bg-black/40 border border-cyan-500/20 rounded-xl text-cyan-100 placeholder:text-cyan-100/40 focus:outline-none focus:border-cyan-400/60 resize-none"
                    style={{ boxShadow: '0 0 15px rgba(6, 182, 212, 0.1)' }}
                  />

                  <div className="flex items-center justify-end mt-3 gap-3">
                    <motion.button
                      type="submit"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      disabled={!commentText.trim()}
                      className="px-6 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-violet-500 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      style={{ boxShadow: '0 0 20px rgba(6, 182, 212, 0.4)' }}
                    >
                      <Send className="w-4 h-4" />
                      <span>Post Comment</span>
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </motion.div>
      )}

      {/* Comments List */}
      <div className="space-y-6">
        {comments.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center py-12"
          >
            <div className="p-8 rounded-2xl bg-black/40 backdrop-blur-sm border border-cyan-500/20"
                 style={{ boxShadow: '0 0 30px rgba(6, 182, 212, 0.15)' }}>
              <MessageCircle className="w-16 h-16 text-cyan-400/40 mx-auto mb-4" />
              <h3 className="text-xl text-cyan-100 mb-2">No comments yet</h3>
              {user ? (
                <p className="text-cyan-100/60">Be the first one to comment!</p>
              ) : (
                <p className="text-cyan-100/60">
                  Please{' '}
                  <button
                    onClick={onOpenLoginModal}
                    className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors"
                  >
                    sign in
                  </button>{' '}
                  to comment
                </p>
              )}
            </div>
          </motion.div>
        ) : (
          comments.map((comment, index) => (
            <motion.div
              key={comment.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="p-6 rounded-2xl bg-black/40 backdrop-blur-sm border border-cyan-500/20 hover:border-cyan-400/40 transition-all"
              style={{ boxShadow: '0 0 30px rgba(6, 182, 212, 0.15)' }}
            >
              {/* Comment Header */}
              <div className="flex gap-4">
                <div className="relative flex-shrink-0">
                  <ImageWithFallback
                    src={comment.avatar}
                    alt={comment.author}
                    className="w-12 h-12 rounded-full object-cover border-2 border-cyan-500/30"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-cyan-100">{comment.author}</p>
                    <span className="text-cyan-100/40">•</span>
                    <span className="text-cyan-100/60 text-sm">{comment.timestamp}</span>
                    {getBadgeRank(comment.id) === 1 && (
                      <div className="flex items-center ml-2">
                        <Crown className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="text-yellow-500 text-xs font-bold ml-1">1st</span>
                      </div>
                    )}
                    {getBadgeRank(comment.id) === 2 && (
                      <div className="flex items-center ml-2">
                        <Trophy className="w-4 h-4 text-yellow-400" />
                        <span className="text-yellow-400 text-xs font-bold ml-1">2nd</span>
                      </div>
                    )}
                    {getBadgeRank(comment.id) === 3 && (
                      <div className="flex items-center ml-2">
                        <Medal className="w-4 h-4 text-yellow-600" />
                        <span className="text-yellow-600 text-xs font-bold ml-1">3rd</span>
                      </div>
                    )}
                  </div>

                  {/* Comment Text or Edit Input */}
                  {editingComment === comment.id.toString() ? (
                    <div className="mb-4">
                      <textarea
                        value={editText}
                        onChange={(e) => onEditTextChange(e.target.value)}
                        placeholder="Edit your comment..."
                        rows={3}
                        className="w-full px-4 py-3 bg-black/40 border border-cyan-500/20 rounded-lg text-cyan-100 placeholder:text-cyan-100/40 focus:outline-none focus:border-cyan-400/60 resize-none"
                        autoFocus
                      />
                      <div className="flex items-center justify-end mt-2 gap-2">
                        <button
                          onClick={() => onToggleEdit(comment.id.toString(), comment.text)}
                          className="px-3 py-1 text-cyan-100/60 hover:text-cyan-300 text-sm"
                        >
                          Cancel
                        </button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => onSubmitEdit(comment.id.toString())}
                          disabled={!editText.trim()}
                          className="px-3 py-1 rounded-lg bg-gradient-to-r from-cyan-500 to-violet-500 text-white disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                          Save
                        </motion.button>
                      </div>
                      {comment.isEdited && comment.editedAt && (
                        <p className="text-cyan-100/60 text-sm mt-2">Last edited: {formatRelativeTime(comment.editedAt)}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-cyan-100/80 leading-relaxed mb-4">
                      {comment.text}
                    </p>
                  )}

                  {/* Comment Actions */}
                  <div className="flex items-center gap-4">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => onLikeComment(comment.id)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 hover:border-cyan-400/60 transition-all"
                    >
                      <ThumbsUp className={`w-4 h-4 text-cyan-400 ${comment.likedByCurrentUser ? 'fill-cyan-400' : ''}`} />
                      <span className="text-cyan-300 text-sm">{comment.likes}</span>
                    </motion.button>

                    {user && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onToggleReply(comment.id)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/30 hover:border-violet-400/60 transition-all"
                      >
                        <MessageCircle className="w-4 h-4 text-violet-400" />
                        <span className="text-violet-300 text-sm">Reply</span>
                      </motion.button>
                    )}

                    {user && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onToggleEdit(comment.id.toString(), comment.text)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 hover:border-blue-400/60 transition-all"
                      >
                        <Edit className="w-4 h-4 text-blue-400" />
                        <span className="text-blue-300 text-sm">Edit</span>
                      </motion.button>
                    )}

                    {comment.replies.length > 0 && (
                      <button
                        onClick={() => onToggleReplies(comment.id)}
                        className="text-cyan-100/60 hover:text-cyan-300 text-sm transition-colors flex items-center gap-1"
                      >
                        <motion.div
                          animate={{ rotate: expandedComments.has(comment.id) ? 180 : 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <ChevronDown className="w-4 h-4" />
                        </motion.div>
                        {expandedComments.has(comment.id) ? 'Hide' : 'View'} {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                      </button>
                    )}
                  </div>

                  {/* Reply Input - Only show for authenticated users */}
                  <AnimatePresence>
                    {replyingTo === comment.id && user && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="mt-4"
                      >
                        <form onSubmit={onSubmitReply} className="flex gap-3">
                          <input
                            type="text"
                            value={replyText}
                            onChange={(e) => onReplyTextChange(e.target.value)}
                            placeholder={`Reply to ${comment.author}...`}
                            className="flex-1 px-4 py-2 bg-black/40 border border-cyan-500/20 rounded-lg text-cyan-100 placeholder:text-cyan-100/40 focus:outline-none focus:border-cyan-400/60"
                            autoFocus
                          />
                          <motion.button
                            type="submit"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            disabled={!replyText.trim()}
                            className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-violet-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Send className="w-4 h-4" />
                          </motion.button>
                        </form>
                      </motion.div>
                    )}
                  </AnimatePresence>


                  {/* Replies */}
                  <AnimatePresence>
                    {expandedComments.has(comment.id) && comment.replies.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="mt-4 space-y-4 pl-4 border-l-2 border-cyan-500/30"
                      >
                        {comment.replies.map((reply) => (
                          <motion.div
                            key={reply.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex gap-3"
                          >
                            <ImageWithFallback
                              src={reply.avatar}
                              alt={reply.author}
                              className="w-8 h-8 rounded-full object-cover border border-cyan-500/30 flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-cyan-100 text-sm">{reply.author}</p>
                                <span className="text-cyan-100/40 text-xs">•</span>
                                <span className="text-cyan-100/60 text-xs">{reply.timestamp}</span>
                              </div>
                              <p className="text-cyan-100/80 text-sm mb-2">{reply.text}</p>
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => onLikeReply(reply.id)}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 hover:border-cyan-400/40 transition-all"
                              >
                                <ThumbsUp className={`w-3 h-3 text-cyan-400 ${reply.likedByCurrentUser ? 'fill-cyan-400' : ''}`} />
                                <span className="text-cyan-300 text-xs">{reply.likes}</span>
                              </motion.button>
                            </div>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
