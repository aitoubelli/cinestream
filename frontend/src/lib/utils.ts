import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// API utility function for constructing backend URLs
export const getApiUrl = (endpoint: string) => {
  return `${process.env.NEXT_PUBLIC_BACKEND_URL}${endpoint}`;
};

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Avatar helper functions
export const avatarIds = [
  360174, 364419, 364764, 364772, 364812, 364814, 365200, 367477, 374670,
  375112, 375114, 375117, 375139, 375165, 375166, 375265, 375360, 375542, 375571, 375608
];

export const pngAvatarIds = [360174, 364419, 364772, 374670, 375112, 375114, 375117, 375139, 375165, 375166, 375265, 375360, 375542, 375571, 375608];

export function getAvatarUrl(avatarIndex: number): string {
  const avatarId = avatarIds[avatarIndex] || avatarIndex;
  const extension = pngAvatarIds.includes(avatarId) ? 'png' : 'jpg';
  return `/avatars/${avatarId}.${extension}`;
}

export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (weeks < 4) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  if (months < 12) return `${months} month${months > 1 ? 's' : ''} ago`;
  return `${years} year${years > 1 ? 's' : ''} ago`;
}
