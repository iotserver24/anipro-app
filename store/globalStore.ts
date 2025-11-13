import { create } from 'zustand';

interface GlobalStore {
  emailVerified: boolean;
  isVideoFullscreen: boolean;
  isWatchPage: boolean;
  isChatPage: boolean;
  isMenuOpen: boolean;
  setEmailVerificationStatus: (status: boolean) => void;
  setIsVideoFullscreen: (status: boolean) => void;
  setIsWatchPage: (status: boolean) => void;
  setIsChatPage: (status: boolean) => void;
  setIsMenuOpen: (status: boolean) => void;
  toggleMenu: () => void;
}

export const useGlobalStore = create<GlobalStore>((set) => ({
  emailVerified: false,
  isVideoFullscreen: false,
  isWatchPage: false,
  isChatPage: false,
  isMenuOpen: false,
  
  setEmailVerificationStatus: (status: boolean) => {
    set({ emailVerified: status });
  },
  setIsVideoFullscreen: (status: boolean) => {
    set({ isVideoFullscreen: status });
  },
  setIsWatchPage: (status: boolean) => {
    set({ isWatchPage: status });
  },
  setIsChatPage: (status: boolean) => {
    set({ isChatPage: status });
  },
  setIsMenuOpen: (status: boolean) => {
    set({ isMenuOpen: status });
  },
  toggleMenu: () => {
    set((state) => ({ isMenuOpen: !state.isMenuOpen }));
  }
})); 