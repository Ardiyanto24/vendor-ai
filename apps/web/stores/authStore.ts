import { create } from 'zustand';
import { User, UserRole } from 'types';

interface AuthState {
  id: string | null;
  nama: string | null;
  email: string | null;
  role: UserRole | null;
  avatarUrl: string | null;
  isAuthenticated: boolean;
  accessToken: string | null;
  setUser: (user: Partial<User> & { avatarUrl?: string | null; accessToken?: string }) => void;
  clearUser: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  id: null,
  nama: null,
  email: null,
  role: null,
  avatarUrl: null,
  isAuthenticated: false,
  accessToken: null,
  setUser: (user) => set((state) => ({
    id: user.id ?? state.id,
    nama: user.nama ?? state.nama,
    email: user.email ?? state.email,
    role: user.role ?? state.role,
    avatarUrl: user.avatarUrl ?? user.avatar_url ?? state.avatarUrl,
    isAuthenticated: true,
    accessToken: user.accessToken ?? state.accessToken,
  })),
  clearUser: () => set({
    id: null,
    nama: null,
    email: null,
    role: null,
    avatarUrl: null,
    isAuthenticated: false,
    accessToken: null,
  }),
}));
