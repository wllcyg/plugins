import JSZip from 'jszip';
import { SniffedImage } from '../types';

/**
 * 将远端图片 URL 转换为 Blob，支持自动转码为 JPG/PNG
 */
export async function fetchImageBlob(
  url: string,
  convertToJpg = false
): Promise<{ blob: Blob; ext: string }> {
  // 处理 Data URL
  if (url.startsWith('data:image/')) {
    const match = url.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
    if (match) {
      let ext = match[1] === 'svg+xml' ? 'svg' : match[1];
      const binary = atob(match[2]);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      let blob = new Blob([bytes]);

      // 若需要转码且不是 SVG
      if (convertToJpg && (ext === 'webp' || ext === 'avif')) {
        return convertBlobToJpg(blob);
      }
      return { blob, ext };
    }

    if (url.startsWith('data:image/svg+xml;charset=utf-8,')) {
      const raw = decodeURIComponent(url.replace('data:image/svg+xml;charset=utf-8,', ''));
      return { blob: new Blob([raw], { type: 'image/svg+xml' }), ext: 'svg' };
    }
  }

  // 尝试直接 fetch
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (res.ok) {
      const rawBlob = await res.blob();
      let ext = rawBlob.type.split('/')[1] || 'png';
      if (ext === 'jpeg') ext = 'jpg';

      if (convertToJpg && (ext === 'webp' || ext === 'avif')) {
        return convertBlobToJpg(rawBlob);
      }
      return { blob: rawBlob, ext };
    }
  } catch {}

  // 降级使用 Image + Canvas 绘制提取
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || 300;
      canvas.height = img.naturalHeight || 300;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // 白底填充防透明变黑
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);

        const format = convertToJpg ? 'image/jpeg' : 'image/png';
        const targetExt = convertToJpg ? 'jpg' : 'png';

        canvas.toBlob((b) => {
          if (b) resolve({ blob: b, ext: targetExt });
          else reject(new Error('Canvas toBlob failed'));
        }, format, 0.95);
      } else {
        reject(new Error('Canvas ctx failed'));
      }
    };
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

/**
 * 客户端 Canvas 内存转码：WebP/AVIF -> JPG
 */
function convertBlobToJpg(rawBlob: Blob): Promise<{ blob: Blob; ext: string }> {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(rawBlob);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(
          (b) => {
            URL.revokeObjectURL(objectUrl);
            if (b) resolve({ blob: b, ext: 'jpg' });
            else resolve({ blob: rawBlob, ext: 'webp' });
          },
          'image/jpeg',
          0.95
        );
      } else {
        URL.revokeObjectURL(objectUrl);
        resolve({ blob: rawBlob, ext: 'webp' });
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ blob: rawBlob, ext: 'webp' });
    };

    img.src = objectUrl;
  });
}

/**
 * 批量下载并打包为 ZIP，支持格式转码
 */
export async function downloadImagesAsZip(
  images: SniffedImage[],
  onProgress?: (current: number, total: number) => void,
  convertToJpg = false
): Promise<Blob> {
  const zip = new JSZip();
  const folder = zip.folder('images') || zip;
  let completed = 0;

  const downloadQueue = images.map(async (item, index) => {
    try {
      const { blob, ext } = await fetchImageBlob(item.src, convertToJpg);
      const filename = `image_${String(index + 1).padStart(3, '0')}.${ext}`;
      folder.file(filename, blob);
    } catch (err) {
      console.warn('Skip image fetch failure:', item.src, err);
    } finally {
      completed++;
      if (onProgress) {
        onProgress(completed, images.length);
      }
    }
  });

  await Promise.all(downloadQueue);
  return await zip.generateAsync({ type: 'blob' });
}

export function triggerFileDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
