"use client";

import { useState } from "react";
import useSWR from "swr";
import { StarRating } from "@/components/StarRating";
import { RatingDisplay } from "@/components/RatingDisplay";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { getApiUrl } from "@/lib/utils";

interface RatingSectionProps {
  contentId: number;
  contentType: 'movie' | 'tv';
  onOpenLoginModal?: () => void;
}

export function RatingSection({ contentId, contentType, onOpenLoginModal }: RatingSectionProps) {
  const { user, getIdToken } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetcher = async (url: string) => {
    const headers: Record<string, string> = {};
    const token = localStorage.getItem('accessToken');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`Failed to fetch ratings: ${response.status}`);
    }
    return response.json();
  };

  // Get current token for SWR key to force re-fetch on login/logout
  const currentToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  // Fetch rating data - works for both authenticated and non-authenticated users
  const { data: ratingData, mutate: mutateRating, isLoading } = useSWR(
    currentToken ? getApiUrl(`/api/interactions/ratings/${contentId}?contentType=${contentType}&_auth=1`) : getApiUrl(`/api/interactions/ratings/${contentId}?contentType=${contentType}`),
    fetcher
  );

  const handleRatingChange = async (rating: number) => {
    if (!user) {
      toast.error('You must be logged in to rate content');
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('Getting ID token...');
      const idToken = await getIdToken();
      console.log('ID token retrieved:', idToken ? 'present' : 'missing');

      if (!idToken) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(getApiUrl('/api/interactions/ratings'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          contentId,
          contentType,
          score: rating,
        }),
      });

      console.log('Response status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Rating submission failed:', errorText);
        throw new Error(`Failed to submit rating: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      toast.success(result.message || 'Rating submitted successfully');

      // Update the rating data
      mutateRating();
    } catch (error) {
      console.error('Error submitting rating:', error);
      toast.error('Failed to submit rating. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  const { averageRating = 0, totalRatings = 0, userRating = null, hasUserRated = false } = ratingData || {};

  return (
    <div
      className="p-6 rounded-2xl bg-black/40 backdrop-blur-sm border border-cyan-500/20"
      style={{ boxShadow: '0 0 30px rgba(6, 182, 212, 0.15)' }}
    >
      <div className="space-y-6">
        {/* Overall Rating Display - visible to everyone */}
        <div className="text-center py-6">
          <div className="flex items-center justify-center gap-4 mb-2">
            <RatingDisplay
              rating={averageRating}
              size="lg"
              showMaxRating={false}
            />
            <div className="text-cyan-100/60 text-sm">
              ({totalRatings} {totalRatings === 1 ? 'vote' : 'votes'})
            </div>
          </div>
          {averageRating > 0 && (
            <p className="text-cyan-300 text-sm">
              {averageRating} out of 10
            </p>
          )}
        </div>

        {/* User Rating Section - only shown for logged-in users */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-center text-cyan-100">
            {hasUserRated ? 'Your Rating' : 'Rate this content'}
          </h3>

          {user ? (
            <div className="flex flex-col items-center gap-4">
              <StarRating
                initialRating={userRating}
                onRatingChange={handleRatingChange}
                readonly={isSubmitting}
                size="lg"
              />
              {isSubmitting && (
                <div className="flex items-center gap-2 text-cyan-300 text-sm">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-400"></div>
                  Submitting rating...
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-cyan-100/60 text-sm">
                <button
                  onClick={onOpenLoginModal}
                  className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors"
                >
                  Sign in
                </button>{' '}
                to rate this content
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
