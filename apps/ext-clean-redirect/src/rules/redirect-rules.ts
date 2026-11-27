import type { PlatformRule } from '../types';
import { m } from '../locales';

/**
 * 尝试对目标 URL 进行安全解码（支持多层 URL 编码防护）
 */
export function safeDecodeUrl(val: string): string | null {
  if (!val) return null;
  let decoded = val.trim();
  for (let i = 0; i < 3; i++) {
    try {
      if (/%[0-9a-fA-F]{2}/.test(decoded)) {
        decoded = decodeURIComponent(decoded);
      } else {
        break;
      }
    } catch {
      break;
    }
  }

  // 校验是否为合法外链 http/https 协议
  if (/^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(decoded)) {
    return decoded;
  }
  return null;
}

/**
 * 国内外主流平台已知中转规则库
 */
export const KNOWN_PLATFORM_RULES: PlatformRule[] = [
  {
    id: 'zhihu',
    name: m.platforms.zhihu,
    domain: 'link.zhihu.com',
    targetExtractor: (url) => safeDecodeUrl(url.searchParams.get('target') || '')
  },
  {
    id: 'jianshu',
    name: m.platforms.jianshu,
    domain: /(^|\.)jianshu\.com$/,
    pathPattern: /^\/go-wild/,
    targetExtractor: (url) => safeDecodeUrl(url.searchParams.get('url') || '')
  },
  {
    id: 'juejin',
    name: m.platforms.juejin,
    domain: 'link.juejin.cn',
    targetExtractor: (url) => safeDecodeUrl(url.searchParams.get('target') || '')
  },
  {
    id: 'csdn',
    name: m.platforms.csdn,
    domain: 'link.csdn.net',
    targetExtractor: (url) => safeDecodeUrl(url.searchParams.get('target') || '')
  },
  {
    id: 'gitee',
    name: m.platforms.gitee,
    domain: /(^|\.)gitee\.com$/,
    pathPattern: /^\/link/,
    targetExtractor: (url) => safeDecodeUrl(url.searchParams.get('target') || '')
  },
  {
    id: 'sspai',
    name: m.platforms.sspai,
    domain: /(^|\.)sspai\.com$/,
    pathPattern: /^\/link/,
    targetExtractor: (url) => safeDecodeUrl(url.searchParams.get('target') || '')
  },
  {
    id: 'segmentfault',
    name: m.platforms.segmentfault,
    domain: /(^|\.)segmentfault\.com$/,
    pathPattern: /^\/check-link/,
    targetExtractor: (url) => safeDecodeUrl(url.searchParams.get('url') || '')
  },
  {
    id: 'oschina',
    name: m.platforms.oschina,
    domain: /(^|\.)oschina\.net$/,
    pathPattern: /^\/action\/go/,
    targetExtractor: (url) => safeDecodeUrl(url.searchParams.get('url') || url.searchParams.get('id') || '')
  },
  {
    id: 'weibo',
    name: m.platforms.weibo,
    domain: /(^|\.)weibo\.(com|cn)$/,
    pathPattern: /^(\/sinaurl|\/special\/redir)/,
    targetExtractor: (url) => safeDecodeUrl(url.searchParams.get('u') || url.searchParams.get('url') || '')
  },
  {
    id: 'qq-mail',
    name: m.platforms['qq-mail'],
    domain: 'mail.qq.com',
    pathPattern: /^\/cgi-bin\/readtemplate/,
    targetExtractor: (url) => safeDecodeUrl(url.searchParams.get('gourl') || url.searchParams.get('url') || '')
  },
  {
    id: 'qq-cpc',
    name: m.platforms['qq-cpc'],
    domain: 'c.pc.qq.com',
    targetExtractor: (url) => safeDecodeUrl(url.searchParams.get('pfurl') || url.searchParams.get('url') || '')
  },
  {
    id: 'baidu-tieba',
    name: m.platforms['baidu-tieba'],
    domain: /(tieba\.baidu\.com|jump\.bdimg\.com)$/,
    targetExtractor: (url) => safeDecodeUrl(url.searchParams.get('url') || url.searchParams.get('target') || '')
  }
];

const HEURISTIC_PARAM_KEYS = [
  'target',
  'url',
  'dest',
  'destination',
  'link',
  'to',
  'u',
  'redirect',
  'redirect_url',
  'jump',
  'jump_url',
  'pfurl',
  'gourl'
];

/**
 * 核心：解析任何可能的中转 URL，提取出真实目标网址
 */
export function extractTargetUrl(rawUrl: string, enableHeuristic = true): { targetUrl: string; platformName?: string } | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }

  // 1. 命中白名单知名平台规则
  for (const rule of KNOWN_PLATFORM_RULES) {
    let domainMatch = false;
    if (typeof rule.domain === 'string') {
      domainMatch = parsed.hostname === rule.domain;
    } else {
      domainMatch = rule.domain.test(parsed.hostname);
    }

    if (domainMatch) {
      if (rule.pathPattern && !rule.pathPattern.test(parsed.pathname)) {
        continue;
      }
      const target = rule.targetExtractor(parsed);
      if (target && target !== rawUrl) {
        return { targetUrl: target, platformName: rule.name };
      }
    }
  }

  // 2. 启发式通用嗅探
  if (enableHeuristic) {
    // 检查是否包含类似 link, redirect, jump, go 等特征路径或子域名
    const hasRedirectClues =
      /link|jump|redirect|middle|check-link|safecheck/i.test(parsed.hostname) ||
      /\/link|\/go|\/redirect|\/jump|\/middle/i.test(parsed.pathname);

    for (const key of HEURISTIC_PARAM_KEYS) {
      const val = parsed.searchParams.get(key);
      if (val) {
        const decoded = safeDecodeUrl(val);
        if (decoded && decoded !== rawUrl) {
          try {
            const decodedParsed = new URL(decoded);
            // 目标网址的域名不同于当前中转域名，或者具有强中转特征
            if (decodedParsed.hostname !== parsed.hostname || hasRedirectClues) {
              return { targetUrl: decoded, platformName: m.platforms.heuristic };
            }
          } catch {
            // ignore
          }
        }
      }
    }
  }

  return null;
}
