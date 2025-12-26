"use client";

import { useSearchParams } from 'next/navigation';
import { use } from 'react';
import { WatchPage } from '@/components/WatchPage';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export default function Watch({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const searchParams = useSearchParams();
  const contentType = searchParams.get('type') as 'movie' | 'series';

  if (!contentType) {
    return (
      <div className="min-h-screen bg-[#050510]">
        <Navbar />
        <div className="flex items-center justify-center min-h-screen">
          <div>Invalid content type</div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050510]">
      <Navbar />
      <WatchPage contentId={parseInt(resolvedParams.id)} contentType={contentType} />
      <Footer />
    </div>
  );
}
