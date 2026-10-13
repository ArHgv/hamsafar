import { get, set, del } from 'idb-keyval';
import type { Attachment } from './types';
import { uid } from './utils';
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
export async function storeFile(file: File): Promise<Attachment> {
  if (!ALLOWED_MIMES.includes(file.type))
    throw new Error('فقط فایل PDF، JPG، PNG یا WebP انتخاب کنید.');
  if (file.size > 10 * 1024 * 1024) throw new Error('حجم فایل باید کمتر از ۱۰ مگابایت باشد.');
  const id = uid();
  await set(`file:${id}`, file);
  return {
    id,
    localId: id,
    name: file.name.slice(0, 150),
    size: file.size,
    mime: file.type as Attachment['mime'],
  };
}
export async function getLocalFile(id: string): Promise<Blob | undefined> {
  return get(`file:${id}`);
}
export async function removeLocalFile(id: string) {
  return del(`file:${id}`);
}
export async function compressCover(file: File): Promise<string> {
  if (!file.type.startsWith('image/') || file.size > 10 * 1024 * 1024)
    throw new Error('عکس با حجم کمتر از ۱۰ مگابایت انتخاب کنید.');
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1400 / bitmap.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  let quality = 0.82,
    data = canvas.toDataURL('image/webp', quality);
  while (data.length > 550000 && quality > 0.24) {
    quality -= 0.12;
    data = canvas.toDataURL('image/webp', quality);
  }
  if (data.length > 650000) throw new Error('عکس بزرگ است؛ تصویری کوچک‌تر انتخاب کنید.');
  return data;
}
