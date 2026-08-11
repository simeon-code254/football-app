import { createClient } from '@/lib/supabase/server';
import { signOut } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function NotAuthorizedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Not an admin account</CardTitle>
          <CardDescription>
            {user?.email ?? 'This account'} does not have admin access to Matobev. If you believe this is a
            mistake, contact whoever manages the Supabase project.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={signOut}>
            <Button type="submit" variant="outline" className="w-full">
              Sign out
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
