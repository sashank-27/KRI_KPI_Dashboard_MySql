// Calculate duration between two dates: hours if same day, days if not
export function getTaskDuration(start: string | Date, end: string | Date): string {
  if (!start || !end) return "-";
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return "-";
  const sameDay = startDate.toDateString() === endDate.toDateString();
  const diffMs = endDate.getTime() - startDate.getTime();
  if (diffMs < 0) return "-";
  if (sameDay) {
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (hours === 0) return `${minutes} min`;
    return `${hours} hr${hours > 1 ? 's' : ''}${minutes > 0 ? ` ${minutes} min` : ''}`;
  } else {
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return `${days} day${days > 1 ? 's' : ''}`;
  }
}
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Utility function to format dates in a clean, user-friendly way
export function formatDate(dateString: string | Date): string {
  if (!dateString) return "Unknown";
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Invalid date";
  
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Utility function to format relative time (e.g., "2 days ago")
export function formatRelativeTime(dateString: string | Date): string {
  if (!dateString) return "Unknown";
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Invalid date";
  
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} months ago`;
  return `${Math.floor(diffInSeconds / 31536000)} years ago`;
}
