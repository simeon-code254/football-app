import { supabase } from '../lib/supabase';
import { uploadFileToStorage } from '../lib/uploadFile';
import type { Database } from '../lib/database.types';

export type DocumentRow = Database['public']['Tables']['scout_verification_documents']['Row'];
export type DocumentType = 'id_document' | 'proof_of_organization' | 'certification' | 'other';

// The verification-documents bucket only allows image/jpeg, image/png, and
// application/pdf (storage_upload_limits migration) -- a mismatched
// Content-Type is rejected by Storage outright, so this always resolves to
// one of those three rather than trusting whatever (or nothing) the picker
// reported, which is what silently broke every submission before.
function resolveAllowedContentType(fileName: string, mimeType?: string | null): string {
  const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
  if (mimeType && allowed.includes(mimeType)) return mimeType;
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'png') return 'image/png';
  return 'image/jpeg';
}

export async function uploadVerificationDocument(
  scoutId: string,
  docType: DocumentType,
  fileUri: string,
  fileName: string,
  mimeType?: string | null
) {
  const path = `${scoutId}/${docType}-${Date.now()}-${fileName}`;
  await uploadFileToStorage('verification-documents', path, fileUri, resolveAllowedContentType(fileName, mimeType));
  const { error } = await supabase.from('scout_verification_documents').insert({
    scout_id: scoutId,
    document_type: docType,
    storage_path: path,
    file_name: fileName,
  });
  if (error) throw error;
}

export async function listMyDocuments(scoutId: string): Promise<DocumentRow[]> {
  const { data, error } = await supabase
    .from('scout_verification_documents')
    .select('*')
    .eq('scout_id', scoutId)
    .order('submitted_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}
