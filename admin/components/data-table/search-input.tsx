'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';

export function SearchInput({ placeholder = 'Search…' }: { placeholder?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get('q') ?? '');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set('q', value);
      else params.delete('q');
      params.delete('page');
      router.push(`${pathname}?${params.toString()}`);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, 300);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <Input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder={placeholder}
      className="max-w-xs"
    />
  );
}
