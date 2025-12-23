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
