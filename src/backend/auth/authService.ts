import { supabase, isSupabaseConfigured } from '../supabaseClient';
import type { UserProfile } from '../types';

const LOCAL_STORAGE_KEY_MOCK_USER = 'banava_mock_auth_user_v7';

export class AuthService {
  /**
   * Sign up with email and password
   */
  public static async signUp(
    email: string,
    password: string,
    fullName?: string
  ): Promise<{ user: any; profile: UserProfile | null; error: Error | null }> {
    if (!isSupabaseConfigured()) {
      // Offline / Local Mock Mode
      const mockUser = {
        id: `user_mock_${Date.now()}`,
        email,
        fullName: fullName || email.split('@')[0],
        avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName || email)}`,
      };
      const mockProfile: UserProfile = {
        id: mockUser.id,
        email: mockUser.email,
        fullName: mockUser.fullName,
        avatarUrl: mockUser.avatarUrl,
        storageUsedBytes: 0,
        storageLimitBytes: 100 * 1024 * 1024, // 100 MB free
        tier: 'free',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(LOCAL_STORAGE_KEY_MOCK_USER, JSON.stringify({ user: mockUser, profile: mockProfile }));
      return { user: mockUser, profile: mockProfile, error: null };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName || email)}`,
          },
        },
      });

      if (error) return { user: null, profile: null, error };

      let profile: UserProfile | null = null;
      if (data.user) {
        profile = await this.getUserProfile(data.user.id);
      }

      return { user: data.user, profile, error: null };
    } catch (err: any) {
      return { user: null, profile: null, error: err };
    }
  }

  /**
   * Sign in with email and password
   */
  public static async signInWithPassword(
    email: string,
    password: string
  ): Promise<{ user: any; profile: UserProfile | null; error: Error | null }> {
    if (!isSupabaseConfigured()) {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY_MOCK_USER);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { user: parsed.user, profile: parsed.profile, error: null };
      }
      return this.signUp(email, password);
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) return { user: null, profile: null, error };

      let profile: UserProfile | null = null;
      if (data.user) {
        profile = await this.getUserProfile(data.user.id);
      }

      return { user: data.user, profile, error: null };
    } catch (err: any) {
      return { user: null, profile: null, error: err };
    }
  }

  /**
   * Sign in with Google OAuth
   */
  public static async signInWithGoogle(): Promise<{ error: Error | null }> {
    if (!isSupabaseConfigured()) {
      await this.signUp('google_user@banava.app', 'demo123', 'Google User');
      return { error: null };
    }

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      return { error };
    } catch (err: any) {
      return { error: err };
    }
  }

  /**
   * Send Password Reset Email
   */
  public static async resetPassword(email: string): Promise<{ error: Error | null }> {
    if (!isSupabaseConfigured()) {
      return { error: null };
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      return { error };
    } catch (err: any) {
      return { error: err };
    }
  }

  /**
   * Update current user's password
   */
  public static async updatePassword(newPassword: string): Promise<{ error: Error | null }> {
    if (!isSupabaseConfigured()) {
      return { error: null };
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      return { error };
    } catch (err: any) {
      return { error: err };
    }
  }

  /**
   * Sign out current user
   */
  public static async signOut(): Promise<{ error: Error | null }> {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(LOCAL_STORAGE_KEY_MOCK_USER);
    }
    if (!isSupabaseConfigured()) {
      return { error: null };
    }

    try {
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (err: any) {
      return { error: err };
    }
  }

  public static async login(email: string, password: string) {
    return this.signInWithPassword(email, password);
  }

  public static async logout() {
    return this.signOut();
  }

  public static async getSession(): Promise<{ user: any; profile: UserProfile | null } | null> {
    if (!isSupabaseConfigured()) {
      if (typeof localStorage === 'undefined') return null;
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY_MOCK_USER);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return { user: parsed.user, profile: parsed.profile };
    }

    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session?.user) return null;
      const profile = await this.getUserProfile(data.session.user.id);
      return { user: data.session.user, profile };
    } catch {
      return null;
    }
  }

  /**
   * Fetch user profile from public.profiles table
   */
  public static async getUserProfile(userId: string): Promise<UserProfile | null> {
    if (!isSupabaseConfigured()) {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY_MOCK_USER);
      return raw ? JSON.parse(raw).profile : null;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !data) {
        // Create fallback profile if not found
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user) {
          const newProfile: UserProfile = {
            id: userId,
            email: userData.user.email || '',
            fullName: userData.user.user_metadata?.full_name || '',
            avatarUrl: userData.user.user_metadata?.avatar_url || '',
            storageUsedBytes: 0,
            storageLimitBytes: 100 * 1024 * 1024,
            tier: 'free',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          await supabase.from('profiles').upsert(newProfile);
          return newProfile;
        }
        return null;
      }

      return {
        id: data.id,
        email: data.email,
        fullName: data.full_name,
        avatarUrl: data.avatar_url,
        storageUsedBytes: Number(data.storage_used_bytes) || 0,
        storageLimitBytes: 100 * 1024 * 1024,
        tier: data.tier || 'free',
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch {
      return null;
    }
  }

  /**
   * Update Profile details (Full name, avatar)
   */
  public static async updateProfile(
    userId: string,
    updates: { fullName?: string; avatarUrl?: string }
  ): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY_MOCK_USER);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (updates.fullName) {
          parsed.user.fullName = updates.fullName;
          parsed.profile.fullName = updates.fullName;
        }
        if (updates.avatarUrl) {
          parsed.user.avatarUrl = updates.avatarUrl;
          parsed.profile.avatarUrl = updates.avatarUrl;
        }
        localStorage.setItem(LOCAL_STORAGE_KEY_MOCK_USER, JSON.stringify(parsed));
      }
      return true;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: updates.fullName,
          avatar_url: updates.avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      return !error;
    } catch {
      return false;
    }
  }
}
