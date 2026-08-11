'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard' },
  { href: '/scout-verification', label: 'Scout Verification' },
  { href: '/users', label: 'Users' },
  { href: '/videos', label: 'Videos' },
  { href: '/ai-pipeline', label: 'AI Pipeline' },
  { href: '/trials', label: 'Trials' },
  { href: '/news', label: 'News' },
  { href: '/reports', label: 'Reports' },
] as const;

export function Sidebar({ openReportsCount = 0 }: { openReportsCount?: number }) {
  const pathname = usePathname();

  return (
    <nav className="flex h-full w-56 shrink-0 flex-col gap-1 border-r bg-background p-4">
      <Link href="/" className="mb-4 flex items-center gap-2 px-2">
        <Image src="/logo.png" alt="" width={28} height={28} className="rounded-sm" priority />
        <span className="text-lg font-semibold">Matobev Admin</span>
      </Link>
      {NAV_ITEMS.map((item) => {
        const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors',
              active ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:bg-muted'
            )}
          >
            {item.label}
            {item.href === '/reports' && openReportsCount > 0 && (
              <span className="rounded-full bg-destructive px-1.5 py-0.5 text-xs text-destructive-foreground">
                {openReportsCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
