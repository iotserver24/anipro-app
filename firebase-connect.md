# Firestore Data Structure Documentation

## Overview
This document outlines the data structure and synchronization mechanisms used in the anime app for storing user data, watch history, and watchlist information in Firebase Firestore.

## Collections Structure

### 1. user_data Collection
The main collection for storing user-specific data.

```typescript
interface UserData {
  lastSync: Timestamp;
  watchHistory: WatchHistoryItem[];
  watchlist: MyListAnime[];
}
```

#### WatchHistoryItem Structure
```typescript
interface WatchHistoryItem {
  id: string;          // Anime ID
  name: string;        // Anime Name
  img: string;         // Anime Image
  episodeId: string;   // Current Episode ID
  episodeNumber: number;
  timestamp: number;
  progress: number;    // Current progress in seconds
  duration: number;    // Total duration in seconds
  lastWatched: number; // Timestamp of last watch
  subOrDub: 'sub' | 'dub';
}
```

#### MyListAnime Structure
```typescript
export type MyListAnime = {
  id: string;
  name: string; // Anime name (not 'title')
  img: string;  // Anime image (not 'image')
  addedAt: number; // Timestamp when added to watchlist
  malId?: string; // Optional MAL ID for MyAnimeList integration
};
```

## Synchronization Mechanisms

### 1. Watch History Sync
- Local storage key: `'anipro:watchHistory'`
- Backup storage key: `'anipro:watchHistory_backup'`

#### Sync Process:
1. Local-first approach: Data is saved locally first for immediate access
2. Cloud sync happens in background if user is authenticated
3. Merging strategy prioritizes most recent watch times
4. Size limits are enforced to stay within Firestore's 1MB document limit
5. Backup/restore logic ensures data safety in case of sync failure

### 2. Watchlist Sync
- Local storage key: `'anipro:watchlist'`
- Backup storage key: `'anipro:watchlist_backup'`

#### Sync Process:
1. Local storage is used as primary data source for fast UI
2. Cloud sync occurs after local save if user is authenticated
3. Conservative merging strategy to prevent data loss (local preferred if cloud is empty)
4. Size monitoring and trimming if approaching Firestore limits (oldest entries trimmed)
5. Backup/restore logic for error recovery
6. New methods: `refreshIfNeeded`, robust batch operations

#### Import/Export
- Users can import/export their watchlist in MyAnimeList XML and other formats
- Import supports batch processing, error handling, and watched episode mapping
- Export includes watched episodes from watch history

## Security Rules

```javascript
match /user_data/{userId} {
  // Allow users to read their own data even without verification
  allow read: if request.auth != null && request.auth.uid == userId;
  
  // Allow creating initial data without verification
  allow create: if request.auth != null && request.auth.uid == userId;
  
  // Require email verification for updating existing data
  allow update: if isAuthenticatedAndVerified() && 
                 request.auth.uid == userId && 
                 (
                   request.resource.data.diff(resource.data).affectedKeys().hasOnly(['watchHistory', 'watchlist', 'lastSync']) || 
                   request.resource.data.diff(resource.data).affectedKeys().hasOnly(['lastSync'])
                 );
}
```

## Data Management Features

### 1. Size Management
- Document size limit: 900KB (soft limit)
- Hard limit enforcement: 1MB (Firestore requirement)
- Automatic trimming of older entries if size limits are exceeded

### 2. Offline Support
- Full offline functionality with local storage
- Automatic sync when connection is restored
- Conflict resolution favoring most recent changes

### 3. Error Handling
- Backup creation before major operations
- Automatic retry mechanism for failed syncs
- Fallback to local data if cloud sync fails

### 4. Performance Optimizations
- Caching mechanism for frequently accessed data
- Batch updates for multiple changes
- Rate limiting for API calls

## Implementation Notes

### 1. Initial Sync After Login
```typescript
// Performed after user authentication
await Promise.all([
  useWatchHistoryStore.getState().initializeHistory(),
  useMyListStore.getState().initializeList()
]);
```

### 2. Data Validation
- All data is validated before storage
- Invalid entries are filtered out
- Timestamps are standardized

### 3. Email Verification Requirements
- Reading own data: No verification required
- Creating initial data: No verification required
- Updating existing data: Email verification required

## Migration Considerations

When implementing this structure in a new application:

1. **Data Structure**
   - Maintain the same collection and document structure
   - Keep field names consistent for compatibility

2. **Security Rules**
   - Implement the provided Firestore security rules
   - Adjust rules based on your specific requirements

3. **Sync Logic**
   - Implement local storage with the same keys
   - Follow the local-first, cloud-sync-later pattern
   - Maintain backup mechanisms

4. **Error Handling**
   - Implement proper error boundaries
   - Use the logging system for debugging
   - Maintain backup/restore functionality

## Best Practices

1. **Data Updates**
   - Always update local storage first
   - Use batch operations for multiple updates
   - Implement retry mechanisms for failed syncs

2. **Security**
   - Never store sensitive data
   - Implement proper user authentication
   - Follow email verification requirements

3. **Performance**
   - Implement caching mechanisms
   - Use pagination where possible
   - Monitor document sizes

4. **Testing**
   - Test offline functionality
   - Verify sync mechanisms
   - Validate error handling 