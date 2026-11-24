/**
 * 智能去除 CDN 压缩与缩放参数，挖掘「真·超清原始大图」
 */
export function restoreHighResUrl(url: string): string {
  if (!url || url.startsWith('data:')) return url;

  let clean = url;

  try {
    // 1. Unsplash: 移除低质量参数，保留最高质量
    if (clean.includes('images.unsplash.com')) {
      const u = new URL(clean);
      u.searchParams.delete('w');
      u.searchParams.delete('h');
      u.searchParams.delete('crop');
      u.searchParams.set('q', '100'); // 最高质量
      clean = u.toString();
    }

    // 2. 阿里云 OSS / 淘宝 / 1688 / 天猫
    // 格式如: xxx.jpg_400x400.jpg 或 xxx.jpg_300x300q90.jpg 或 xxx.jpg_.webp
    clean = clean.replace(/_\d+x\d+.*?\.(jpg|jpeg|png|webp)$/i, '');
    clean = clean.replace(/\._\.webp$/i, '');
    clean = clean.replace(/_\.webp$/i, '');
    clean = clean.replace(/([?&])x-oss-process=[^&]+/g, '');

    // 3. 腾讯云 COS / 微信公众号
    clean = clean.replace(/([?&])imageMogr2\/[^&]+/g, '');

    // 4. 七牛云 / 小红书 CDN
    clean = clean.replace(/([?&])imageView2\/[^&]+/g, '');

    // 5. 新浪微博图床: thumbnail / bmiddle / mw690 替换为 large (最高清原图)
    if (clean.includes('sinaimg.cn')) {
      clean = clean.replace(/\/(thumbnail|bmiddle|mw690|mw1024)\//, '/large/');
    }

    // 6. 京东图片: 缩略图路径 n5, n4, n3, n2 替换为原图 n0
    if (clean.includes('360buyimg.com')) {
      clean = clean.replace(/\/n[1-9]\//, '/n0/');
      clean = clean.replace(/s\d+x\d+_[a-z0-9_]*\//i, '');
    }

    // 7. 知乎图床: _720w.jpg / _b.jpg 替换为 _r.jpg (Raw 原图)
    if (clean.includes('zhimg.com')) {
      clean = clean.replace(/_\d+w\.(jpg|jpeg|png|webp)/, '_r.$1');
      clean = clean.replace(/_b\.(jpg|jpeg|png|webp)/, '_r.$1');
    }

    // 清理可能产生的末尾问号或空参数
    clean = clean.replace(/[?&]$/, '');
  } catch {}

  return clean;
}
