import type { User } from '@supabase/supabase-js';
import { describeSupabaseError, requireSupabase } from '../lib/supabase';
import type { ProfileRow } from '../types/database';
import type { PharmacyRegistrationInput } from '../types/pharmacy';
import { createPharmacyForOwner, fetchMyPharmacy } from './pharmacyService';

export interface SignUpResult {
  requiresEmailConfirmation: boolean;
  user: User | null;
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw new Error(describeSupabaseError(error));
}

function registrationMetadata(input: PharmacyRegistrationInput) {
  return {
    role: 'pharmacy_owner',
    full_name: input.ownerName.trim(),
    pharmacy_name: input.pharmacyName.trim(),
    owner_name: input.ownerName.trim(),
    address: input.address.trim(),
    area: input.area.trim(),
    district: input.district,
    pin_code: input.pinCode.trim(),
    phone: input.phone.trim(),
    emergency_phone: input.emergencyPhone?.trim() || '',
    latitude: Number(input.latitude),
    longitude: Number(input.longitude),
    opening_hours: input.openingHours.trim(),
    is_24_hours: Boolean(input.is24Hours),
    services: input.services,
  };
}

/**
 * Creates the Supabase auth user. The `handle_new_user` SQL trigger creates the
 * matching profile row and (when pharmacy metadata is present) the pharmacy row.
 * If email confirmation is enabled, no session exists yet and the trigger still
 * persists the pharmacy so the owner sees it after confirming.
 */
export async function signUpPharmacy(input: PharmacyRegistrationInput): Promise<SignUpResult> {
  const client = requireSupabase();
  const { data, error } = await client.auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: {
      data: registrationMetadata(input),
      emailRedirectTo: `${window.location.origin}`,
    },
  });

  if (error) throw new Error(describeSupabaseError(error));

  if (!data.session || !data.user) {
    return { requiresEmailConfirmation: true, user: data.user ?? null };
  }

  // Defensive fallback for projects whose trigger has not been updated yet.
  const existing = await fetchMyPharmacy(data.user.id);
  if (!existing) {
    await createPharmacyForOwner(data.user.id, input);
  }

  return { requiresEmailConfirmation: false, user: data.user };
}

export async function signOut(): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.auth.signOut();
  if (error) throw new Error(describeSupabaseError(error));
}

export async function getCurrentUser(): Promise<User | null> {
  const client = requireSupabase();
  const { data, error } = await client.auth.getUser();
  if (error) {
    // A missing session is not an application error for this app.
    if (/session|jwt|not authenticated/i.test(error.message)) return null;
    throw new Error(describeSupabaseError(error));
  }
  return data.user ?? null;
}

export async function fetchMyProfile(userId: string): Promise<ProfileRow | null> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw new Error(describeSupabaseError(error));
  return (data as ProfileRow | null) ?? null;
}

export async function requestPasswordReset(email: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${window.location.origin}?password-reset=1`,
  });
  if (error) throw new Error(describeSupabaseError(error));
}

export async function updatePassword(newPassword: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.auth.updateUser({ password: newPassword });
  if (error) throw new Error(describeSupabaseError(error));
}
