'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Star, Calendar, Clock, Plus, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { getContentById, postRating, postComment, addToWatchlist } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface Content {
  id: number;
  type: 'movie' | 'tv';
  title: string;
  description: string;
  year: number;
  rating: number;
  posterUrl: string;
  genres: string[];
  duration?: number; // for movies
  seasons?: number; // for tv
}

interface Comment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
}

export default function ContentDetailPage() {
  const params = useParams();
  const { user } = useAuth();
  const [content, setContent] = useState<Content | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [userRating, setUserRating] = useState<number>(0);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const type = params.type as string;
  const id = params.id as string;

  useEffect(() => {
    loadContent();
  }, [type, id]);

  const loadContent = async () => {
    try {
      // For now, use static data since backend may not be fully implemented
      const staticContent: Content = {
        id: parseInt(id),
        type: type as 'movie' | 'tv',
        title: type === 'movie' ? 'Sample Movie' : 'Sample TV Show',
        description: 'This is a sample description for the content. In a real implementation, this would come from the backend API.',
        year: 2023,
        rating: 8.5,
        posterUrl: 'https://via.placeholder.com/300x450?text=Poster',
        genres: ['Action', 'Adventure'],
        duration: type === 'movie' ? 120 : undefined,
        seasons: type === 'tv' ? 2 : undefined,
      };

      const staticComments: Comment[] = [
        {
          id: '1',
          userId: 'user1',
          userName: 'John Doe',
          text: 'Great movie! Highly recommended.',
          createdAt: new Date().toISOString(),
        },
        {
          id: '2',
          userId: 'user2',
          userName: 'Jane Smith',
          text: 'Amazing storyline and acting.',
          createdAt: new Date().toISOString(),
        },
      ];

      setContent(staticContent);
      setComments(staticComments);
    } catch (error) {
      console.error('Error loading content:', error);
      toast({
        title: 'Error',
        description: 'Failed to load content details.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToWatchlist = async () => {
    if (!content) return;
    try {
      await addToWatchlist(content.id, content.type);
      toast({
        title: 'Added to watchlist',
        description: `${content.title} has been added to your watchlist.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add to watchlist.',
        variant: 'destructive',
      });
    }
  };

  const handleSubmitRating = async (rating: number) => {
    if (!content) return;
    try {
      await postRating(content.id, content.type, rating);
      setUserRating(rating);
      toast({
        title: 'Rating submitted',
        description: `You rated ${content.title} ${rating} stars.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit rating.',
        variant: 'destructive',
      });
    }
  };

  const handleSubmitComment = async () => {
    if (!content || !newComment.trim()) return;
    try {
      await postComment(content.id, content.type, newComment);
      const newCommentObj: Comment = {
        id: Date.now().toString(),
        userId: user?.id || 'current',
        userName: user?.name || 'You',
        text: newComment,
        createdAt: new Date().toISOString(),
      };
      setComments(prev => [newCommentObj, ...prev]);
      setNewComment('');
      toast({
        title: 'Comment posted',
        description: 'Your comment has been posted.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to post comment.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Content not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Content Header */}
      <div className="flex flex-col md:flex-row gap-8">
        <div className="flex-shrink-0">
          <img
            src={content.posterUrl}
            alt={content.title}
            className="w-64 h-96 object-cover rounded-lg shadow-lg"
          />
        </div>
        <div className="flex-1 space-y-4">
          <div>
            <h1 className="text-3xl font-bold">{content.title}</h1>
            <div className="flex items-center gap-4 mt-2">
              <Badge variant="secondary">{content.type === 'movie' ? 'Film' : 'Série'}</Badge>
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {content.year}
              </span>
              {content.duration && (
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {content.duration} min
                </span>
              )}
              {content.seasons && (
                <span>{content.seasons} saisons</span>
              )}
              <span className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                {content.rating.toFixed(1)}
              </span>
            </div>
          </div>
          <p className="text-muted-foreground">{content.description}</p>
          <div className="flex flex-wrap gap-2">
            {content.genres.map(genre => (
              <Badge key={genre} variant="outline">{genre}</Badge>
            ))}
          </div>
          <div className="flex gap-4">
            <Button onClick={handleAddToWatchlist}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter à la watchlist
            </Button>
          </div>
        </div>
      </div>

      {/* Rating Section */}
      <Card>
        <CardHeader>
          <CardTitle>Noter ce contenu</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                onClick={() => handleSubmitRating(star)}
                className="text-2xl hover:scale-110 transition-transform"
              >
                <Star
                  className={`h-6 w-6 ${
                    star <= userRating
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
            {userRating > 0 && (
              <span className="ml-2 text-sm text-muted-foreground">
                Votre note: {userRating} étoile{userRating > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Comments Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Commentaires
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {user && (
            <div className="space-y-2">
              <Label htmlFor="comment">Ajouter un commentaire</Label>
              <textarea
                id="comment"
                placeholder="Écrivez votre commentaire..."
                value={newComment}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewComment(e.target.value)}
                className="w-full px-3 py-2 border border-input bg-background rounded-md resize-none"
                rows={3}
              />
              <Button onClick={handleSubmitComment} disabled={!newComment.trim()}>
                Publier
              </Button>
            </div>
          )}
          <div className="space-y-4">
            {comments.map(comment => (
              <div key={comment.id} className="border-b pb-4 last:border-b-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{comment.userName}</span>
                  <span className="text-sm text-muted-foreground">
                    {new Date(comment.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="mt-1">{comment.text}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
