import { create } from 'zustand';

interface UserData {
  uid: string;
  email: string | null;
  displayName: string | null;
  shortId: string | null;
}

interface AuthState {
  user: UserData | null;
  isGuest: boolean;
  guestName: string | null;
  isLoading: boolean;
  
  // Actions
  setUser: (user: UserData | null) => void;
  setGuest: (name: string) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isGuest: false,
  guestName: null,
  isLoading: true, // Starts loading to prevent flicker while Firebase checks auth

  setUser: (user) => set({ user, isGuest: false, guestName: null, isLoading: false }),
  setGuest: (name) => set({ user: null, isGuest: true, guestName: name, isLoading: false }),
  setLoading: (loading) => set({ isLoading: loading }),
  logout: () => set({ user: null, isGuest: false, guestName: null, isLoading: false }),
}));
