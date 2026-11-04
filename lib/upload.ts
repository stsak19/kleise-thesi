import * as ImagePicker from 'expo-image-picker';
import { sb } from './supabase';

/* Διαλέγεις φωτογραφία από τη συσκευή και ανεβαίνει στο Supabase Storage (bucket business-media).
   Επιστρέφει το δημόσιο URL ή null αν ακυρώθηκε. */
export async function pickAndUpload(uid: string, kind: 'logo' | 'cover'): Promise<string | null> {
  const r = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'], allowsEditing: true, aspect: kind === 'logo' ? [1, 1] : [16, 9], quality: 0.7,
  });
  if (r.canceled || !r.assets?.length) return null;
  const a = r.assets[0];
  const type = a.mimeType || 'image/jpeg';
  const ext = type.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
  const body = await (await fetch(a.uri)).arrayBuffer();
  const path = `${uid}/${kind}-${Date.now()}.${ext}`;
  const { error } = await sb.storage.from('business-media').upload(path, body, { contentType: type, upsert: true });
  if (error) throw new Error(error.message);
  return sb.storage.from('business-media').getPublicUrl(path).data.publicUrl;
}
