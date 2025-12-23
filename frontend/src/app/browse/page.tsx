"use client";

import { Suspense } from 'react';
import { BrowsePage } from '@/components/BrowsePage';
import { Navbar } from '@/components/Navbar';

function BrowseContent() {
  return <BrowsePage />;
}

export default function Browse() {
  return (
    <>
      <Navbar />
      <Suspense fallback={<div>Loading...</div>}>
        <BrowseContent />
      </Suspense>
    </>
  );
}
