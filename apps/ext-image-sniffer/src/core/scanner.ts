import { SniffedImage } from '../types';
import { restoreHighResUrl } from './url-cleaner';

function extractFormat(url: string): string {
  if (url.startsWith('data:image/svg+xml')) return 'svg';
  if (url.startsWith('data:image/png')) return 'png';
  if (url.startsWith('data:image/jpeg') || url.startsWith('data:image/jpg')) return 'jpg';
  if (url.startsWith('data:image/webp')) return 'webp';
  if (url.startsWith('data:image/gif')) return 'gif';

  try {
    const pathname = new URL(url).pathname.toLowerCase();
    const ext = pathname.split('.').pop() || '';
    if (['jpg', 'jpeg'].includes(ext)) return 'jpg';
    if (['png', 'webp', 'svg', 'gif', 'avif'].includes(ext)) return ext;
  } catch {}

  return 'png';
}

function resolveUrl(url: string): string | null {
  if (!url || url.startsWith('javascript:') || url === 'about:blank') return null;
  if (url.startsWith('data:image/')) return url;
  try {
    return new URL(url, window.location.href).href;
  } catch {
    return null;
  }
}

function parseSrcset(srcset: string): string | null {
  if (!srcset) return null;
  const items = srcset.split(',').map((item) => item.trim());
  let bestUrl: string | null = null;
  let maxScore = 0;

  for (const item of items) {
    const parts = item.split(/\s+/);
    if (!parts[0]) continue;
    const url = resolveUrl(parts[0]);
    if (!url) continue;

    let score = 1;
    if (parts[1]) {
      const matchW = parts[1].match(/^(\d+)w$/);
      const matchX = parts[1].match(/^([\d.]+)x$/);
      if (matchW) score = parseInt(matchW[1], 10);
      else if (matchX) score = parseFloat(matchX[1]) * 1000;
    }

    if (score > maxScore) {
      maxScore = score;
      bestUrl = url;
    }
  }

  return bestUrl;
}

export function scanPageImages(): SniffedImage[] {
  const urlMap = new Map<string, SniffedImage>();
  let counter = 0;

  const addImage = (rawUrl: string, type: SniffedImage['type'], w = 0, h = 0, alt = '') => {
    let url = resolveUrl(rawUrl);
    if (!url) return;

    // 尝试去除缩放压缩参数，挖掘真·超清原图
    url = restoreHighResUrl(url);

    if (urlMap.has(url)) return;

    // 忽略 1x1 占位透明图
    if (url.includes('data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7')) {
      return;
    }

    const format = extractFormat(url);
    const id = `img_${Date.now()}_${++counter}`;

    urlMap.set(url, {
      id,
      src: url,
      type,
      format,
      width: w,
      height: h,
      alt,
      selected: true
    });
  };

  // 1. 扫描 <img> 标签
  const imgElements = Array.from(document.querySelectorAll<HTMLImageElement>('img'));
  imgElements.forEach((img) => {
    // 优先取 srcset 中的超大原图
    const srcsetUrl = parseSrcset(img.srcset || img.getAttribute('data-srcset') || '');
    if (srcsetUrl) {
      addImage(srcsetUrl, 'srcset', img.naturalWidth || img.clientWidth, img.naturalHeight || img.clientHeight, img.alt);
    }

    // 懒加载属性
    const lazySrc = img.getAttribute('data-src') || img.getAttribute('data-original') || img.getAttribute('data-lazy');
    if (lazySrc) {
      addImage(lazySrc, 'img', img.naturalWidth || img.clientWidth, img.naturalHeight || img.clientHeight, img.alt);
    }

    if (img.src || img.currentSrc) {
      addImage(img.currentSrc || img.src, 'img', img.naturalWidth || img.clientWidth, img.naturalHeight || img.clientHeight, img.alt);
    }
  });

  // 2. 扫描 <picture> 中的 <source>
  const sourceElements = Array.from(document.querySelectorAll<HTMLSourceElement>('picture source'));
  sourceElements.forEach((source) => {
    const srcset = source.srcset;
    if (srcset) {
      const best = parseSrcset(srcset);
      if (best) addImage(best, 'srcset');
    }
  });

  // 3. 扫描 CSS background-image
  const allElements = Array.from(document.querySelectorAll<HTMLElement>('*'));
  allElements.forEach((el) => {
    const style = window.getComputedStyle(el);
    const bg = style.backgroundImage;
    if (bg && bg !== 'none' && bg.startsWith('url(')) {
      const match = bg.match(/url\(["']?(.*?)["']?\)/);
      if (match && match[1]) {
        addImage(match[1], 'background', el.clientWidth, el.clientHeight);
      }
    }
  });

  // 4. 扫描大型 SVG
  const svgElements = Array.from(document.querySelectorAll<SVGSVGElement>('svg'));
  svgElements.forEach((svg) => {
    const rect = svg.getBoundingClientRect();
    if (rect.width >= 32 && rect.height >= 32) {
      try {
        const serializer = new XMLSerializer();
        const str = serializer.serializeToString(svg);
        const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(str)}`;
        addImage(dataUrl, 'svg', Math.round(rect.width), Math.round(rect.height));
      } catch {}
    }
  });

  return Array.from(urlMap.values());
}
