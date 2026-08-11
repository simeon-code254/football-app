import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { VideoStatusBadge } from '@/components/videos/video-status-badge';
import { RemoveControl } from '@/components/videos/remove-control';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function VideoDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();

  const { data: video } = await supabase
    .from('videos')
    .select('*, players(*, profiles(full_name, avatar_url, phone))')
    .eq('id', params.id)
    .single();

  if (!video) notFound();

  const { data: job } = await supabase
    .from('video_analysis_jobs')
    .select('*')
    .eq('video_id', params.id)
    .maybeSingle();

  const [thumbnailUrl, sourceUrl] = await Promise.all([
    video.thumbnail_path
      ? supabase.storage
          .from('videos')
          .createSignedUrl(video.thumbnail_path, 300)
          .then((r) => r.data?.signedUrl ?? null)
      : Promise.resolve(null),
    // videos_admin_read (storage RLS) grants admin access regardless of
    // ready/removed status, so this works even for a removed or still-
    // processing upload -- that's the point: admin needs to actually watch
    // the content to decide, not just see a thumbnail.
    supabase.storage
      .from('videos')
      .createSignedUrl(video.storage_path, 300)
      .then((r) => r.data?.signedUrl ?? null),
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{video.title || 'Untitled video'}</h1>
          <p className="text-sm text-muted-foreground">
            Uploaded by {video.players?.profiles?.full_name ?? 'Unknown'}
          </p>
        </div>
        <div className="flex gap-2">
          <VideoStatusBadge status={video.status} />
          {video.is_removed && <Badge variant="destructive">Removed</Badge>}
        </div>
      </div>

      {sourceUrl ? (
        // eslint-disable-next-line jsx-a11y/media-has-caption -- user-generated highlight clips, no captions exist to attach
        <video
          controls
          poster={thumbnailUrl ?? undefined}
          src={sourceUrl}
          className="w-full max-w-md rounded-md border bg-black"
        />
      ) : (
        <p className="text-sm text-muted-foreground">Video file unavailable.</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <div>
            <span className="text-muted-foreground">Upload intent: </span>
            {video.upload_intent === 'ai_analysis' ? 'AI Analysis' : 'Highlight only'}
          </div>
          <div>
            <span className="text-muted-foreground">Views: </span>
            {video.view_count}
          </div>
          <div>
            <span className="text-muted-foreground">Uploaded: </span>
            {new Date(video.created_at).toLocaleString()}
          </div>
          {video.description && (
            <div>
              <span className="text-muted-foreground">Description: </span>
              {video.description}
            </div>
          )}
        </CardContent>
      </Card>

      {video.upload_intent === 'ai_analysis' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">AI Analysis Job</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {job ? (
              <>
                <div>
                  <span className="text-muted-foreground">Status: </span>
                  <Badge variant="outline" className="capitalize">
                    {job.status}
                  </Badge>
                </div>
                {job.error && (
                  <div>
                    <span className="text-muted-foreground">Error: </span>
                    {job.error}
                  </div>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">No job found for this video.</p>
            )}
          </CardContent>
        </Card>
      )}

      <RemoveControl
        videoId={video.id}
        isRemoved={video.is_removed}
        removedReason={video.removed_reason}
        removedAt={video.removed_at}
      />
    </div>
  );
}
