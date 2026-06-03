import { supabase } from './supabase';

export interface SessionUser {
  id: string;
  email: string;
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const u = data.session?.user;
  return u ? { id: u.id, email: u.email ?? '' } : null;
}

export async function signIn(email: string, password: string): Promise<SessionUser> {
  if (!supabase) throw new Error('Supabase no está configurado.');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  const u = data.user!;
  return { id: u.id, email: u.email ?? '' };
}

export async function signUp(email: string, password: string): Promise<void> {
  if (!supabase) throw new Error('Supabase no está configurado.');
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
}
