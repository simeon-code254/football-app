import { LinkButton } from '@/components/ui/link-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Not found</CardTitle>
          <CardDescription>That page or record doesn&apos;t exist.</CardDescription>
        </CardHeader>
        <CardContent>
          <LinkButton href="/" className="w-full">
            Back to dashboard
          </LinkButton>
        </CardContent>
      </Card>
    </div>
  );
}
