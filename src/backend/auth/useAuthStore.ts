import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { AuthService } from './authService';
import type { AuthSession } from '../types';

interface AuthStoreState extends AuthSession {
  isAuthModalOpen: boolean;
  authModalTab: 'login' | 'signup' | 'reset';
  isAccountSettingsOpen: boolean;

  openAuthModal: (tab?: 'login' | 'signup' | 'reset') => void;
  closeAuthModal: () => void;
  openAccountSettings: () => void;
  closeAccountSettings: () => void;

  initialize: () => Promise<void>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ success: boolean; error?: string }>;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (fullName?: string, avatarUrl?: string) => Promise<boolean>;
  refreshProfile: () => Promise<void>;
  setOfflineMode: (offline: boolean) => void;
}

export const useAuthStore = create<AuthStoreState>((set, get) => ({
  user: null,
  profile: null,
  isAuthenticated: false,
  isOfflineMode: !isSupabaseConfigured(),
  isLoading: true,
  isAuthModalOpen: false,
  authModalTab: 'login',
  isAccountSettingsOpen: false,

  openAuthModal: (tab = 'login') => set({ isAuthModalOpen: true, authModalTab: tab }),
  closeAuthModal: () => set({ isAuthModalOpen: false }),
  openAccountSettings: () => set({ isAccountSettingsOpen: true }),
  closeAccountSettings: () => set({ isAccountSettingsOpen: false }),

  setOfflineMode: (offline: boolean) => set({ isOfflineMode: offline }),

  initialize: async () => {
    set({ isLoading: true });

    if (!isSupabaseConfigured()) {
      // Local mock check
      const raw = localStorage.getItem('banava_mock_auth_user_v7');
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          set({
            user: parsed.user,
            profile: parsed.profile,
            isAuthenticated: true,
            isOfflineMode: true,
            isLoading: false,
          });
          return;
        } catch {
          // invalid mock data
        }
      }
      set({ isLoading: false, isOfflineMode: true });
      return;
    }

    try {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        const user = {
          id: data.session.user.id,
          email: data.session.user.email || '',
          fullName: data.session.user.user_metadata?.full_name || '',
          avatarUrl: data.session.user.user_metadata?.avatar_url || '',
        };
        const profile = await AuthService.getUserProfile(user.id);
        set({
          user,
          profile,
          isAuthenticated: true,
          isOfflineMode: false,
          isLoading: false,
        });
      } else {
        set({ user: null, profile: null, isAuthenticated: false, isLoading: false });
      }

      // Listen for auth state changes
      supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          const user = {
            id: session.user.id,
            email: session.user.email || '',
            fullName: session.user.user_metadata?.full_name || '',
            avatarUrl: session.user.user_metadata?.avatar_url || '',
          };
          const profile = await AuthService.getUserProfile(user.id);
          set({ user, profile, isAuthenticated: true, isOfflineMode: false });
        } else {
          set({ user: null, profile: null, isAuthenticated: false });
        }
      });
    } catch (err) {
      console.error('Failed to initialize auth state:', err);
      set({ isLoading: false });
    }
  },

  signUp: async (email, password, fullName) => {
    set({ isLoading: true });
    const { user, profile, error } = await AuthService.signUp(email, password, fullName);
    set({ isLoading: false });

    if (error) return { success: false, error: error.message };
    if (user) {
      set({
        user: {
          id: user.id,
          email: user.email,
          fullName: profile?.fullName || fullName || '',
          avatarUrl: profile?.avatarUrl || '',
        },
        profile,
        isAuthenticated: true,
        isAuthModalOpen: false,
      });
      return { success: true };
    }
    return { success: false, error: 'Registration failed' };
  },

  login: async (email, password) => {
    set({ isLoading: true });
    const { user, profile, error } = await AuthService.signInWithPassword(email, password);
    set({ isLoading: false });

    if (error) return { success: false, error: error.message };
    if (user) {
      set({
        user: {
          id: user.id,
          email: user.email,
          fullName: profile?.fullName || user.user_metadata?.full_name || '',
          avatarUrl: profile?.avatarUrl || user.user_metadata?.avatar_url || '',
        },
        profile,
        isAuthenticated: true,
        isAuthModalOpen: false,
      });
      return { success: true };
    }
    return { success: false, error: 'Login failed' };
  },

  loginWithGoogle: async () => {
    const { error } = await AuthService.signInWithGoogle();
    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  logout: async () => {
    set({ isLoading: true });
    await AuthService.signOut();
    set({
      user: null,
      profile: null,
      isAuthenticated: false,
      isAccountSettingsOpen: false,
      isLoading: false,
    });
  },

  resetPassword: async (email) => {
    set({ isLoading: true });
    const { error } = await AuthService.resetPassword(email);
    set({ isLoading: false });
    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  updateProfile: async (fullName, avatarUrl) => {
    const { user } = get();
    if (!user) return false;

    const success = await AuthService.updateProfile(user.id, { fullName, avatarUrl });
    if (success) {
      await get().refreshProfile();
    }
    return success;
  },

  refreshProfile: async () => {
    const { user } = get();
    if (!user) return;
    const profile = await AuthService.getUserProfile(user.id);
    if (profile) {
      set({
        profile,
        user: {
          ...user,
          fullName: profile.fullName || user.fullName,
          avatarUrl: profile.avatarUrl || user.avatarUrl,
        },
      });
    }
  },
}));
