import { supabase } from '../lib/supabase';
import { uploadFileToStorage } from '../lib/uploadFile';
import type { Database } from '../lib/database.types';

export type DocumentRow = Database['public']['Tables']['scout_verification_documents']['Row'];
export type DocumentType = 'id_document' | 'proof_of_organization' | 'certification' | 'other';

export async function uploadVerificationDocument(
  scoutId: string,
  docType: DocumentType,
  fileUri: string,
  fileName: string
) {
  const path = `${scoutId}/${docType}-${Date.now()}-${fileName}`;
  await uploadFileToStorage('verification-documents', path, fileUri, 'application/octet-stream');
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
