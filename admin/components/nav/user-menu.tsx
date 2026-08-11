import { signOut } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';

export function UserMenu({ name, email }: { name: string | null; email: string | null | undefined }) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-right text-sm">
        <div className="font-medium">{name ?? 'Admin'}</div>
        <div className="text-muted-foreground">{email}</div>
      </div>
      <form action={signOut}>
        <Button type="submit" variant="outline" size="sm">
          Sign out
        </Button>
      </form>
    </div>
  );
}
