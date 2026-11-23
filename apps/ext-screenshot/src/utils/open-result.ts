import { t } from './i18n';

export async function openCaptureResult(image: Blob | string, filename: string): Promise<void> {
  const dataUrl = typeof image === 'string' ? image : await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(image);
  });
  const response = await chrome.runtime.sendMessage({ type: 'OPEN_CAPTURE_RESULT', dataUrl, filename });
  if (!response?.success) throw new Error(t('resultOpenFailed'));
}
