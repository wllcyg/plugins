export interface CleanRedirectSettings {
  autoRedirectEnabled: boolean;       // 中转页自动跳过
  preCleanLinksEnabled: boolean;      // 页面内中转链接就地还原
  cleanTrackingEnabled: boolean;      // 剥离营销与追踪参数
  stripCopyCopyrightEnabled: boolean; // 复制时剔除版权小尾巴
  heuristicRedirectEnabled: boolean;  // 启用通用启发式中转探测
}

export interface RedirectStats {
  bypassedCount: number;  // 已拦截直达次数
  cleanedParamsCount: number; // 已剥离参数总数
  lastRedirectTime?: number;
}

export interface PlatformRule {
  id: string;
  name: string;
  domain: string | RegExp;
  pathPattern?: RegExp;
  targetExtractor: (url: URL) => string | null;
}
