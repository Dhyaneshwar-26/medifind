import { useCallback, useEffect, useRef, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { describeSupabaseError, isSupabaseConfigured, supabase } from '../lib/supabase';
import type { ProfileRow } from '../types/database';
import type { Pharmacy, PharmacyRegistrationInput } from '../types/pharmacy';
import {
  fetchMyProfile,
  requestPasswordReset as requestPasswordResetService,
  signInWithEmail,
  signOut as signOutService,
  signUpPharmacy as signUpPharmacyService,
  updatePassword as updatePasswordService,
  type SignUpResult,
} from '../services/authService';
import { fetchMyPharmacy } from '../services/pharmacyService';

export interface UsePharmacyAuthResult {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: ProfileRow | null;
  pharmacy: Pharmacy | null;
  error: string | null;
  recoveryMode: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUpPharmacy: (input: PharmacyRegistrationInput) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  refreshOwner: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  dismissRecovery: () => void;
  clearError: () => void;
}

export function usePharmacyAuth(): UsePharmacyAuthResult {
  const [loading, setLoading] = useState<boolean>(isSupabaseConfigured);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [pharmacy, setPharmacy] = useState<Pharmacy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const mountedRef = useRef(true);

  const loadOwnerContext = useCallback(async (userId: string) => {
    try {
      const [nextProfile, nextPharmacy] = await Promise.all([
        fetchMyProfile(userId),
        fetchMyPharmacy(userId),
      ]);
      if (!mountedRef.current) return;
      setProfile(nextProfile);
      setPharmacy(nextPharmacy);
      setError(null);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(describeSupabaseError(err));
      setProfile(null);
      setPharmacy(null);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return () => {
        mountedRef.current = false;
      };
    }

    const client = supabase;
    let cancelled = false;

    const initialise = async () => {
      try {
        const { data, error: sessionError } = await client.auth.getSession();
        if (sessionError) throw sessionError;
        if (cancelled) return;
        setSession(data.session);
        if (data.session?.user) {
          await loadOwnerContext(data.session.user.id);
        }
      } catch (err) {
        if (!cancelled) setError(describeSupabaseError(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void initialise();

    const { data: authListener } = client.auth.onAuthStateChange((event, nextSession) => {
      if (cancelled) return;
      setSession(nextSession);

      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryMode(true);
      }

      if (nextSession?.user) {
        setLoading(true);
        // Defer database calls out of the auth callback. Supabase holds an auth
        // lock while this callback runs, and awaiting other Supabase queries
        // inside it can deadlock on the browser lock manager.
        const userId = nextSession.user.id;
        window.setTimeout(() => {
          if (cancelled) return;
          void loadOwnerContext(userId).finally(() => {
            if (!cancelled) setLoading(false);
          });
        }, 0);
      } else {
        setProfile(null);
        setPharmacy(null);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      mountedRef.current = false;
      authListener.subscription.unsubscribe();
    };
  }, [loadOwnerContext]);

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      await signInWithEmail(email, password);
      const user = (await supabase?.auth.getUser())?.data.user;
      if (user) await loadOwnerContext(user.id);
    } catch (err) {
      const message = describeSupabaseError(err);
      setError(message);
      throw new Error(message);
    }
  }, [loadOwnerContext]);

  const signUpPharmacy = useCallback(
    async (input: PharmacyRegistrationInput): Promise<SignUpResult> => {
      setError(null);
      try {
        const result = await signUpPharmacyService(input);
        if (!result.requiresEmailConfirmation && result.user) {
          await loadOwnerContext(result.user.id);
        }
        return result;
      } catch (err) {
        const message = describeSupabaseError(err);
        setError(message);
        throw new Error(message);
      }
    },
    [loadOwnerContext]
  );

  const signOut = useCallback(async () => {
    setError(null);
    try {
      await signOutService();
      setProfile(null);
      setPharmacy(null);
      setSession(null);
    } catch (err) {
      const message = describeSupabaseError(err);
      setError(message);
      throw new Error(message);
    }
  }, []);

  const refreshOwner = useCallback(async () => {
    const user = (await supabase?.auth.getUser())?.data.user;
    if (user) await loadOwnerContext(user.id);
  }, [loadOwnerContext]);

  const requestPasswordReset = useCallback(async (email: string) => {
    setError(null);
    try {
      await requestPasswordResetService(email);
    } catch (err) {
      const message = describeSupabaseError(err);
      setError(message);
      throw new Error(message);
    }
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    setError(null);
    try {
      await updatePasswordService(newPassword);
      setRecoveryMode(false);
    } catch (err) {
      const message = describeSupabaseError(err);
      setError(message);
      throw new Error(message);
    }
  }, []);

  const dismissRecovery = useCallback(() => setRecoveryMode(false), []);
  const clearError = useCallback(() => setError(null), []);

  return {
    configured: isSupabaseConfigured,
    loading,
    session,
    user: session?.user ?? null,
    profile,
    pharmacy,
    error,
    recoveryMode,
    signIn,
    signUpPharmacy,
    signOut,
    refreshOwner,
    requestPasswordReset,
    updatePassword,
    dismissRecovery,
    clearError,
  };
}
