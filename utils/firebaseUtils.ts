import { WatchHistoryItem } from '../store/watchHistoryStore';
import { MyListAnime } from '../utils/myList';
import { logger } from './logger';

// Firestore has a 1MB document size limit, but we're increasing this to prevent trimming
// Note: This could potentially cause issues if the document actually exceeds Firestore's hard limit
const MAX_DOCUMENT_SIZE_BYTES = 900000000; // Increased to 900MB to effectively disable trimming

// Estimate size of Firestore document, using a simple JSON-based calculation
// This is an approximation - actual Firestore storage size might differ
export const estimateDocumentSize = (data: any): number => {
  return new Blob([JSON.stringify(data)]).size;
};

// Trim watch history to keep it under Firestore's document size limits
export const trimWatchHistoryIfNeeded = (history: WatchHistoryItem[]): WatchHistoryItem[] => {
  if (history.length <= 0) return history;
  
  // Sort by lastWatched (most recent first)
  const sortedHistory = [...history].sort((a, b) => b.lastWatched - a.lastWatched);
  
  // Estimate initial size
  let estimatedSize = estimateDocumentSize(sortedHistory);
  
  // If under the limit, return as is
  if (estimatedSize < MAX_DOCUMENT_SIZE_BYTES) {
    return sortedHistory;
  }
  
  // Log warning
  logger.warn(`Watch history size (${estimatedSize} bytes) exceeds Firestore limit, trimming older entries`);
  
  // Reduce size until under limit
  while (estimatedSize >= MAX_DOCUMENT_SIZE_BYTES && sortedHistory.length > 0) {
    // Remove oldest entry
    sortedHistory.pop();
    estimatedSize = estimateDocumentSize(sortedHistory);
  }
  
  return sortedHistory;
};

// Check and trim watchlist if needed
export const trimWatchlistIfNeeded = (watchlist: MyListAnime[]): MyListAnime[] => {
  if (watchlist.length <= 0) return watchlist;
  
  // Sort by addedAt (most recent first)
  const sortedWatchlist = [...watchlist].sort((a, b) => b.addedAt - a.addedAt);
  
  // Estimate initial size
  let estimatedSize = estimateDocumentSize(sortedWatchlist);
  
  // If under the limit, return as is
  if (estimatedSize < MAX_DOCUMENT_SIZE_BYTES) {
    return sortedWatchlist;
  }
  
  // Log a more serious warning
  logger.error('Watchlist', `CRITICAL: Watchlist size (${estimatedSize} bytes) exceeds limit. This would normally cause older entries to be deleted. Contact support to prevent data loss.`);
  
  // Firestore's actual hard limit is 1MB, so we should still trim if we're really over that limit
  const FIRESTORE_HARD_LIMIT = 900000; // Slightly under 1MB to be safe
  if (estimatedSize > FIRESTORE_HARD_LIMIT) {
    // We really need to trim in this case
    logger.error('Watchlist', `TRIMMING REQUIRED: Watchlist size exceeds Firestore's hard limit. Trimming oldest entries to prevent sync failures.`);
    
    // Reduce size until under the hard limit
    while (estimatedSize >= FIRESTORE_HARD_LIMIT && sortedWatchlist.length > 0) {
      // Remove oldest entry
      sortedWatchlist.pop();
      estimatedSize = estimateDocumentSize(sortedWatchlist);
    }
  }
  
  return sortedWatchlist;
};

// Create watchHistory chunks if needed (splitting into multiple documents)
// This would be used for a future implementation with multiple sync documents
export const createWatchHistoryChunks = (history: WatchHistoryItem[], maxItemsPerChunk = 100): WatchHistoryItem[][] => {
  const chunks: WatchHistoryItem[][] = [];
  
  // Sort by lastWatched (most recent first)
  const sortedHistory = [...history].sort((a, b) => b.lastWatched - a.lastWatched);
  
  for (let i = 0; i < sortedHistory.length; i += maxItemsPerChunk) {
    chunks.push(sortedHistory.slice(i, i + maxItemsPerChunk));
  }
  
  return chunks;
}; 