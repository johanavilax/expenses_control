import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { StateProvider } from '@/lib/state';
import Shell from '@/components/Shell';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Hogar al que pertenece el usuario (datos compartidos). Si no hay, usa su uid.
  const { data: membership } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', user.id)
    .maybeSingle();
  const storageKey = membership?.household_id ?? user.id;

  return (
    <StateProvider storageKey={storageKey} userId={user.id} userEmail={user.email ?? ''}>
      <Shell>{children}</Shell>
    </StateProvider>
  );
}
