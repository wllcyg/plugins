export interface PluginItem {
  id: string;
  name: string;
  badge: string;
  tagline: string;
  description: string;
  iconName: 'Table' | 'Camera' | 'Sparkles';
  iconColor: string;
  iconBg: string;
  version: string;
  category: 'data' | 'tool' | 'office';
  tags: string[];
  features: string[];
  status: 'released' | 'coming_soon';
  storeUrl?: string;
  downloadUrl?: string;
}

export const PLUGINS_DATA: PluginItem[] = [
  {
    id: 'table-export',
    name: '网页表格一键转 Excel',
    badge: '首款力作 · 已上线',
    tagline: '智能识别 AntD / Element 复合表格，告别手动复制排版折磨',
    description: '无需繁琐授权，鼠标悬停即刻浮现导出条。深度兼容现代 SPA 页面与多层表头/跨行合并，一秒转为 Excel / CSV，数据本地纯净解析。',
    iconName: 'Table',
    iconColor: 'text-emerald-600',
    iconBg: 'bg-emerald-50 border-emerald-100',
    version: 'v1.0.0',
    category: 'data',
    tags: ['表格导出', 'Ant Design', 'Element Plus', '零权限滥用'],
    features: ['复合表格智能缝合', '悬停气泡毛玻璃优雅交互', '纯本地零隐私上传', '支持大尺寸 1000+ 数据行'],
    status: 'released',
    storeUrl: '#',
    downloadUrl: '#'
  },
  {
    id: 'smart-screenshot',
    name: '全能长网页精准截图',
    badge: '即将发布',
    tagline: '滚动截屏不再断裂，智能剔除浮动吸顶导航',
    description: '自动感知滚动区域，生成超清视网膜 PNG，一键标记、马赛克敏感数据，专为产品经理与运营研发打造。',
    iconName: 'Camera',
    iconColor: 'text-sky-600',
    iconBg: 'bg-sky-50 border-sky-100',
    version: 'v0.1.0',
    category: 'tool',
    tags: ['长截图', '高分辨率', '隐私打码'],
    features: ['吸顶吸底元素自动去重', '可视区滚动缝合', '免插件本地 Canvas 渲染'],
    status: 'coming_soon'
  },
  {
    id: 'prompt-optimizer',
    name: 'AI 提示词秒级扩充器',
    badge: '即将发布',
    tagline: '随时随地选中文字，一秒唤出上下文深度提示词',
    description: '划词即分析意图，快速润色、提炼核心痛点，让普通对话秒变专家级结构化 Prompt。',
    iconName: 'Sparkles',
    iconColor: 'text-amber-600',
    iconBg: 'bg-amber-50 border-amber-100',
    version: 'v0.1.0',
    category: 'office',
    tags: ['AI 效能', '提示词', '划词协同'],
    features: ['划词浮窗响应', '多模态模板库', '快捷键闪速呼出'],
    status: 'coming_soon'
  }
];

