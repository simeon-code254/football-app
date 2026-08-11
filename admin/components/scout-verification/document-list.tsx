const DOC_LABELS: Record<string, string> = {
  id_document: 'Government-issued ID',
  proof_of_organization: 'Proof of organization',
  certification: 'Coaching / scouting certification',
  other: 'Other',
};

export type DocumentWithUrl = {
  id: string;
  document_type: string;
  file_name: string | null;
  submitted_at: string;
  signedUrl: string | null;
};

export function DocumentList({ documents }: { documents: DocumentWithUrl[] }) {
  if (!documents.length) {
    return <p className="text-sm text-muted-foreground">No documents submitted.</p>;
  }

  return (
    <ul className="space-y-2">
      {documents.map((doc) => (
        <li key={doc.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
          <div>
            <div className="font-medium">{DOC_LABELS[doc.document_type] ?? doc.document_type}</div>
            <div className="text-muted-foreground">{doc.file_name ?? doc.id}</div>
          </div>
          {doc.signedUrl ? (
            <a
              href={doc.signedUrl}
              target="_blank"
              rel="noreferrer"
              className="text-primary underline underline-offset-2"
            >
              View
            </a>
          ) : (
            <span className="text-muted-foreground">Unavailable</span>
          )}
        </li>
      ))}
    </ul>
  );
}
