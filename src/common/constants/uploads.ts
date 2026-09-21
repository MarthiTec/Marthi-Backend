/** ~400kb binário em data URL (base64). */
export const DATA_URL_MAX_CHARS = 560_000;
export const MAX_WORK_ORDER_PHOTOS = 8;

export function isImageDataUrl(value: string): boolean {
  return value.startsWith('data:image/');
}
