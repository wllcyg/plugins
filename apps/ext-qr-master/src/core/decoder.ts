import jsQR from 'jsqr';
import { DecodedResult, WifiData } from '../types';

/**
 * 解析 WiFi 格式协议字符串
 * 协议样例: WIFI:S:MyHome;T:WPA;P:12345678;H:false;;
 */
export function parseWifiProtocol(raw: string): WifiData | undefined {
  if (!raw.startsWith('WIFI:')) return undefined;

  const getField = (prefix: string): string => {
    const reg = new RegExp(`(?:^|;)${prefix}:([^;]*)`);
    const match = raw.match(reg);
    return match ? match[1].replace(/\\([\\;,:"])/g, '$1') : '';
  };

  const ssid = getField('S');
  if (!ssid) return undefined;

  const enc = (getField('T') || 'WPA') as 'WPA' | 'WEP' | 'nopass';
  const password = getField('P');
  const hidden = getField('H') === 'true';

  return { ssid, password, encryption: enc, hidden };
}

/**
 * 从 HTML 图像元素或 Canvas 提取 ImageData 进行纯前端离线识码
 */
export function decodeImageData(imageData: ImageData): DecodedResult | null {
  const code = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: 'attemptBoth'
  });

  if (!code || !code.data) return null;

  const text = code.data.trim();
  const isUrl = /^https?:\/\//i.test(text);
  const wifiInfo = parseWifiProtocol(text);

  return {
    text,
    timestamp: Date.now(),
    isUrl,
    wifiInfo
  };
}

/**
 * 从 Image URL 或 Data URL 离线解码
 */
export async function decodeImageUrl(url: string): Promise<DecodedResult | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          resolve(null);
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const result = decodeImageData(imageData);
        resolve(result);
      } catch (err) {
        console.error('Canvas 解码异常(可能跨域受限):', err);
        // 如果跨域被污染，尝试通过 fetch blob 绕过
        fetchImageBlobAndDecode(url).then(resolve);
      }
    };

    img.onerror = () => {
      fetchImageBlobAndDecode(url).then(resolve);
    };

    img.src = url;
  });
}

/**
 * 跨域兜底：通过 fetch 获取 Blob 转为本地 Object URL 再解码
 */
async function fetchImageBlobAndDecode(url: string): Promise<DecodedResult | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return decodeImageBlob(blob);
  } catch {
    return null;
  }
}

/**
 * 从图片 Blob / File 进行离线识码
 */
export async function decodeImageBlob(blob: Blob): Promise<DecodedResult | null> {
  const objectUrl = URL.createObjectURL(blob);
  try {
    return await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) {
            resolve(null);
            return;
          }
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          resolve(decodeImageData(imageData));
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
