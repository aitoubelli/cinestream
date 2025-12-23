// frontend/src/app/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, Clock } from 'lucide-react';
import { ContentCard } from '@/components/ContentCard';
import { getTrending, getWatchlist } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { redirect } from 'next/navigation';

interface Content {
  id: number;
  type: 'movie' | 'tv';
  title: string;
  description: string;
  year: number;
  rating: number;
  posterUrl: string;
}

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const [trending, setTrending] = useState<Content[]>([]);
  const [watchlist, setWatchlist] = useState<Content[]>([]);
  const [isLoadingContent, setIsLoadingContent] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) {
      redirect('/auth/login');
    }
  }, [user, isLoading]);

  useEffect(() => {
    if (user) {
      loadContent();
    }
  }, [user]);

  const loadContent = async () => {
    try {
      const [trendingData, watchlistData] = await Promise.all([
        getTrending(),
        getWatchlist(),
      ]);
      setTrending(trendingData);
      setWatchlist(watchlistData);
    } catch (error) {
      console.error('Error loading content:', error);
    } finally {
      setIsLoadingContent(false);
    }
  };

  if (isLoading || isLoadingContent) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Section Tendances */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Tendances actuelles</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {trending.map((content) => (
            <ContentCard key={`${content.type}-${content.id}`} {...content} />
          ))}
        </div>
      </section>

      {/* Section Watchlist */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Ma watchlist</h2>
        </div>
        {watchlist.length === 0 ? (
          <div className="text-center py-12 border rounded-lg">
            <p className="text-muted-foreground">
              Votre watchlist est vide. Ajoutez des films ou séries !
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {watchlist.map((content) => (
              <ContentCard
                key={`${content.type}-${content.id}`}
                {...content}
                onWatchlist={true}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
