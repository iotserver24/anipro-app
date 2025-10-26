import { create } from 'zustand';

interface GlobalStore {
  emailVerified: boolean;
  isVideoFullscreen: boolean;
  isWatchPage: boolean;
  isChatPage: boolean;
  setEmailVerificationStatus: (status: boolean) => void;
  setIsVideoFullscreen: (status: boolean) => void;
  setIsWatchPage: (status: boolean) => void;
  setIsChatPage: (status: boolean) => void;
}

export const useGlobalStore = create<GlobalStore>((set) => ({
  emailVerified: false,
  isVideoFullscreen: false,
  isWatchPage: false,
  isChatPage: false,
  
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
  }
})); 