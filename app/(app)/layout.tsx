import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { StateProvider } from '@/lib/state';
import Shell from '@/components/Shell';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <StateProvider userId={user.id} userEmail={user.email ?? ''}>
      <Shell>{children}</Shell>
    </StateProvider>
  );
}
