import { requireAdmin } from '@/lib/admin-guard';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/nav/sidebar';
import { UserMenu } from '@/components/nav/user-menu';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await requireAdmin();

  const supabase = await createClient();
  const { count: openReportsCount } = await supabase
    .from('reports')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'open');

  return (
    <div className="flex min-h-screen">
      <Sidebar openReportsCount={openReportsCount ?? 0} />
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-end border-b px-6">
          <UserMenu name={profile?.full_name ?? null} email={user.email} />
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
