/**
 * 全网已知营销、跟踪与分析参数列表
 */
export const TRACKING_PARAM_PATTERNS: RegExp[] = [
  // 1. Google Analytics / UTM 标准推广参数
  /^utm_(source|medium|campaign|term|content|id|referrer|reader|term_id)$/i,

  // 2. 阿里系 (淘宝 / 天猫 / 1688 / 闲鱼)
  /^spm(_id_from)?$/i,
  /^scm$/i,
  /^from_source$/i,
  /^alitrackid$/i,
  /^pos$/i,
  /^bx_uuid$/i,

  // 3. 哔哩哔哩 (Bilibili)
  /^vd_source$/i,
  /^from_spmid$/i,
  /^share_source$/i,
  /^share_medium$/i,
  /^share_plat$/i,
  /^share_session_id$/i,
  /^share_tag$/i,
  /^bbid$/i,
  /^ts$/i,
  /^unique_k$/i,

  // 4. 腾讯系 (微信 / QQ / 腾讯视频)
  /^isappinstalled$/i,
  /^scene$/i,
  /^subscene$/i,
  /^clicktime$/i,
  /^enterid$/i,
  /^sessionid$/i,
  /^sharer_shareinfo$/i,
  /^sharer_shareinfo_extra$/i,

  // 5. 字节系 (抖音 / 今日头条 / 懂车帝)
  /^_signature$/i,
  /^from_aid$/i,
  /^share_token$/i,
  /^ug_source$/i,
  /^share_item_id$/i,

  // 6. 各大广告与跟踪系统
  /^bd_vid$/i,       // 百度推广
  /^gclid$/i,        // Google Ads
  /^fbclid$/i,       // Facebook
  /^msclkid$/i,      // Bing Ads
  /^igshid$/i,       // Instagram
  /^zanpid$/i,       // 阿里妈妈
  /^cn_vid$/i,

  // 7. 社区平台小尾巴 (知乎 / 小红书 / 微博 / 少数派)
  /^share_id$/i,
  /^share_tracking_id$/i,
  /^weibo_id$/i,
  /^utm_psn$/i,
  /^zop_/i
];

/**
 * 剥离 URL 中的追踪与营销参数
 */
export function cleanTrackingParams(rawUrl: string): { cleanedUrl: string; removedCount: number } {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { cleanedUrl: rawUrl, removedCount: 0 };
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { cleanedUrl: rawUrl, removedCount: 0 };
  }

  let removedCount = 0;
  const keysToDelete: string[] = [];

  for (const [key] of parsed.searchParams.entries()) {
    const isTracking = TRACKING_PARAM_PATTERNS.some((pattern) => pattern.test(key));
    if (isTracking) {
      keysToDelete.push(key);
    }
  }

  for (const key of keysToDelete) {
    parsed.searchParams.delete(key);
    removedCount++;
  }

  // 处理 Hash 内部的 query 参数（例如某些 SPA 使用 hash 路由: #/path?utm_source=...）
  if (parsed.hash && parsed.hash.includes('?')) {
    const hashIndex = parsed.hash.indexOf('?');
    const hashPath = parsed.hash.slice(0, hashIndex);
    const hashQuery = parsed.hash.slice(hashIndex + 1);

    try {
      const hashParams = new URLSearchParams(hashQuery);
      const hashKeysToDelete: string[] = [];

      for (const [key] of hashParams.entries()) {
        if (TRACKING_PARAM_PATTERNS.some((p) => p.test(key))) {
          hashKeysToDelete.push(key);
        }
      }

      for (const key of hashKeysToDelete) {
        hashParams.delete(key);
        removedCount++;
      }

      const newHashQuery = hashParams.toString();
      parsed.hash = newHashQuery ? `${hashPath}?${newHashQuery}` : hashPath;
    } catch {
      // ignore
    }
  }

  return {
    cleanedUrl: parsed.toString(),
    removedCount
  };
}
