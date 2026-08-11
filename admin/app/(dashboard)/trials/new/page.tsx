import { createAdminTrial } from '@/app/actions/trials';
import { TrialForm } from '@/components/trials/trial-form';

export default function NewTrialPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">New trial</h1>
        <p className="text-sm text-muted-foreground">Posted by Matobev, not tied to a specific scout account.</p>
      </div>
      <TrialForm action={createAdminTrial} />
    </div>
  );
}
