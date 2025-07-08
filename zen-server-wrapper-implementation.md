# Zen Server Wrapper Implementation Guide

## Problem Statement

The zen server (zencloud.cc) shows ads when accessed directly from React Native apps because they're not considered "verified domains." However, when accessed from a verified domain like `anisurge.me`, it provides ad-free premium experience.

## Solution Overview

Create an intermediate wrapper page on the verified Next.js website (`anisurge.me`) that embeds the zen server content via iframe. The React Native app will then load this wrapper page instead of directly accessing zen server.

**Flow:**
```
React Native App → WebView → anisurge.me/zen-player/[accessId] → iframe → zencloud.cc/e/[accessId]
```

## Implementation Requirements

### 1. Create New Page in Next.js Website

**File:** `pages/zen-player/[accessId].tsx` or `app/zen-player/[accessId]/page.tsx` (depending on your Next.js version)

```typescript
// pages/zen-player/[accessId].tsx (Pages Router)
// or app/zen-player/[accessId]/page.tsx (App Router)

import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';

interface ZenPlayerProps {
  accessId: string;
  audioParam: string;
  autoPlay: boolean;
}

export default function ZenPlayer() {
  const router = useRouter();
  const { accessId, a = '0', autoPlay = 'true' } = router.query;
  const [iframeUrl, setIframeUrl] = useState<string>('');

  useEffect(() => {
    if (accessId) {
      const url = `https://zencloud.cc/e/${accessId}?a=${a}&autoPlay=${autoPlay}`;
      setIframeUrl(url);
    }
  }, [accessId, a, autoPlay]);

  if (!accessId || !iframeUrl) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#000',
        color: '#fff'
      }}>
        Loading...
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Watch Episode - AniSurge</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no" />
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      
      <div style={{
        margin: 0,
        padding: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#000',
        overflow: 'hidden'
      }}>
        <iframe
          src={iframeUrl}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            margin: 0,
            padding: 0
          }}
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-pointer-lock"
        />
      </div>
      
      <style jsx global>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        html, body {
          margin: 0;
          padding: 0;
          overflow: hidden;
          background-color: #000;
        }
      `}</style>
    </>
  );
}
```

### 2. Alternative App Router Implementation (Next.js 13+)

**File:** `app/zen-player/[accessId]/page.tsx`

```typescript
'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function ZenPlayer() {
  const params = useParams();
  const searchParams = useSearchParams();
  const accessId = params.accessId as string;
  const a = searchParams.get('a') || '0';
  const autoPlay = searchParams.get('autoPlay') || 'true';
  
  const [iframeUrl, setIframeUrl] = useState<string>('');

  useEffect(() => {
    if (accessId) {
      const url = `https://zencloud.cc/e/${accessId}?a=${a}&autoPlay=${autoPlay}`;
      setIframeUrl(url);
    }
  }, [accessId, a, autoPlay]);

  if (!accessId || !iframeUrl) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#000',
        color: '#fff'
      }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{
      margin: 0,
      padding: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: '#000',
      overflow: 'hidden'
    }}>
      <iframe
        src={iframeUrl}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          margin: 0,
          padding: 0
        }}
        allowFullScreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-pointer-lock"
      />
    </div>
  );
}
```

### 3. Add Metadata (App Router)

**File:** `app/zen-player/[accessId]/layout.tsx`

```typescript
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Watch Episode - AniSurge',
  robots: 'noindex, nofollow',
};

export default function ZenPlayerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
```

### 4. Update React Native App

**In:** `app/anime/watch/[episodeId].tsx`

**Find the zen server implementation section (around lines 1236-1320) and modify:**

```typescript
} else if (selectedServer === 'zen') {
  // Zen server implementation with wrapper
  try {
    // First we need the anime's AniList ID
    let anilistId = null;
    
    // ... existing AniList ID resolution code ...
    
    if (!anilistId) {
      throw new Error("AniList ID not available for this anime on Zen server");
    }
    
    console.log(`Using AniList ID: ${anilistId} for Zen server`);
    
    // Get the episode data from zencloud.cc
    const episodeResponse = await fetch(
      `https://zencloud.cc/videos/raw?anilist_id=${anilistId}&episode=${episodeNumber}`
    );
    
    if (!episodeResponse.ok) {
      throw new Error(`Failed to fetch episode data: ${episodeResponse.status}`);
    }
    
    const episodeData = await episodeResponse.json();
    console.log("Zen episode data:", episodeData);
    
    if (!episodeData.data || episodeData.data.length === 0) {
      throw new Error(`Episode ${episodeNumber} not found on Zen server`);
    }
    
    const episodeInfo = episodeData.data[0];
    const accessId = episodeInfo.access_id;
    
    if (!accessId) {
      throw new Error("No access ID found for this episode on Zen server");
    }
    
    console.log(`Found access ID: ${accessId}`);
    
    // Use the wrapper URL instead of direct zen server URL
    const audioParam = categoryAsSubOrDub === 'dub' ? '1' : '0';
    const wrapperUrl = `https://anisurge.me/zen-player/${accessId}?a=${audioParam}&autoPlay=true`;
    console.log('Zen server wrapper URL:', wrapperUrl);
    
    // Set the video sources using the wrapper URL
    sources = {
      sources: [{
        url: wrapperUrl,
        quality: 'HD',
        isM3U8: false,
        isZenEmbedded: true // Keep this flag for WebView handling
      }],
      subtitles: [], // Subtitles are handled by the embedded player
      download: `https://zencloud.cc/d/${accessId}` // Keep direct download URL
    };
    
    console.log(`Using Zen server wrapper with access ID: ${accessId}`);
  } catch (error) {
    console.error('Error fetching Zen sources:', error);
    throw new Error(`Failed to load Zen server: ${error instanceof Error ? error.message : String(error)}`);
  }
}
```

### 5. Optional: Enhanced Wrapper with Communication

For better integration, you can add postMessage communication between the wrapper and React Native:

**Enhanced wrapper page:**

```typescript
// Add to the wrapper page component
useEffect(() => {
  // Listen for messages from React Native
  const handleMessage = (event: MessageEvent) => {
    if (event.origin !== window.location.origin) return;
    
    const iframe = document.querySelector('iframe') as HTMLIFrameElement;
    if (!iframe) return;
    
    // Forward commands to the iframe
    iframe.contentWindow?.postMessage(event.data, '*');
  };

  window.addEventListener('message', handleMessage);
  
  return () => {
    window.removeEventListener('message', handleMessage);
  };
}, []);

// Add script to forward iframe messages back to parent
useEffect(() => {
  const script = document.createElement('script');
  script.textContent = `
    window.addEventListener('message', function(event) {
      if (event.source === window.frames[0]) {
        // Forward iframe messages to React Native WebView
        window.ReactNativeWebView?.postMessage(JSON.stringify(event.data));
      }
    });
  `;
  document.head.appendChild(script);
  
  return () => {
    document.head.removeChild(script);
  };
}, []);
```

### 6. URL Structure

**Wrapper URL Format:**
```
https://anisurge.me/zen-player/[accessId]?a=[audioParam]&autoPlay=[true/false]
```

**Parameters:**
- `accessId`: The access ID from zen server API
- `a`: Audio parameter (0 for sub, 1 for dub)
- `autoPlay`: Whether to start playing automatically

**Examples:**
```
https://anisurge.me/zen-player/abc123?a=0&autoPlay=true (Sub)
https://anisurge.me/zen-player/abc123?a=1&autoPlay=true (Dub)
```

### 7. Security Considerations

1. **CORS Headers**: Ensure your Next.js site allows iframe embedding
2. **Content Security Policy**: Update CSP to allow zencloud.cc iframes
3. **Rate Limiting**: Consider adding rate limiting to prevent abuse
4. **Input Validation**: Validate accessId parameter format

### 8. Next.js Configuration Updates

**File:** `next.config.js`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Add security headers
  async headers() {
    return [
      {
        source: '/zen-player/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-src 'self' https://zencloud.cc; frame-ancestors 'self';",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

### 9. Error Handling

**Add error boundary in wrapper:**

```typescript
const [error, setError] = useState<string | null>(null);

const handleIframeError = () => {
  setError('Failed to load video player. Please try again.');
};

// In JSX:
{error ? (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    backgroundColor: '#000',
    color: '#fff',
    fontSize: '18px'
  }}>
    {error}
  </div>
) : (
  <iframe
    src={iframeUrl}
    onError={handleIframeError}
    // ... other props
  />
)}
```

### 10. Testing

1. **Test the wrapper page directly** in browser:
   - Visit `https://anisurge.me/zen-player/[test-access-id]`
   - Verify no ads appear
   - Test both sub and dub modes

2. **Test in React Native app**:
   - Switch to zen server
   - Verify WebView loads the wrapper correctly
   - Test playback controls work
   - Test fullscreen functionality

### 11. Benefits of This Approach

1. **Ad-free experience** due to verified domain
2. **Maintains existing app functionality** 
3. **No changes needed to VideoPlayer component**
4. **Preserves download functionality**
5. **Easy to maintain and update**
6. **Fallback compatibility** if wrapper fails

### 12. Deployment Checklist

- [ ] Create the wrapper page in Next.js
- [ ] Update React Native app zen server URL
- [ ] Test wrapper page functionality
- [ ] Verify ad-free playback
- [ ] Test React Native integration
- [ ] Monitor for any CORS issues
- [ ] Set up error logging

This implementation provides a clean, maintainable solution that leverages your verified domain status to remove ads while keeping the existing app architecture intact.