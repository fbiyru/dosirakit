import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function Home() {
  const supabase = createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  // Check how many brands exist
  const { data: brands } = await supabase
    .from('brands')
    .select('id')
    .limit(3);

  const brandCount = brands?.length ?? 0;

  if (brandCount === 0) {
    redirect('/onboarding');
  } else if (brandCount === 1) {
    redirect('/dashboard');
  } else {
    redirect('/brands/switch');
  }
}
