import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrialStatusControl } from '@/components/trials/trial-status-control';

export default async function TrialDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();

  const { data: trial } = await supabase
    .from('trials')
    .select('*, scouts(*, profiles!scouts_id_fkey(full_name, avatar_url))')
    .eq('id', params.id)
    .single();

  if (!trial) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{trial.title}</h1>
          <p className="text-sm text-muted-foreground">
            Posted by {trial.scouts?.profiles?.full_name ?? 'Matobev'}
          </p>
        </div>
        <Badge variant="outline" className="capitalize">
          {trial.status}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <div>
            <span className="text-muted-foreground">Club: </span>
            {trial.club}
          </div>
          <div>
            <span className="text-muted-foreground">Location: </span>
            {trial.location}
          </div>
          <div>
            <span className="text-muted-foreground">Trial date: </span>
            {new Date(trial.trial_date).toLocaleDateString()}
          </div>
          <div>
            <span className="text-muted-foreground">Application deadline: </span>
            {new Date(trial.application_deadline).toLocaleDateString()}
          </div>
          <div>
            <span className="text-muted-foreground">Age range: </span>
            {trial.age_min ?? '—'}–{trial.age_max ?? '—'}
          </div>
          <div>
            <span className="text-muted-foreground">Positions: </span>
            {trial.positions?.length ? trial.positions.join(', ') : 'Any'}
          </div>
          {trial.description && (
            <div>
              <span className="text-muted-foreground">Description: </span>
              {trial.description}
            </div>
          )}
        </CardContent>
      </Card>

      <TrialStatusControl trialId={trial.id} status={trial.status} />
    </div>
  );
}
