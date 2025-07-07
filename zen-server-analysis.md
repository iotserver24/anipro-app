# Zen Server Implementation Analysis

## Overview
The zen server is implemented as one of three streaming servers in the anime watching app, alongside softSub and hardSub servers. It provides embedded video player functionality using zencloud.cc infrastructure.

## Key Components

### 1. Episode Watch Page (`app/anime/watch/[episodeId].tsx`)

The main zen server implementation is located in the episode watch page with the following key features:

#### Server Selection
- Users can select between three servers: `softSub`, `hardSub`, and `zen`
- Default server is set to `zen`: `const [selectedServer, setSelectedServer] = useState<'softSub' | 'hardSub' | 'zen'>('zen');`

#### Zen Server Flow (Lines 1236-1320)
1. **AniList ID Resolution**: 
   - Fetches anime's AniList ID from anime info or makes additional API call
   - Supports multiple property name formats: `alID`, `al_id`, `anilist_id`, or `mappings.al`

2. **Episode Data Retrieval**:
   - Makes request to: `https://zencloud.cc/videos/raw?anilist_id=${anilistId}&episode=${episodeNumber}`
   - Parses response to extract `access_id` for the episode

3. **Embedded Player URL Generation**:
   - Creates URL: `https://zencloud.cc/e/${accessId}?a=${audioParam}&autoPlay=true`
   - `audioParam`: `1` for dub, `0` for sub based on selected category
   - Includes download URL: `https://zencloud.cc/d/${accessId}`

4. **Source Configuration**:
   ```typescript
   sources = {
     sources: [{
       url: embeddedPlayerUrl,
       quality: 'HD',
       isM3U8: false,
       isZenEmbedded: true // Flag for embedded player
     }],
     subtitles: [], // Handled by embedded player
     download: `https://zencloud.cc/d/${accessId}`
   };
   ```

### 2. Video Player Component (`components/VideoPlayer.tsx`)

The video player handles zen embedded players specially:

#### Zen-Specific Features
- **WebView Integration**: Uses React Native WebView for zen embedded players
- **Special Flag**: `isZenEmbedded?: boolean` in source props
- **Dual Rendering**: Native video player OR WebView based on `isZenEmbedded` flag

#### Key Zen Handling (Lines 323-372)
1. **Seeking**: 
   ```typescript
   if (source.isZenEmbedded && webViewRef.current) {
     webViewRef.current.postMessage(JSON.stringify({
       command: 'seek',
       value: value
     }));
   }
   ```

2. **Play/Pause Control**:
   ```typescript
   if (source.isZenEmbedded && webViewRef.current) {
     const command = isPlaying ? 'pause' : 'play';
     webViewRef.current.postMessage(JSON.stringify({
       command: command
     }));
   }
   ```

3. **Fullscreen Handling**: Special handling for zen player fullscreen events
4. **Message Communication**: Bidirectional communication between React Native and WebView

### 3. Server Integration Points

#### Error Handling
- Comprehensive error handling for zen server failures
- Fallback messaging: "Failed to load Zen server: [error message]"
- User can switch to alternative servers (softSub/hardSub)

#### URL Construction
- **Episode Endpoint**: `https://zencloud.cc/videos/raw?anilist_id=${anilistId}&episode=${episodeNumber}`
- **Player Endpoint**: `https://zencloud.cc/e/${accessId}?a=${audioParam}&autoPlay=true`
- **Download Endpoint**: `https://zencloud.cc/d/${accessId}`

#### Quality & Subtitle Management
- Zen server subtitles are handled by the embedded player
- Quality selection is managed by the zen player interface
- No custom subtitle processing for zen server

### 4. User Experience Features

#### Server Switching
- Users can change servers mid-episode
- Position is preserved when switching: `setLastServerPosition(currentTime)`
- Smooth transition between different server types

#### Controls Adaptation
- Custom controls disabled for zen embedded player
- Tap gestures disabled for WebView to prevent conflicts
- Fullscreen handled through WebView communication

#### Download Integration
- Download URLs provided by zen server
- Integrated with app's download system
- Direct download links available

## Technical Architecture

### Data Flow
1. User selects episode → Episode watch page loads
2. Server selection (zen/softSub/hardSub) → Appropriate API called
3. For zen: AniList ID → zencloud.cc API → access_id → embedded player
4. WebView renders zen player → Message passing for controls
5. Playback progress tracked → History updated

### API Dependencies
- **AniList ID Resolution**: Required for zen server functionality
- **zencloud.cc API**: Primary data source for zen episodes
- **WebView Communication**: For player control and status updates

### Performance Considerations
- WebView rendering for zen vs native video for other servers
- Memory usage differences between embedded and native players
- Network efficiency with zen's CDN infrastructure

## Error Scenarios & Handling

1. **Missing AniList ID**: Graceful fallback with clear error message
2. **Episode Not Found**: "Episode X not found on Zen server"
3. **No Access ID**: "No access ID found for this episode on Zen server"
4. **Network Issues**: Retry logic and user-friendly error messages
5. **WebView Failures**: Fallback to other servers

## Integration Benefits

1. **Multiple Server Options**: Redundancy and choice for users
2. **Embedded Player**: Full-featured player without custom implementation
3. **Download Support**: Direct download links from zen infrastructure
4. **Quality Options**: Handled by zen's player interface
5. **Subtitle Support**: Automatic subtitle handling by embedded player

## Code Quality & Maintenance

- Clean separation between server types
- Modular design allows easy addition of new servers
- Comprehensive error handling and logging
- User experience prioritization with smooth fallbacks
- Type safety with TypeScript interfaces

## Premium Fix Implementation

**IMPLEMENTED**: HTML Wrapper solution has been applied to fix the premium detection issue:

### Changes Made:
1. **Modified zen server URL generation** (`app/anime/watch/[episodeId].tsx`):
   - Changed from direct zen player URL to wrapper URL
   - Now uses: `https://anisurge.me/zen-wrapper.html?accessId=${accessId}&a=${audioParam}&autoPlay=true`

2. **Created HTML wrapper page** (`zen-wrapper.html`):
   - Provides proper domain context for premium detection
   - Maintains message passing between React Native and zen iframe
   - Includes error handling and loading states
   - Optimized for mobile viewing

### How It Works:
1. App requests zen episode data and gets `access_id`
2. Instead of loading zen player directly, loads wrapper page from anisurge.me domain
3. Wrapper page embeds zen iframe with proper domain context
4. Zen server can now detect premium status from the anisurge.me domain
5. All controls and communication still work through message passing

### Next Steps:
1. Upload `zen-wrapper.html` to `https://anisurge.me/zen-wrapper.html`
2. Test premium functionality with ads removal
3. Monitor for any issues with message passing or controls
4. Consider adding premium status indicator in the app UI