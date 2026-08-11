import Image from 'next/image';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DocumentList, type DocumentWithUrl } from '@/components/scout-verification/document-list';
import { ApproveRejectForm } from '@/components/scout-verification/approve-reject-form';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function ScoutVerificationDetailPage({ params }: { params: { scoutId: string } }) {
  const supabase = await createClient();

  const { data: scout } = await supabase
    .from('scouts')
    .select('*, profiles!id(full_name, avatar_url, phone)')
    .eq('id', params.scoutId)
    .single();

  if (!scout) notFound();

  const { data: documents } = await supabase
    .from('scout_verification_documents')
    .select('*')
    .eq('scout_id', params.scoutId)
    .order('submitted_at', { ascending: true });

  const documentsWithUrls: DocumentWithUrl[] = await Promise.all(
    (documents ?? []).map(async (doc) => {
      const { data: signed } = await supabase.storage
        .from('verification-documents')
        .createSignedUrl(doc.storage_path, 300);
      return {
        id: doc.id,
        document_type: doc.document_type,
        file_name: doc.file_name,
        submitted_at: doc.submitted_at,
        signedUrl: signed?.signedUrl ?? null,
      };
    })
  );

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        {scout.profiles?.avatar_url && (
          <Image
            src={scout.profiles.avatar_url}
            alt=""
            width={48}
            height={48}
            className="rounded-full"
            unoptimized
          />
        )}
        <div>
          <h1 className="text-2xl font-semibold">{scout.profiles?.full_name ?? 'Unnamed scout'}</h1>
          <Badge variant="outline" className="mt-1 capitalize">
            {scout.verification_status}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div>
              <span className="text-muted-foreground">Organization: </span>
              {scout.organization ?? '—'}
            </div>
            <div>
              <span className="text-muted-foreground">Phone: </span>
              {scout.profiles?.phone ?? '—'}
            </div>
            <div>
              <span className="text-muted-foreground">Scout since: </span>
              {new Date(scout.scout_since).toLocaleDateString()}
            </div>
            {scout.verification_notes && (
              <div>
                <span className="text-muted-foreground">Previous notes: </span>
                {scout.verification_notes}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Submitted documents</CardTitle>
          </CardHeader>
          <CardContent>
            <DocumentList documents={documentsWithUrls} />
          </CardContent>
        </Card>
      </div>

      <ApproveRejectForm scoutId={scout.id} status={scout.verification_status} />
    </div>
  );
}
