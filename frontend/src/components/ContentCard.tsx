// frontend/src/components/ContentCard.tsx
'use client';

import { Film, Tv, Star, Plus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { addToWatchlist } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';

interface ContentCardProps {
  id: number;
  type: 'movie' | 'tv';
  title: string;
  description: string;
  year: number;
  rating: number;
  posterUrl: string;
  onWatchlist?: boolean;
}

export function ContentCard({
  id,
  type,
  title,
  description,
  year,
  rating,
  posterUrl,
  onWatchlist = false,
}: ContentCardProps) {
  const handleAddToWatchlist = async () => {
    try {
      await addToWatchlist(id, type);
      toast({
        title: 'Ajouté à la watchlist',
        description: `${title} a été ajouté à votre watchlist.`,
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'ajouter à la watchlist.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="aspect-[2/3] relative overflow-hidden bg-muted">
        <img
          src={posterUrl}
          alt={title}
          className="w-full h-full object-cover transition-transform hover:scale-105"
        />
        <div className="absolute top-2 right-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            {type === 'movie' ? <Film className="h-3 w-3" /> : <Tv className="h-3 w-3" />}
            {type === 'movie' ? 'Film' : 'Série'}
          </Badge>
        </div>
      </div>
      <CardHeader>
        <CardTitle className="line-clamp-1">{title}</CardTitle>
        <CardDescription className="flex items-center justify-between">
          <span>{year}</span>
          <span className="flex items-center gap-1">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            {rating.toFixed(1)}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
      </CardContent>
      <CardFooter>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={handleAddToWatchlist}
          disabled={onWatchlist}
        >
          <Plus className="h-4 w-4 mr-2" />
          {onWatchlist ? 'Déjà dans la watchlist' : 'Ajouter à la watchlist'}
        </Button>
      </CardFooter>
    </Card>
  );
}