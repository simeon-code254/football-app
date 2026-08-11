import Image from 'next/image';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { LoginForm } from '@/components/login-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Already signed in -- send them straight to the dashboard layout, which
  // itself sorts admin vs non-admin (/not-authorized) correctly. Avoids an
  // odd double-login UI for someone who's already got a valid session.
  if (user) redirect('/');

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <Image src="/logo.png" alt="Matobev" width={56} height={56} className="mb-2 rounded-md" priority />
          <CardTitle>Matobev Admin</CardTitle>
          <CardDescription>Sign in with your admin account.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
