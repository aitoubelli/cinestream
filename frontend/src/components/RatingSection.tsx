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
  contentType: 'movie' | 'series' | 'anime';
}

export function RatingSection({ contentId, contentType }: RatingSectionProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetcher = (url: string) => fetch(url).then((res) => res.json());

  // Fetch rating data - works for both authenticated and non-authenticated users
  const { data: ratingData, mutate: mutateRating, isLoading } = useSWR(
    getApiUrl(`/api/ratings/${contentId}?contentType=${contentType}`),
    fetcher
  );

  const handleRatingChange = async (rating: number) => {
    if (!user) {
      toast.error('You must be logged in to rate content');
      return;
    }

    setIsSubmitting(true);
    try {
      const idToken = await user.getIdToken();
      const response = await fetch(getApiUrl('/api/ratings'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          contentId,
          contentType,
          rating,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit rating');
      }

      const result = await response.json();
      toast.success(result.message);

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
                Sign in to rate this content
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
