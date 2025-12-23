// frontend/src/components/Navigation.tsx
'use client';

import { Film } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { NotificationBadge } from '@/components/NotificationBadge';
import { UserAvatar } from '@/components/UserAvatar';

export function Navigation() {
  const { user, isLoading } = useAuth();

  return (
    <nav className="border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Film className="h-6 w-6" />
          <span className="text-xl font-bold">CineStream</span>
        </Link>

        <div className="flex items-center gap-4">
          {isLoading ? (
            <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
          ) : user ? (
            <>
              <NotificationBadge />
              <UserAvatar />
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" asChild>
                <Link href="/auth/login">Connexion</Link>
              </Button>
              <Button asChild>
                <Link href="/register">Inscription</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
