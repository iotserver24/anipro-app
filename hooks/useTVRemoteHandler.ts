import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

interface TVRemoteHandlerConfig {
  onUp?: () => void;
  onDown?: () => void;
  onLeft?: () => void;
  onRight?: () => void;
  onSelect?: () => void;
  onLongSelect?: () => void;
  onPlayPause?: () => void;
  onMenu?: () => void;
  onBack?: () => void;
}

/**
 * Hook to handle TV remote control events
 * Supports Android TV, Apple TV, and other TV platforms
 * Note: TVEventHandler is only available in React Native TV builds
 */
export const useTVRemoteHandler = (config: TVRemoteHandlerConfig) => {
  const tvEventHandlerRef = useRef<any>(null);

  useEffect(() => {
    // Only set up TV event handler on TV platforms
    if (!Platform.isTV) {
      return;
    }

    // Try to import TVEventHandler (only available in TV builds)
    let TVEventHandler: any;
    try {
      TVEventHandler = require('react-native').TVEventHandler;
    } catch (e) {
      console.warn('TVEventHandler not available in this React Native build');
      return;
    }

    if (!TVEventHandler) {
      return;
    }

    const tvEventHandler = new TVEventHandler();
    tvEventHandlerRef.current = tvEventHandler;

    tvEventHandler.enable(null, (component: any, evt: any) => {
      const eventType = evt.eventType;

      switch (eventType) {
        case 'up':
          config.onUp?.();
          break;
        case 'down':
          config.onDown?.();
          break;
        case 'left':
          config.onLeft?.();
          break;
        case 'right':
          config.onRight?.();
          break;
        case 'select':
          config.onSelect?.();
          break;
        case 'longSelect':
          config.onLongSelect?.();
          break;
        case 'playPause':
          config.onPlayPause?.();
          break;
        case 'menu':
          config.onMenu?.();
          break;
        case 'back':
          config.onBack?.();
          break;
      }
    });

    return () => {
      if (tvEventHandlerRef.current) {
        tvEventHandlerRef.current.disable();
        tvEventHandlerRef.current = null;
      }
    };
  }, [config]);

  return tvEventHandlerRef;
};

/**
 * Hook to check if the app is running on a TV platform
 */
export const useIsTV = () => {
  return Platform.isTV;
};

/**
 * Get TV-specific focus properties for touchable components
 */
export const getTVFocusProps = (isFocused: boolean = false) => {
  if (!Platform.isTV) {
    return {};
  }

  return {
    hasTVPreferredFocus: isFocused,
    tvParallaxProperties: {
      enabled: true,
      shiftDistanceX: 2.0,
      shiftDistanceY: 2.0,
      tiltAngle: 0.05,
      magnification: 1.1,
    },
  };
};
