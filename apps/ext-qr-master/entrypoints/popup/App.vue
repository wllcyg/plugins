<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, nextTick } from 'vue';
import { AppFooterLink } from '@100free/ui';
import {
  QRMode,
  QRStylingConfig,
  WifiData,
  VCardData,
  DecodedResult,
  DotType,
  CornerSquareType,
  CornerDotType,
  ErrorCorrectionLevel
} from '../../src/types';
import {
  createQRInstance,
  exportQRCodeBlob,
  copyQRToClipboard,
  formatWifiString,
  formatVCardString
} from '../../src/core/generator';
import { decodeImageUrl, decodeImageBlob } from '../../src/core/decoder';

const activeTab = ref<QRMode | 'scanner'>('url');
const toastMsg = ref('');
const isCopying = ref(false);

// 二维码容器引用
const qrContainerRef = ref<HTMLDivElement | null>(null);
let qrInstance: any = null;

// 内容状态
const urlText = ref('');
const currentFavicon = ref('');
const plainText = ref('');

const wifiForm = reactive<WifiData>({
  ssid: '',
  password: '',
  encryption: 'WPA',
  hidden: false
});

const vcardForm = reactive<VCardData>({
  name: '',
  phone: '',
  email: '',
  company: '',
  title: '',
  website: ''
});

// 美化配置状态
const config = reactive<QRStylingConfig>({
  size: 260,
  margin: 8,
  ecc: 'M',
  dotType: 'rounded',
  cornerSquareType: 'extra-rounded',
  cornerDotType: 'dot',
  colorType: 'gradient',
  singleColor: '#0f172a',
  gradientStart: '#10b981',
  gradientEnd: '#06b6d4',
  gradientRotation: 45,
  cornerColor: '#059669',
  backgroundColor: '#ffffff',
  logoUrl: '',
  logoSize: 0.24,
  logoMargin: 4
});

// 预设高颜值渐变配色主题
const presetThemes = [
  { name: '极光碧翠', start: '#10b981', end: '#06b6d4', corner: '#059669' },
  { name: '赛博霓虹', start: '#ec4899', end: '#8b5cf6', corner: '#d946ef' },
  { name: '深海浩瀚', start: '#3b82f6', end: '#1d4ed8', corner: '#1e40af' },
  { name: '黑金奢华', start: '#1e293b', end: '#d97706', corner: '#b45309' },
  { name: '烈焰活力', start: '#f97316', end: '#ef4444', corner: '#ea580c' },
  { name: '经典商务', start: '#0f172a', end: '#0f172a', corner: '#0f172a' }
];

// 离线识码状态
const decodedHistory = ref<DecodedResult[]>([]);
const isDecoding = ref(false);
const dragOver = ref(false);

// 计算最终编码内容
const finalContent = computed(() => {
  if (activeTab.value === 'url') {
    return urlText.value.trim() || 'https://github.com';
  } else if (activeTab.value === 'text') {
    return plainText.value.trim() || '100-Free 开源生产力套件';
  } else if (activeTab.value === 'wifi') {
    return formatWifiString(wifiForm);
  } else if (activeTab.value === 'vcard') {
    return formatVCardString(vcardForm);
  }
  return urlText.value.trim() || 'https://github.com';
});

// 提示轻提示
const showToast = (msg: string) => {
  toastMsg.value = msg;
  setTimeout(() => {
    if (toastMsg.value === msg) toastMsg.value = '';
  }, 2200);
};

// 渲染二维码
const renderQR = () => {
  if (!qrContainerRef.value) return;
  qrContainerRef.value.innerHTML = '';
  qrInstance = createQRInstance(finalContent.value, config);
  qrInstance.append(qrContainerRef.value);
};

// 监听内容与样式变化，防抖重新渲染
let renderTimer: any = null;
const scheduleRender = () => {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(() => {
    renderQR();
  }, 80);
};

watch(
  [
    finalContent,
    () => config.dotType,
    () => config.cornerSquareType,
    () => config.cornerDotType,
    () => config.colorType,
    () => config.singleColor,
    () => config.gradientStart,
    () => config.gradientEnd,
    () => config.gradientRotation,
    () => config.cornerColor,
    () => config.backgroundColor,
    () => config.logoUrl,
    () => config.logoSize,
    () => config.ecc
  ],
  () => {
    scheduleRender();
  }
);

// 提取当前标签页 URL
const fetchCurrentTab = async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url && !tab.url.startsWith('chrome://')) {
      urlText.value = tab.url;
      if (tab.favIconUrl) {
        currentFavicon.value = tab.favIconUrl;
      }
    } else {
      urlText.value = 'https://github.com';
    }
  } catch {
    urlText.value = 'https://github.com';
  }
};

// 读取剪贴板内容
const pasteFromClipboard = async () => {
  try {
    const text = await navigator.clipboard.readText();
    if (text) {
      if (activeTab.value === 'url') {
        urlText.value = text;
      } else {
        plainText.value = text;
      }
      showToast('已从剪贴板粘贴');
    }
  } catch {
    showToast('未能读取剪贴板，请允许剪贴板权限');
  }
};

// 应用预设配色
const applyPreset = (theme: typeof presetThemes[0]) => {
  if (theme.start === theme.end) {
    config.colorType = 'single';
    config.singleColor = theme.start;
  } else {
    config.colorType = 'gradient';
    config.gradientStart = theme.start;
    config.gradientEnd = theme.end;
  }
  config.cornerColor = theme.corner;
};

// 一键应用网站 Favicon 为中心 Logo
const applyFaviconAsLogo = () => {
  if (currentFavicon.value) {
    config.logoUrl = currentFavicon.value;
    config.ecc = 'H'; // 嵌入 Logo 时建议切换高纠错率
    showToast('已嵌入网站 Logo (已自动提升纠错率至高等级)');
  }
};

// 上传本地自定义 Logo
const handleLogoUpload = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    config.logoUrl = event.target?.result as string;
    config.ecc = 'H';
    showToast('Logo 上传成功！');
  };
  reader.readAsDataURL(file);
};

// 清除 Logo
const clearLogo = () => {
  config.logoUrl = '';
  showToast('已清除 Logo');
};

// 复制图片到剪贴板
const copyImage = async () => {
  if (!qrInstance) return;
  isCopying.value = true;
  try {
    await copyQRToClipboard(qrInstance);
    showToast('已成功复制二维码图片到剪贴板！');
  } catch (err) {
    showToast('复制失败，请直接点击下载图片');
  } finally {
    isCopying.value = false;
  }
};

// 下载 PNG / SVG
const downloadQR = async (format: 'png' | 'svg', sizeMultiplier = 1) => {
  if (!qrInstance) return;
  try {
    // 临时创建高分辨率实例导出印刷级图
    const exportConfig = { ...config, size: config.size * sizeMultiplier };
    const tempQR = createQRInstance(finalContent.value, exportConfig);
    const blob = await exportQRCodeBlob(tempQR, format);

    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `qrcode_${Date.now()}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
    showToast(`正在导出 ${format.toUpperCase()} 文件...`);
  } catch (err) {
    showToast('导出出错，请重试');
  }
};

// 复制文本内容
const copyText = (txt: string) => {
  navigator.clipboard.writeText(txt).then(() => {
    showToast('已复制内容');
  });
};

// 离线识码 - 处理文件
const handleFileDecode = async (file: File) => {
  if (!file.type.startsWith('image/')) {
    showToast('请上传有效的图片文件');
    return;
  }
  isDecoding.value = true;
  try {
    const result = await decodeImageBlob(file);
    if (result) {
      decodedHistory.value.unshift(result);
      showToast('识别成功！');
    } else {
      showToast('未能识别到有效二维码');
    }
  } catch {
    showToast('解码失败');
  } finally {
    isDecoding.value = false;
  }
};

// 拖拽文件
const handleDrop = (e: DragEvent) => {
  dragOver.value = false;
  const file = e.dataTransfer?.files?.[0];
  if (file) handleFileDecode(file);
};

// 全局粘贴识码
const handlePasteEvent = async (e: ClipboardEvent) => {
  if (activeTab.value !== 'scanner') return;
  const items = e.clipboardData?.items;
  if (!items) return;
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.startsWith('image/')) {
      const file = items[i].getAsFile();
      if (file) {
        handleFileDecode(file);
        break;
      }
    }
  }
};

onMounted(async () => {
  await fetchCurrentTab();
  await nextTick();
  renderQR();

  // 读取右键识码的最新结果
  try {
    const data = await chrome.storage.local.get(['latest_decoded_result']);
    if (data?.latest_decoded_result) {
      decodedHistory.value.push(data.latest_decoded_result);
    }
  } catch {}

  window.addEventListener('paste', handlePasteEvent);
});
</script>

<template>
  <div class="qr-app">
    <!-- 头部品牌栏 -->
    <header class="app-header">
      <div class="header-brand">
        <div class="logo-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
          </svg>
        </div>
        <div class="brand-text">
          <h1 class="brand-title">QR Master</h1>
          <span class="brand-desc">全能艺术二维码与离线识码器</span>
        </div>
      </div>
      <div class="header-badges">
        <span class="offline-pill" title="所有编码与识码均在本地瞬间完成，0网络请求，全面保护隐私">
          <span class="green-dot" /> 离线安全
        </span>
      </div>
    </header>

    <!-- 模式选项卡 -->
    <nav class="mode-tabs">
      <button
        class="tab-item"
        :class="{ active: activeTab === 'url' }"
        @click="activeTab = 'url'"
      >
        <span>网址链接</span>
      </button>
      <button
        class="tab-item"
        :class="{ active: activeTab === 'text' }"
        @click="activeTab = 'text'"
      >
        <span>纯文本</span>
      </button>
      <button
        class="tab-item"
        :class="{ active: activeTab === 'wifi' }"
        @click="activeTab = 'wifi'"
      >
        <span>WiFi免密</span>
      </button>
      <button
        class="tab-item"
        :class="{ active: activeTab === 'vcard' }"
        @click="activeTab = 'vcard'"
      >
        <span>电子名片</span>
      </button>
      <button
        class="tab-item highlight-tab"
        :class="{ active: activeTab === 'scanner' }"
        @click="activeTab = 'scanner'"
      >
        <span>🔍 离线识码</span>
      </button>
    </nav>

    <!-- 主展示面板 -->
    <div class="app-content">
      <!-- 模式 1: 网址链接 -->
      <section v-if="activeTab === 'url'" class="pane-section">
        <div class="input-wrapper">
          <input
            v-model="urlText"
            type="text"
            class="input-control"
            placeholder="请输入以 https:// 开头的网址..."
          />
          <button class="paste-icon-btn" title="粘贴剪贴板" @click="pasteFromClipboard">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              <rect x="8" y="2" width="8" height="4" rx="1" />
            </svg>
          </button>
        </div>
        <div class="action-row">
          <button class="text-btn" @click="fetchCurrentTab">提取当前网页</button>
          <button v-if="currentFavicon" class="text-btn" @click="applyFaviconAsLogo">
            嵌入网页 Favicon
          </button>
        </div>
      </section>

      <!-- 模式 2: 纯文本 -->
      <section v-else-if="activeTab === 'text'" class="pane-section">
        <textarea
          v-model="plainText"
          class="textarea-control"
          rows="3"
          placeholder="输入任意文字内容，即刻转为二维码..."
        />
        <div class="text-meta-row">
          <span class="char-count">已输入 {{ plainText.length }} 字</span>
          <button class="text-btn" @click="pasteFromClipboard">读取剪贴板</button>
        </div>
      </section>

      <!-- 模式 3: WiFi 免密连接 -->
      <section v-else-if="activeTab === 'wifi'" class="pane-section">
        <div class="grid-form">
          <div class="form-group">
            <label class="form-label">WiFi 名称 (SSID)</label>
            <input
              v-model="wifiForm.ssid"
              type="text"
              class="input-control"
              placeholder="例如: Office_5G"
            />
          </div>
          <div class="form-group">
            <label class="form-label">WiFi 密码</label>
            <input
              v-model="wifiForm.password"
              type="text"
              class="input-control"
              placeholder="请输入密码（无密码可留空）"
            />
          </div>
          <div class="form-row-compact">
            <div class="form-group">
              <label class="form-label">加密模式</label>
              <select v-model="wifiForm.encryption" class="select-control">
                <option value="WPA">WPA / WPA2 (推荐)</option>
                <option value="WEP">WEP</option>
                <option value="nopass">无密码</option>
              </select>
            </div>
            <label class="checkbox-label">
              <input v-model="wifiForm.hidden" type="checkbox" />
              <span>隐藏网络</span>
            </label>
          </div>
        </div>
      </section>

      <!-- 模式 4: 电子名片 vCard -->
      <section v-else-if="activeTab === 'vcard'" class="pane-section">
        <div class="grid-form-double">
          <div class="form-group">
            <label class="form-label">姓名 *</label>
            <input v-model="vcardForm.name" type="text" class="input-control" placeholder="张三" />
          </div>
          <div class="form-group">
            <label class="form-label">手机号码</label>
            <input v-model="vcardForm.phone" type="text" class="input-control" placeholder="13800000000" />
          </div>
          <div class="form-group">
            <label class="form-label">公司 / 组织</label>
            <input v-model="vcardForm.company" type="text" class="input-control" placeholder="科技公司" />
          </div>
          <div class="form-group">
            <label class="form-label">职位</label>
            <input v-model="vcardForm.title" type="text" class="input-control" placeholder="前端专家" />
          </div>
          <div class="form-group full-width">
            <label class="form-label">电子邮箱</label>
            <input v-model="vcardForm.email" type="text" class="input-control" placeholder="example@100free.org" />
          </div>
        </div>
      </section>

      <!-- 模式 5: 离线识码 -->
      <section v-else-if="activeTab === 'scanner'" class="pane-section scanner-pane">
        <!-- 拖拽/粘贴接收区 -->
        <div
          class="drop-area"
          :class="{ 'drop-active': dragOver }"
          @dragover.prevent="dragOver = true"
          @dragleave.prevent="dragOver = false"
          @drop.prevent="handleDrop"
        >
          <input
            type="file"
            accept="image/*"
            class="hidden-file-input"
            id="qr-file-input"
            @change="(e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) handleFileDecode(file);
            }"
          />
          <label for="qr-file-input" class="drop-content">
            <svg class="drop-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M4 16l4.586-4.586a2 2 0 0 1 2.828 0L16 16m-2-2l1.586-1.586a2 2 0 0 1 2.828 0L20 14" />
              <rect x="3" y="3" width="18" height="18" rx="2" />
            </svg>
            <p class="drop-tip">
              <strong>点击上传</strong>、拖拽图片到此处，或按 <strong>Ctrl+V</strong> 粘贴图片
            </p>
            <span class="drop-sub">网页图片更可直接鼠标右键选择「识别图中二维码」</span>
          </label>
        </div>

        <!-- 识别结果列表 -->
        <div v-if="decodedHistory.length > 0" class="decoded-list">
          <div class="history-head">
            <span>识别记录 ({{ decodedHistory.length }})</span>
            <button class="clear-btn" @click="decodedHistory = []">清空</button>
          </div>
          <div
            v-for="(item, idx) in decodedHistory"
            :key="idx"
            class="decoded-card"
          >
            <div class="card-top">
              <span class="card-badge" :class="item.wifiInfo ? 'badge-wifi' : item.isUrl ? 'badge-url' : 'badge-text'">
                {{ item.wifiInfo ? 'WiFi热点' : item.isUrl ? '网页链接' : '纯文本' }}
              </span>
              <span class="card-time">{{ new Date(item.timestamp).toLocaleTimeString() }}</span>
            </div>

            <!-- WiFi 专用展示卡片 -->
            <div v-if="item.wifiInfo" class="wifi-result-box">
              <p><strong>SSID:</strong> {{ item.wifiInfo.ssid }}</p>
              <p v-if="item.wifiInfo.password">
                <strong>密码:</strong> <code>{{ item.wifiInfo.password }}</code>
                <button class="mini-copy-btn" @click="copyText(item.wifiInfo.password)">复制密码</button>
              </p>
              <p><strong>加密:</strong> {{ item.wifiInfo.encryption }}</p>
            </div>

            <!-- 普通链接或文本 -->
            <p v-else class="decoded-text-preview" :title="item.text">{{ item.text }}</p>

            <div class="card-actions">
              <button class="card-act-btn" @click="copyText(item.text)">复制全部</button>
              <a
                v-if="item.isUrl"
                :href="item.text"
                target="_blank"
                rel="noreferrer"
                class="card-act-btn act-open"
              >
                直接打开
              </a>
              <button
                class="card-act-btn"
                @click="() => { urlText = item.text; activeTab = 'url'; }"
              >
                生成二维码
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- 二维码实时预览与美化控制台 (非识码模式下展示) -->
      <div v-show="activeTab !== 'scanner'" class="preview-workspace">
        <!-- 二维码卡片容器 -->
        <div class="qr-render-card">
          <div ref="qrContainerRef" class="qr-canvas-holder" />
        </div>

        <!-- 艺术美化工具栏 -->
        <div class="styling-toolbar">
          <div class="style-row">
            <span class="style-title">点阵风格:</span>
            <div class="btn-group">
              <button
                v-for="dot in (['rounded', 'dots', 'classy', 'square'] as DotType[])"
                :key="dot"
                class="style-chip"
                :class="{ active: config.dotType === dot }"
                @click="config.dotType = dot"
              >
                {{ dot === 'rounded' ? '圆角' : dot === 'dots' ? '圆点' : dot === 'classy' ? '复古' : '直角' }}
              </button>
            </div>
          </div>

          <!-- 预设高颜值渐变配色 -->
          <div class="style-row">
            <span class="style-title">潮流渐变:</span>
            <div class="presets-row">
              <button
                v-for="theme in presetThemes"
                :key="theme.name"
                class="theme-dot"
                :style="{ background: `linear-gradient(135deg, ${theme.start}, ${theme.end})` }"
                :title="theme.name"
                @click="applyPreset(theme)"
              />
            </div>
          </div>

          <!-- 定位角形状与 Logo 控制 -->
          <div class="style-row">
            <span class="style-title">中心嵌入:</span>
            <div class="logo-actions">
              <label class="upload-logo-btn" title="上传中心 Logo">
                <input type="file" accept="image/*" class="hidden-file-input" @change="handleLogoUpload" />
                <span>+ 上传 Logo</span>
              </label>
              <button v-if="config.logoUrl" class="clear-logo-btn" @click="clearLogo">移除 Logo</button>
              <select v-model="config.ecc" class="select-mini" title="纠错等级">
                <option value="L">低纠错(7%)</option>
                <option value="M">中纠错(15%)</option>
                <option value="Q">较高(25%)</option>
                <option value="H">最高(30%)</option>
              </select>
            </div>
          </div>
        </div>

        <!-- 极速导出快捷操作栏 -->
        <div class="export-actions-bar">
          <button class="primary-action-btn" :disabled="isCopying" @click="copyImage">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            <span>一键复制图片</span>
          </button>

          <button class="secondary-action-btn" title="下载高清 PNG 图片" @click="downloadQR('png', 2)">
            <span>下载 PNG</span>
          </button>

          <button class="secondary-action-btn" title="下载无损矢量 SVG，无限放大不失真" @click="downloadQR('svg')">
            <span>矢量 SVG</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 底部状态 Toast 消息提示 -->
    <transition name="toast-fade">
      <div v-if="toastMsg" class="toast-bubble">
        {{ toastMsg }}
      </div>
    </transition>
    <AppFooterLink plugin-id="qr-master" />
  </div>
</template>

<style scoped>
.qr-app {
  width: 440px;
  background-color: #0f172a;
  color: #f8fafc;
  display: flex;
  flex-direction: column;
  user-select: none;
}

/* 顶部导航品牌 */
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #1e293b;
  border-bottom: 1px solid #334155;
}

.header-brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-box {
  width: 28px;
  height: 28px;
  background: linear-gradient(135deg, #10b981 0%, #06b6d4 100%);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
}

.logo-box svg {
  width: 16px;
  height: 16px;
}

.brand-text {
  display: flex;
  flex-direction: column;
}

.brand-title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #f8fafc;
  line-height: 1.2;
}

.brand-desc {
  font-size: 10px;
  color: #94a3b8;
}

.offline-pill {
  font-size: 11px;
  background: #0f172a;
  padding: 3px 8px;
  border-radius: 999px;
  color: #34d399;
  border: 1px solid #10b98140;
  display: flex;
  align-items: center;
  gap: 4px;
}

.green-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #10b981;
}

/* 选项卡导航 */
.mode-tabs {
  display: flex;
  background: #0b1120;
  border-bottom: 1px solid #1e293b;
  padding: 4px 8px;
  gap: 4px;
}

.tab-item {
  flex: 1;
  padding: 7px 0;
  border: none;
  background: transparent;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: center;
}

.tab-item:hover {
  color: #e2e8f0;
  background: #1e293b60;
}

.tab-item.active {
  background: #1e293b;
  color: #38bdf8;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.highlight-tab.active {
  color: #34d399;
}

/* 主内容容器 */
.app-content {
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pane-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-control {
  width: 100%;
  padding: 8px 12px;
  padding-right: 36px;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 6px;
  color: #f8fafc;
  font-size: 13px;
  outline: none;
  transition: border-color 0.15s;
}

.input-control:focus {
  border-color: #38bdf8;
}

.paste-icon-btn {
  position: absolute;
  right: 6px;
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
}

.paste-icon-btn:hover {
  color: #38bdf8;
}

.paste-icon-btn svg {
  width: 16px;
  height: 16px;
}

.action-row {
  display: flex;
  gap: 8px;
}

.text-btn {
  background: #1e293b;
  border: 1px solid #334155;
  color: #cbd5e1;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s;
}

.text-btn:hover {
  background: #334155;
  color: #f8fafc;
}

.textarea-control {
  width: 100%;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 6px;
  color: #f8fafc;
  padding: 8px 10px;
  font-size: 12px;
  resize: vertical;
  outline: none;
}

.textarea-control:focus {
  border-color: #38bdf8;
}

.text-meta-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  color: #64748b;
}

/* 表单网格 */
.grid-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.grid-form-double {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.full-width {
  grid-column: span 2;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.form-label {
  font-size: 11px;
  color: #94a3b8;
  font-weight: 500;
}

.form-row-compact {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.select-control {
  background: #1e293b;
  border: 1px solid #334155;
  color: #f8fafc;
  border-radius: 6px;
  padding: 6px 8px;
  font-size: 12px;
  outline: none;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #cbd5e1;
  cursor: pointer;
  margin-top: 16px;
}

/* 识码区域 */
.drop-area {
  border: 2px dashed #334155;
  border-radius: 8px;
  padding: 20px 16px;
  text-align: center;
  background: #1e293b40;
  transition: all 0.2s;
  cursor: pointer;
}

.drop-area:hover, .drop-active {
  border-color: #10b981;
  background: #10b98115;
}

.hidden-file-input {
  display: none;
}

.drop-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.drop-icon {
  width: 32px;
  height: 32px;
  color: #10b981;
}

.drop-tip {
  margin: 0;
  font-size: 12px;
  color: #cbd5e1;
}

.drop-sub {
  font-size: 11px;
  color: #64748b;
}

.decoded-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 240px;
  overflow-y: auto;
}

.history-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #94a3b8;
}

.clear-btn {
  background: transparent;
  border: none;
  color: #64748b;
  font-size: 11px;
  cursor: pointer;
}

.clear-btn:hover {
  color: #ef4444;
}

.decoded-card {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 6px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-badge {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
}

.badge-url {
  background: #0284c725;
  color: #38bdf8;
}

.badge-wifi {
  background: #10b98125;
  color: #34d399;
}

.badge-text {
  background: #64748b25;
  color: #cbd5e1;
}

.card-time {
  font-size: 10px;
  color: #64748b;
}

.wifi-result-box {
  background: #0f172a;
  padding: 8px;
  border-radius: 4px;
  font-size: 12px;
}

.wifi-result-box p {
  margin: 3px 0;
}

.wifi-result-box code {
  background: #1e293b;
  padding: 1px 4px;
  border-radius: 3px;
  color: #38bdf8;
}

.mini-copy-btn {
  background: #334155;
  border: none;
  color: #f8fafc;
  font-size: 10px;
  margin-left: 8px;
  padding: 2px 6px;
  border-radius: 3px;
  cursor: pointer;
}

.decoded-text-preview {
  margin: 0;
  font-size: 12px;
  color: #e2e8f0;
  word-break: break-all;
  max-height: 44px;
  overflow: hidden;
}

.card-actions {
  display: flex;
  gap: 6px;
  margin-top: 4px;
}

.card-act-btn {
  background: #0f172a;
  border: 1px solid #334155;
  color: #cbd5e1;
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 4px;
  cursor: pointer;
  text-decoration: none;
}

.card-act-btn:hover {
  background: #334155;
  color: #f8fafc;
}

.act-open {
  color: #38bdf8;
  border-color: #0284c7;
}

/* 二维码工作台预览 */
.preview-workspace {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.qr-render-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
}

.qr-canvas-holder {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 美化工具条 */
.styling-toolbar {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.style-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.style-title {
  font-size: 11px;
  color: #94a3b8;
  font-weight: 500;
}

.btn-group {
  display: flex;
  gap: 4px;
}

.style-chip {
  padding: 3px 8px;
  font-size: 11px;
  background: #0f172a;
  border: 1px solid #334155;
  color: #94a3b8;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
}

.style-chip.active {
  background: #0284c7;
  color: #ffffff;
  border-color: #38bdf8;
}

.presets-row {
  display: flex;
  gap: 6px;
}

.theme-dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid #334155;
  cursor: pointer;
  transition: transform 0.15s, border-color 0.15s;
}

.theme-dot:hover {
  transform: scale(1.18);
  border-color: #f8fafc;
}

.logo-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.upload-logo-btn {
  font-size: 11px;
  background: #0f172a;
  border: 1px solid #334155;
  color: #cbd5e1;
  padding: 3px 8px;
  border-radius: 4px;
  cursor: pointer;
}

.upload-logo-btn:hover {
  border-color: #38bdf8;
  color: #38bdf8;
}

.clear-logo-btn {
  font-size: 11px;
  background: #ef444420;
  border: 1px solid #ef444450;
  color: #f87171;
  padding: 3px 6px;
  border-radius: 4px;
  cursor: pointer;
}

.select-mini {
  background: #0f172a;
  border: 1px solid #334155;
  color: #94a3b8;
  font-size: 10px;
  padding: 2px 4px;
  border-radius: 4px;
  outline: none;
}

/* 导出按钮栏 */
.export-actions-bar {
  display: flex;
  gap: 8px;
}

.primary-action-btn {
  flex: 2;
  background: linear-gradient(135deg, #10b981 0%, #06b6d4 100%);
  border: none;
  color: #ffffff;
  font-weight: 600;
  font-size: 13px;
  padding: 9px 12px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  box-shadow: 0 2px 10px rgba(16, 185, 129, 0.3);
  transition: all 0.15s;
}

.primary-action-btn:hover {
  opacity: 0.93;
  transform: translateY(-1px);
}

.primary-action-btn svg {
  width: 16px;
  height: 16px;
}

.secondary-action-btn {
  flex: 1;
  background: #1e293b;
  border: 1px solid #334155;
  color: #cbd5e1;
  font-size: 12px;
  padding: 9px 6px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.15s;
  text-align: center;
}

.secondary-action-btn:hover {
  background: #334155;
  color: #f8fafc;
}

/* Toast 提示 */
.toast-bubble {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: #10b981;
  color: #ffffff;
  font-size: 12px;
  font-weight: 600;
  padding: 6px 14px;
  border-radius: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
  pointer-events: none;
  z-index: 999;
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: all 0.25s ease;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, 10px);
}
</style>
