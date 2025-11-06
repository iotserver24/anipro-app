import { useEffect } from 'react';
import { Platform } from 'react-native';
import { router } from 'expo-router';

/**
 * Hook to handle keyboard navigation for desktop/TV platforms
 * Provides keyboard shortcuts for common navigation actions
 */
export const useKeyboardNavigation = () => {
  useEffect(() => {
    // Only enable keyboard navigation on web/desktop platforms
    if (Platform.OS !== 'web') {
      return;
    }

    const handleKeyPress = (event: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      // Keyboard shortcuts
      switch (event.key) {
        case 'h':
        case 'H':
          if (!event.ctrlKey && !event.metaKey) {
            router.push('/');
          }
          break;
        case 's':
        case 'S':
          if (!event.ctrlKey && !event.metaKey) {
            router.push('/search');
          }
          break;
        case 'm':
        case 'M':
          if (!event.ctrlKey && !event.metaKey) {
            router.push('/mylist');
          }
          break;
        case 'p':
        case 'P':
          if (!event.ctrlKey && !event.metaKey) {
            router.push('/profile');
          }
          break;
        case 'c':
        case 'C':
          if (!event.ctrlKey && !event.metaKey) {
            router.push('/chat');
          }
          break;
        case 'Escape':
          if (router.canGoBack()) {
            router.back();
          }
          break;
        case '/':
          // Quick search shortcut
          event.preventDefault();
          router.push('/search');
          break;
      }
    };

    // Add event listener
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeyPress);
    }

    return () => {
      // Cleanup
      if (typeof window !== 'undefined') {
        window.removeEventListener('keydown', handleKeyPress);
      }
    };
  }, []);
};

/**
 * Get keyboard shortcut hints for display
 */
export const getKeyboardShortcuts = () => {
  return {
    home: 'H',
    search: 'S or /',
    myList: 'M',
    profile: 'P',
    chat: 'C',
    back: 'ESC',
  };
};
