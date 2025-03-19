import { create } from 'zustand';

interface GlobalStore {
  emailVerified: boolean;
  setEmailVerificationStatus: (status: boolean) => void;
}

export const useGlobalStore = create<GlobalStore>((set) => ({
  emailVerified: false,
  
  setEmailVerificationStatus: (status: boolean) => {
    set({ emailVerified: status });
  }
})); 