# Multi-Platform Responsive Navigation

This document describes the implementation of responsive navigation for the AniSurge app across multiple platforms.

## Overview

The app now supports multiple platforms with adaptive navigation:
- **Mobile** (Android, iOS): Bottom navigation bar
- **Tablets**: Side navigation bar (left side)
- **Desktop** (Windows, macOS, Linux): Side navigation bar + keyboard shortcuts
- **Android TV**: Side navigation bar + D-pad/remote support

## Features

### 1. Responsive Navigation

The navigation automatically adapts based on screen size and platform:

- **Bottom Navigation** (Mobile):
  - Shown on screens < 768px width
  - 5 main tabs: Home, Schedule, Search (center), History, Profile
  - Floating search button in the center
  - Touch-optimized with large hit areas

- **Side Navigation** (Tablets, Desktop, TV):
  - Shown on screens >= 768px width or on TV/Desktop platforms
  - Left-side vertical navigation bar (250px wide)
  - Full navigation menu with all app sections
  - Smooth animations and hover effects
  - Content automatically adjusts with left padding

### 2. Platform Detection

The app intelligently detects the platform:

```typescript
const isLargeScreen = width >= 768;
const isTV = Platform.isTV;
const isDesktop = Platform.OS === 'web' || Platform.OS === 'windows' || Platform.OS === 'macos';
const shouldUseSideNav = isLargeScreen || isTV || isDesktop;
```

### 3. TV & Remote Support

#### Android TV / Apple TV
- Automatic TV detection via `Platform.isTV`
- D-pad navigation support
- Focus management with visual feedback
- TV parallax effects for focused items
- Remote control button mapping:
  - **D-pad**: Navigate between menu items
  - **Select/OK**: Activate selected item
  - **Back**: Go back in navigation
  - **Menu**: Open app menu
  - **Play/Pause**: Control video playback

#### TV Focus Properties
```typescript
hasTVPreferredFocus: true,
tvParallaxProperties: {
  enabled: true,
  shiftDistanceX: 2.0,
  shiftDistanceY: 2.0,
  tiltAngle: 0.05,
  magnification: 1.1,
}
```

### 4. Keyboard Shortcuts (Desktop)

For desktop users, keyboard shortcuts provide quick navigation:

| Key | Action |
|-----|--------|
| `H` | Go to Home |
| `S` or `/` | Open Search |
| `M` | Go to My List |
| `P` | Go to Profile |
| `C` | Go to Chat |
| `ESC` | Go Back |

Note: Shortcuts are disabled when typing in input fields.

### 5. Touch Optimization

All navigation elements include optimized touch/press feedback:
- Animated scale effects on press
- Large hit areas for easier tapping
- Press retention offset for better UX
- Smooth transitions between states

## Components

### ResponsiveNav Component
`/components/ResponsiveNav.tsx`

Main wrapper that switches between BottomTabBar and SideNavBar based on platform/screen size.

### BottomTabBar Component
`/components/BottomTabBar.tsx`

Mobile-optimized bottom navigation with:
- Left tabs: Home, Schedule
- Center: Search button (floating)
- Right tabs: History, Profile

### SideNavBar Component
`/components/SideNavBar.tsx`

Desktop/tablet/TV navigation with:
- App logo/title at top
- Full navigation menu
- Active state indicators
- Smooth animations

## Hooks

### useIsLargeScreen
Returns `true` if the app should use side navigation.

```typescript
import { useIsLargeScreen } from '../components/ResponsiveNav';

const isLargeScreen = useIsLargeScreen();
```

### useTVRemoteHandler
Handles TV remote control events.

```typescript
import { useTVRemoteHandler } from '../hooks/useTVRemoteHandler';

useTVRemoteHandler({
  onUp: () => console.log('Up pressed'),
  onDown: () => console.log('Down pressed'),
  onSelect: () => console.log('Select pressed'),
  // ... other handlers
});
```

### useKeyboardNavigation
Provides keyboard shortcuts for desktop platforms.

```typescript
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';

// In your component
useKeyboardNavigation();
```

## Layout Adjustments

The main layout automatically adjusts content padding based on navigation type:

- **Mobile**: `paddingBottom: 60px` (for bottom nav)
- **Large Screen**: `paddingLeft: 250px` (for side nav)
- **Video Fullscreen**: No padding (navigation hidden)

## Breakpoints

```typescript
const LARGE_SCREEN_BREAKPOINT = 768; // Tablets and above
```

This can be imported and used in other components:

```typescript
import { LARGE_SCREEN_BREAKPOINT } from '../components/ResponsiveNav';
```

## Testing

### Test on Different Platforms

1. **Mobile (< 768px)**:
   - Bottom navigation should appear
   - Touch interactions should work smoothly
   - Search button should be centered and floating

2. **Tablet (>= 768px)**:
   - Side navigation should appear on the left
   - Content should have left padding
   - Navigation should scroll if many items

3. **Desktop (Web/Windows/macOS)**:
   - Side navigation should appear
   - Keyboard shortcuts should work
   - Hover effects should be visible

4. **Android TV**:
   - Side navigation should appear
   - D-pad navigation should work
   - Focus indicators should be visible
   - Remote buttons should be functional

### Test Scenarios

- [ ] Navigate between screens using bottom/side nav
- [ ] Resize window and verify navigation switches appropriately
- [ ] Test keyboard shortcuts on desktop
- [ ] Test D-pad navigation on TV
- [ ] Verify video fullscreen hides navigation
- [ ] Check that content doesn't overlap with navigation
- [ ] Test on actual devices (phone, tablet, TV)

## Known Limitations

1. TV remote support requires React Native 0.60+
2. Keyboard shortcuts only work on web platform
3. Side navigation is fixed at 250px width
4. TV focus effects only work on actual TV devices

## Future Enhancements

- [ ] Collapsible side navigation
- [ ] Customizable navigation items
- [ ] User-defined keyboard shortcuts
- [ ] Voice control for TV platforms
- [ ] Gesture navigation (swipe)
- [ ] Mini mode for side navigation
- [ ] Context-aware navigation (smart suggestions)

## Related Files

- `/app/_layout.tsx` - Main layout with navigation integration
- `/components/ResponsiveNav.tsx` - Responsive navigation wrapper
- `/components/BottomTabBar.tsx` - Mobile bottom navigation
- `/components/SideNavBar.tsx` - Desktop/tablet/TV side navigation
- `/hooks/useTVRemoteHandler.ts` - TV remote control support
- `/hooks/useKeyboardNavigation.ts` - Keyboard shortcuts
