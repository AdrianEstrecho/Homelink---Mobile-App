/**
 * Ported from frontend/src/utils/imageUpload.js. There is no upload endpoint — images travel as
 * base64 data URLs inside ordinary JSON bodies, the same way product and gallery images do.
 */
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const MAX_IMAGE_MB = 5;

export function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('That image could not be read.'));
    reader.readAsDataURL(file);
  });
}

/** Decoded byte count of a data URL, without allocating the buffer — keeps a request under the
 *  server's body limit before it's sent, since a 413 surfaces as a bare "Request failed". */
export function dataUrlBytes(dataUrl: string): number {
  const b64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const padding = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - padding;
}

/** A phone camera produces 4-12MB photos and a customer can't shrink them, so re-encode instead
 *  of rejecting: longest edge to 1280px as JPEG, which lands around 150-350KB. */
export async function downscaleImage(file: File, { maxEdge = 1280, quality = 0.8 } = {}): Promise<string> {
  // GIFs are usually animated and a canvas would flatten them to one frame.
  if (file.type === 'image/gif') return readAsDataUrl(file);

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // Sending the original beats failing outright; the server has its own size backstop.
    return readAsDataUrl(file);
  }

  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!blob) return readAsDataUrl(file);
  return readAsDataUrl(blob);
}

/** Returns an error string, or '' when the file is usable. */
export function validateImageFile(file: File | null | undefined, maxMb = MAX_IMAGE_MB): string {
  if (!file) return 'No file selected.';
  if (/heic|heif/i.test(file.type)) return 'HEIC photos aren’t supported. Please choose JPG or PNG.';
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return 'Please upload a JPG, PNG, WebP, or GIF image.';
  if (file.size > maxMb * 1024 * 1024) return `Image must be smaller than ${maxMb}MB.`;
  return '';
}

/** Profile photos only ever render as a small circle or rounded square, so crop to a centred
 *  square and shrink to 400px — roughly 30-60KB as JPEG, cheap enough to ride along on every
 *  /auth/me. The white fill stops a transparent PNG from flattening to a black background. */
export async function squareAvatar(file: File, { size = 400, quality = 0.85 } = {}): Promise<string> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('That image could not be read. Please choose a JPG or PNG.');
  }

  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = Math.min(size, side);
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, canvas.width, canvas.height);
  }
  bitmap.close?.();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!blob) throw new Error('That image could not be read. Please choose a JPG or PNG.');
  return readAsDataUrl(blob);
}
