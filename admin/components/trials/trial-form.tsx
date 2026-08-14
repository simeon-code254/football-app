'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

const POSITIONS = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST'] as const;

export function TrialForm({ action }: { action: (formData: FormData) => Promise<void> }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <form action={action} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" required maxLength={200} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="club">Club</Label>
              <Input id="club" name="club" required maxLength={200} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" name="location" required maxLength={200} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="age_min">Min age</Label>
                <Input id="age_min" name="age_min" type="number" min={0} max={99} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="age_max">Max age</Label>
                <Input id="age_max" name="age_max" type="number" min={0} max={99} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="trial_date">Trial date</Label>
              <Input id="trial_date" name="trial_date" type="date" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="application_deadline">Application deadline</Label>
              <Input id="application_deadline" name="application_deadline" type="date" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Positions (leave all unchecked for &quot;Any&quot;)</Label>
            <div className="flex flex-wrap gap-3">
              {POSITIONS.map((p) => (
                <label key={p} className="flex items-center gap-1 text-sm">
                  <input type="checkbox" name="positions" value={p} />
                  {p}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              name="description"
              className="min-h-24 w-full rounded-md border bg-transparent p-2 text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cover_image">Cover image (optional)</Label>
            <Input id="cover_image" name="cover_image" type="file" accept="image/*" />
          </div>

          <Button type="submit" className="w-full">
            Create trial
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
