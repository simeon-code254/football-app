import { supabase } from '../lib/supabase';

export type ReportTargetType = 'video' | 'profile' | 'message';

export type CreateReportInput = {
  reporterId: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
};

export async function createReport(input: CreateReportInput) {
  const { error } = await supabase.from('reports').insert({
    reporter_id: input.reporterId,
    target_type: input.targetType,
    target_id: input.targetId,
    reason: input.reason,
  });
  if (error) throw error;
}
