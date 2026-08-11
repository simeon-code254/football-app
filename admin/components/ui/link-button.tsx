import Link from 'next/link';
import type { ComponentProps } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { VariantProps } from 'class-variance-authority';

// This shadcn registry's Button (base-ui, not radix-ui) has no `asChild`
// prop, so a Link styled as a button needs its own small wrapper instead of
// the usual <Button asChild><Link/></Button> pattern.
type Props = ComponentProps<typeof Link> & VariantProps<typeof buttonVariants>;

export function LinkButton({ className, variant, size, ...props }: Props) {
  return <Link className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
