<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import {
  ArrowLeft,
  ArrowRight,
  CheckSquare,
  Copy,
  Download,
  FileArchive,
  FileDown,
  FilePlus2,
  FileText,
  Image as ImageIcon,
  Layers,
  RotateCw,
  ShieldCheck,
  Stamp,
  Trash2,
  Type,
  Upload,
  X,
  ZoomIn
} from 'lucide-vue-next';
import {
  compressPdfPages,
  convertImagesToPdf,
  exportMergedPdf,
  exportPagesAsImagesZip,
  exportPagesAsLongImage,
  exportSplitZip,
  extractTextFromPages,
  loadPdfFile,
  renderSinglePagePreview,
  triggerDownload,
  type ImageInputItem,
  type PdfPageItem,
  type WatermarkConfig
} from '../../src/core/pdf-engine';

type ActiveTab = 'organize' | 'convert' | 'watermark' | 'tools';

const activeTab = ref<ActiveTab>('organize');
const sources = new Map<string, Uint8Array>();
const pages = ref<PdfPageItem[]>([]);
const imageInputs = ref<ImageInputItem[]>([]);
const isDragging = ref(false);
const isBusy = ref(false);
const busyText = ref('');
const statusMsg = ref<{ type: 'ok' | 'err'; text: string } | null>(null);

// PDF 转图片配置
const imgScale = ref(2);
const imgFormat = ref<'png' | 'jpeg'>('png');

// 图片转 PDF 配置
const pdfPageMode = ref<'a4' | 'fit'>('a4');

// 水印 / 电子盖章配置
const wmMode = ref<'text' | 'image' | 'draw'>('text');
const wmText = ref('仅限内部使用 · 禁止外传');
const wmColor = ref('#dc2626');
const wmFontSize = ref(28);
const wmOpacity = ref(0.35);
const wmAngle = ref(-30);
const wmPosition = ref<'center' | 'bottom-right' | 'top-left' | 'tile'>('tile');
const wmStampBytes = ref<Uint8Array | null>(null);
const wmStampMime = ref('image/png');
const wmStampPreview = ref('');
const wmStampScale = ref(0.24);

// 新增：隐私元数据清理、页码、范围选择、拖拽排序、文本提取与压缩
const stripMetadata = ref(true);
const addPageNumbers = ref(false);
const rangeInput = ref('');
const draggedPageIdx = ref<number | null>(null);
const extractedText = ref('');
const compressLevel = ref<'low' | 'medium' | 'high'>('medium');

// 高清预览弹窗 & 手写签名画板
const previewModalUrl = ref('');
const previewModalTitle = ref('');
const sigCanvasRef = ref<HTMLCanvasElement | null>(null);
const sigColor = ref('#0f172a');
const isDrawingSig = ref(false);
const hasDrawnSig = ref(false);

const selectedPages = computed(() => pages.value.filter((p) => p.selected));
const fileInputRef = ref<HTMLInputElement | null>(null);
const imgInputRef = ref<HTMLInputElement | null>(null);
const stampInputRef = ref<HTMLInputElement | null>(null);

function setStatus(type: 'ok' | 'err', text: string) {
  statusMsg.value = { type, text };
  setTimeout(() => {
    if (statusMsg.value?.text === text) statusMsg.value = null;
  }, 4500);
}

async function handlePdfFiles(files: FileList | File[]) {
  const list = Array.from(files).filter((f) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name));
  if (list.length === 0) {
    setStatus('err', '请选择有效的 .pdf 文件');
    return;
  }

  isBusy.value = true;
  try {
    for (const file of list) {
      busyText.value = `正在本地解析 ${file.name}...`;
      const buf = new Uint8Array(await file.arrayBuffer());
      const parsed = await loadPdfFile(file.name, buf);
      sources.set(parsed.sourceId, parsed.bytes);
      pages.value.push(...parsed.pages);
    }
    setStatus('ok', `已加载 ${list.length} 个 PDF，共 ${pages.value.length} 页（纯本地内存处理）`);
  } catch (err) {
    setStatus('err', err instanceof Error ? `解析失败：${err.message}` : 'PDF 解析失败，请确认文件未损坏');
  } finally {
    isBusy.value = false;
    busyText.value = '';
  }
}

async function handleImageFiles(files: FileList | File[]) {
  const list = Array.from(files).filter((f) => /^image\/(png|jpeg|jpg|webp)$/i.test(f.type));
  if (list.length === 0) {
    setStatus('err', '请选择 PNG / JPG / WebP 图片');
    return;
  }
  for (const file of list) {
    const buf = new Uint8Array(await file.arrayBuffer());
    const previewUrl = URL.createObjectURL(file);
    imageInputs.value.push({
      id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: file.name,
      bytes: buf,
      mime: file.type,
      previewUrl
    });
  }
  setStatus('ok', `已添加 ${list.length} 张图片`);
}

async function handleStampFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const buf = new Uint8Array(await file.arrayBuffer());
  wmStampBytes.value = buf;
  wmStampMime.value = file.type || 'image/png';
  if (wmStampPreview.value) URL.revokeObjectURL(wmStampPreview.value);
  wmStampPreview.value = URL.createObjectURL(file);
}

function onDrop(e: DragEvent) {
  isDragging.value = false;
  if (draggedPageIdx.value !== null) return;
  const files = e.dataTransfer?.files;
  if (!files?.length) return;
  if (activeTab.value === 'convert' && Array.from(files).every((f) => f.type.startsWith('image/'))) {
    void handleImageFiles(files);
  } else {
    void handlePdfFiles(files);
  }
}

function applyPageRange() {
  const raw = rangeInput.value.trim();
  if (!raw) return;
  const targets = new Set<number>();
  for (const part of raw.split(/[,，\s]+/)) {
    if (!part) continue;
    const m = part.match(/^(\d+)-(\d+)$/);
    if (m) {
      const a = Math.max(1, Number(m[1]));
      const b = Math.min(pages.value.length, Number(m[2]));
      for (let i = Math.min(a, b); i <= Math.max(a, b); i++) targets.add(i);
    } else if (/^\d+$/.test(part)) {
      const n = Number(part);
      if (n >= 1 && n <= pages.value.length) targets.add(n);
    }
  }
  if (targets.size === 0) {
    setStatus('err', '请输入有效的页码范围，例如：1-3, 5, 8');
    return;
  }
  pages.value.forEach((p, idx) => {
    p.selected = targets.has(idx + 1);
  });
  setStatus('ok', `已按范围勾选 ${targets.size} 页`);
}

function onCardDragStart(idx: number) {
  draggedPageIdx.value = idx;
}

function onCardDrop(targetIdx: number) {
  const from = draggedPageIdx.value;
  draggedPageIdx.value = null;
  if (from === null || from === targetIdx) return;
  const copy = [...pages.value];
  const [moved] = copy.splice(from, 1);
  copy.splice(targetIdx, 0, moved);
  pages.value = copy;
}

function toggleSelectAll(mode: 'all' | 'none' | 'odd' | 'even') {
  pages.value.forEach((p, idx) => {
    if (mode === 'all') p.selected = true;
    else if (mode === 'none') p.selected = false;
    else if (mode === 'odd') p.selected = (idx + 1) % 2 === 1;
    else p.selected = (idx + 1) % 2 === 0;
  });
}

function rotatePage(idx: number) {
  pages.value[idx].rotation = (pages.value[idx].rotation + 90) % 360;
}

function movePage(idx: number, delta: -1 | 1) {
  const target = idx + delta;
  if (target < 0 || target >= pages.value.length) return;
  const copy = [...pages.value];
  const [item] = copy.splice(idx, 1);
  copy.splice(target, 0, item);
  pages.value = copy;
}

function removePage(idx: number) {
  pages.value.splice(idx, 1);
}

function clearAllPdfs() {
  pages.value = [];
  sources.clear();
}

function moveImage(idx: number, delta: -1 | 1) {
  const target = idx + delta;
  if (target < 0 || target >= imageInputs.value.length) return;
  const copy = [...imageInputs.value];
  const [item] = copy.splice(idx, 1);
  copy.splice(target, 0, item);
  imageInputs.value = copy;
}

function removeImage(idx: number) {
  const [removed] = imageInputs.value.splice(idx, 1);
  if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
}

async function openPagePreview(page: PdfPageItem, idx: number) {
  isBusy.value = true;
  busyText.value = `正在渲染第 ${idx + 1} 页高清预览...`;
  try {
    previewModalUrl.value = await renderSinglePagePreview(sources, page, 1.6);
    previewModalTitle.value = `${page.fileName} · 第 ${page.pageIndex + 1} 页`;
  } catch (err) {
    setStatus('err', err instanceof Error ? err.message : '预览失败');
  } finally {
    isBusy.value = false;
    busyText.value = '';
  }
}

function getSigPos(e: PointerEvent) {
  const canvas = sigCanvasRef.value;
  if (!canvas) return { x: 0, y: 0 };
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * canvas.width,
    y: ((e.clientY - rect.top) / rect.height) * canvas.height
  };
}

function startSigDraw(e: PointerEvent) {
  const canvas = sigCanvasRef.value;
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return;
  canvas.setPointerCapture(e.pointerId);
  isDrawingSig.value = true;
  hasDrawnSig.value = true;
  const { x, y } = getSigPos(e);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 4;
  ctx.strokeStyle = sigColor.value;
}

function moveSigDraw(e: PointerEvent) {
  if (!isDrawingSig.value) return;
  const ctx = sigCanvasRef.value?.getContext('2d');
  if (!ctx) return;
  const { x, y } = getSigPos(e);
  ctx.lineTo(x, y);
  ctx.stroke();
}

function endSigDraw() {
  isDrawingSig.value = false;
}

function clearSigCanvas() {
  const canvas = sigCanvasRef.value;
  const ctx = canvas?.getContext('2d');
  if (canvas && ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  hasDrawnSig.value = false;
}

async function getDrawnSignatureBytes(): Promise<Uint8Array | null> {
  const canvas = sigCanvasRef.value;
  if (!canvas || !hasDrawnSig.value) return null;
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) return null;
  return new Uint8Array(await blob.arrayBuffer());
}

async function runExportMerged(withWatermark = false) {
  if (selectedPages.value.length === 0) {
    setStatus('err', '请至少勾选 1 页 PDF');
    return;
  }
  let imageBytes = wmStampBytes.value || undefined;
  let imageMime = wmStampMime.value;
  if (withWatermark && wmMode.value === 'image' && !imageBytes) {
    setStatus('err', '请先上传透明签名或印章图片');
    return;
  }
  if (withWatermark && wmMode.value === 'draw') {
    const drawn = await getDrawnSignatureBytes();
    if (!drawn) {
      setStatus('err', '请先在下方画板手写您的电子签名');
      return;
    }
    imageBytes = drawn;
    imageMime = 'image/png';
  }

  isBusy.value = true;
  busyText.value = withWatermark ? '正在本地合成水印/盖章...' : '正在本地合并与重组 PDF...';
  try {
    const wm: WatermarkConfig | undefined = withWatermark
      ? {
          mode: wmMode.value === 'draw' ? 'image' : wmMode.value,
          text: wmText.value,
          color: wmColor.value,
          fontSize: wmFontSize.value,
          opacity: wmMode.value === 'draw' ? 1 : wmOpacity.value,
          angle: wmAngle.value,
          position: wmPosition.value,
          imageBytes,
          imageMime,
          imageScale: wmStampScale.value
        }
      : undefined;

    const bytes = await exportMergedPdf(sources, selectedPages.value, {
      watermark: wm,
      stripMetadata: stripMetadata.value,
      addPageNumbers: addPageNumbers.value
    });
    const name = withWatermark ? 'watermarked-100free.pdf' : 'merged-100free.pdf';
    triggerDownload(bytes, name, 'application/pdf');
    setStatus('ok', `已导出 ${selectedPages.value.length} 页到 ${name}`);
  } catch (err) {
    setStatus('err', err instanceof Error ? err.message : '导出失败');
  } finally {
    isBusy.value = false;
    busyText.value = '';
  }
}

async function runExportSplitZip() {
  if (selectedPages.value.length === 0) {
    setStatus('err', '请至少勾选 1 页 PDF');
    return;
  }
  isBusy.value = true;
  busyText.value = '正在本地拆分为独立单页 PDF...';
  try {
    const blob = await exportSplitZip(sources, selectedPages.value);
    triggerDownload(blob, 'split-pages-100free.zip', 'application/zip');
    setStatus('ok', `已拆分 ${selectedPages.value.length} 个独立 PDF 并打包下载`);
  } catch (err) {
    setStatus('err', err instanceof Error ? err.message : '拆分失败');
  } finally {
    isBusy.value = false;
    busyText.value = '';
  }
}

async function runExportImages() {
  if (selectedPages.value.length === 0) {
    setStatus('err', '请先加载并勾选需要转换的 PDF 页面');
    return;
  }
  isBusy.value = true;
  busyText.value = `正在以 ${imgScale.value}x 清晰度渲染 ${selectedPages.value.length} 页图片...`;
  try {
    const zipBlob = await exportPagesAsImagesZip(sources, selectedPages.value, imgScale.value, imgFormat.value);
    triggerDownload(zipBlob, `pdf-images-${imgFormat.value}-100free.zip`, 'application/zip');
    setStatus('ok', `已导出 ${selectedPages.value.length} 张高清图片 ZIP`);
  } catch (err) {
    setStatus('err', err instanceof Error ? err.message : '转换失败');
  } finally {
    isBusy.value = false;
    busyText.value = '';
  }
}

async function runExportLongImage() {
  if (selectedPages.value.length === 0) {
    setStatus('err', '请先加载并勾选需要拼接的 PDF 页面');
    return;
  }
  isBusy.value = true;
  busyText.value = `正在将 ${selectedPages.value.length} 页纵向拼接为高清长图...`;
  try {
    const blob = await exportPagesAsLongImage(sources, selectedPages.value, imgScale.value, imgFormat.value);
    triggerDownload(blob, `pdf-long-image-100free.${imgFormat.value === 'jpeg' ? 'jpg' : 'png'}`, blob.type);
    setStatus('ok', `已拼接导出 ${selectedPages.value.length} 页长图`);
  } catch (err) {
    setStatus('err', err instanceof Error ? err.message : '长图生成失败');
  } finally {
    isBusy.value = false;
    busyText.value = '';
  }
}

async function runExtractText() {
  if (selectedPages.value.length === 0) {
    setStatus('err', '请先加载并勾选需要提取文字的 PDF 页面');
    return;
  }
  isBusy.value = true;
  busyText.value = `正在本地提取 ${selectedPages.value.length} 页纯文本...`;
  try {
    extractedText.value = await extractTextFromPages(sources, selectedPages.value);
    setStatus('ok', `已完成 ${selectedPages.value.length} 页文本提取`);
  } catch (err) {
    setStatus('err', err instanceof Error ? err.message : '文本提取失败');
  } finally {
    isBusy.value = false;
    busyText.value = '';
  }
}

async function copyExtractedText() {
  if (!extractedText.value) return;
  await navigator.clipboard.writeText(extractedText.value);
  setStatus('ok', '已复制全部提取文本到剪贴板');
}

function downloadExtractedText() {
  if (!extractedText.value) return;
  triggerDownload(new Blob([extractedText.value], { type: 'text/plain;charset=utf-8' }), 'extracted-text-100free.txt', 'text/plain');
}

async function runCompressPdf() {
  if (selectedPages.value.length === 0) {
    setStatus('err', '请先加载并勾选需要压缩的 PDF 页面');
    return;
  }
  isBusy.value = true;
  busyText.value = `正在本地压缩 ${selectedPages.value.length} 页 PDF...`;
  try {
    const bytes = await compressPdfPages(sources, selectedPages.value, compressLevel.value);
    const sizeMb = (bytes.byteLength / (1024 * 1024)).toFixed(2);
    triggerDownload(bytes, 'compressed-100free.pdf', 'application/pdf');
    setStatus('ok', `压缩完成（输出体积 ${sizeMb} MB）`);
  } catch (err) {
    setStatus('err', err instanceof Error ? err.message : '压缩失败');
  } finally {
    isBusy.value = false;
    busyText.value = '';
  }
}

async function runImagesToPdf() {
  if (imageInputs.value.length === 0) {
    setStatus('err', '请先添加至少 1 张图片');
    return;
  }
  isBusy.value = true;
  busyText.value = '正在本地合成 PDF...';
  try {
    const bytes = await convertImagesToPdf(imageInputs.value, pdfPageMode.value);
    triggerDownload(bytes, 'images-to-pdf-100free.pdf', 'application/pdf');
    setStatus('ok', `已将 ${imageInputs.value.length} 张图片合成为 PDF`);
  } catch (err) {
    setStatus('err', err instanceof Error ? err.message : '合成失败');
  } finally {
    isBusy.value = false;
    busyText.value = '';
  }
}

onMounted(async () => {
  const sourceUrl = new URLSearchParams(window.location.search).get('sourceUrl');
  if (!sourceUrl) return;
  isBusy.value = true;
  busyText.value = '正在从当前网页地址拉取 PDF...';
  try {
    const res = await fetch(sourceUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = new Uint8Array(await res.arrayBuffer());
    const name = decodeURIComponent(sourceUrl.split('/').pop()?.split('?')[0] || 'document.pdf');
    const parsed = await loadPdfFile(name, buf);
    sources.set(parsed.sourceId, parsed.bytes);
    pages.value.push(...parsed.pages);
    setStatus('ok', `已从当前网页导入 ${name}（${parsed.pages.length} 页）`);
  } catch {
    setStatus('err', '目标网站开启了跨域限制，请先 Ctrl+S 保存 PDF 到本地后直接拖入此页面');
  } finally {
    isBusy.value = false;
    busyText.value = '';
  }
});

onUnmounted(() => {
  imageInputs.value.forEach((img) => URL.revokeObjectURL(img.previewUrl));
  if (wmStampPreview.value) URL.revokeObjectURL(wmStampPreview.value);
});
</script>

<template>
  <div
    class="studio-root"
    @dragover.prevent="isDragging = true"
    @dragleave.prevent="isDragging = false"
    @drop.prevent="onDrop"
  >
    <header class="topbar">
      <div class="topbar-inner">
        <div class="brand">
          <div class="logo-box"><FileText :size="20" /></div>
          <div>
            <h1>本地隐私 PDF 工具箱</h1>
            <p>100% 浏览器本地离线计算 · 文件绝不上传云端 · 无次数与大小限制</p>
          </div>
        </div>

        <nav class="tabs" aria-label="功能切换">
          <button
            type="button"
            :class="['tab-btn', { active: activeTab === 'organize' }]"
            @click="activeTab = 'organize'"
          >
            <Layers :size="16" /> 合并与页面整理
          </button>
          <button
            type="button"
            :class="['tab-btn', { active: activeTab === 'convert' }]"
            @click="activeTab = 'convert'"
          >
            <ImageIcon :size="16" /> 图片 ↔ PDF 互转
          </button>
          <button
            type="button"
            :class="['tab-btn', { active: activeTab === 'watermark' }]"
            @click="activeTab = 'watermark'"
          >
            <Stamp :size="16" /> 水印与电子盖章
          </button>
          <button
            type="button"
            :class="['tab-btn', { active: activeTab === 'tools' }]"
            @click="activeTab = 'tools'"
          >
            <Type :size="16" /> 文本提取与瘦身
          </button>
        </nav>

        <div class="privacy-pill">
          <ShieldCheck :size="15" />
          <span>离线安全模式</span>
        </div>
      </div>
    </header>

    <main class="main-wrap">
      <div v-if="statusMsg" :class="['toast', statusMsg.type]">
        {{ statusMsg.text }}
      </div>

      <div v-if="isBusy" class="busy-banner">
        <span class="spinner" />
        <span>{{ busyText }}</span>
      </div>

      <!-- 拖拽/上传区 -->
      <section v-if="activeTab !== 'convert'" class="upload-bar">
        <input
          ref="fileInputRef"
          type="file"
          accept=".pdf,application/pdf"
          multiple
          hidden
          @change="(e) => { const f = (e.target as HTMLInputElement).files; if (f) handlePdfFiles(f); }"
        />
        <div class="upload-info">
          <strong>{{ pages.length > 0 ? `已加载 ${pages.length} 页（已选 ${selectedPages.length} 页）` : '拖入一个或多个 PDF 文件到页面任意位置' }}</strong>
          <span>支持多份 PDF 合并、单页勾选拆分、旋转角度与拖拽/按钮重排</span>
        </div>
        <div class="upload-actions">
          <button type="button" class="btn primary" @click="fileInputRef?.click()">
            <FilePlus2 :size="16" /> {{ pages.length > 0 ? '继续添加 PDF（合并）' : '选择本地 PDF 文件' }}
          </button>
          <button v-if="pages.length > 0" type="button" class="btn secondary" @click="clearAllPdfs">
            <Trash2 :size="15" /> 清空
          </button>
        </div>
      </section>

      <!-- Tab 1: 合并与页面整理 -->
      <template v-if="activeTab === 'organize'">
        <div v-if="pages.length > 0" class="toolbar">
          <div class="toolbar-left">
            <button type="button" class="chip-btn" @click="toggleSelectAll('all')">全选</button>
            <button type="button" class="chip-btn" @click="toggleSelectAll('none')">全不选</button>
            <button type="button" class="chip-btn" @click="toggleSelectAll('odd')">奇数页</button>
            <button type="button" class="chip-btn" @click="toggleSelectAll('even')">偶数页</button>
            <form class="range-form" @submit.prevent="applyPageRange">
              <input v-model="rangeInput" type="text" placeholder="页码如 1-3, 5" />
              <button type="submit" class="chip-btn">应用</button>
            </form>
          </div>
          <div class="toolbar-right">
            <label class="inline-check">
              <input v-model="stripMetadata" type="checkbox" />
              <span>抹除隐私元数据</span>
            </label>
            <label class="inline-check">
              <input v-model="addPageNumbers" type="checkbox" />
              <span>加页码 (1/N)</span>
            </label>
            <button type="button" class="btn secondary" :disabled="isBusy" @click="runExportSplitZip">
              <FileArchive :size="16" /> 拆分为单页 ZIP
            </button>
            <button type="button" class="btn primary" :disabled="isBusy" @click="runExportMerged(false)">
              <Download :size="16" /> 导出选中页为 PDF（{{ selectedPages.length }} 页）
            </button>
          </div>
        </div>

        <div v-if="pages.length === 0" class="empty-drop" @click="fileInputRef?.click()">
          <Upload :size="36" />
          <h2>把 PDF 拖到这里，或点击选择文件</h2>
          <p>支持同时选择多个 PDF 进行合并；所有操作均在本地浏览器完成，零上传。</p>
        </div>

        <div v-else class="pages-grid">
          <article
            v-for="(page, idx) in pages"
            :key="page.uid"
            draggable="true"
            :class="['page-card', { selected: page.selected, dragging: draggedPageIdx === idx }]"
            @dragstart="onCardDragStart(idx)"
            @dragover.prevent
            @drop.stop="onCardDrop(idx)"
            @dragend="draggedPageIdx = null"
          >
            <div class="page-thumb-wrap" @click="page.selected = !page.selected">
              <img
                :src="page.thumbnailUrl"
                :alt="`${page.fileName} 第 ${page.pageIndex + 1} 页`"
                :style="{ transform: `rotate(${page.rotation}deg)` }"
              />
              <span :class="['check-badge', { on: page.selected }]">
                <CheckSquare :size="15" />
              </span>
              <span class="page-num">#{{ idx + 1 }}</span>
            </div>
            <div class="page-meta">
              <span class="file-name" :title="page.fileName">{{ page.fileName }} · P{{ page.pageIndex + 1 }}</span>
              <div class="page-ops">
                <button type="button" title="左移" :disabled="idx === 0" @click="movePage(idx, -1)">
                  <ArrowLeft :size="14" />
                </button>
                <button type="button" title="右移" :disabled="idx === pages.length - 1" @click="movePage(idx, 1)">
                  <ArrowRight :size="14" />
                </button>
                <button type="button" title="顺时针旋转 90°" @click="rotatePage(idx)">
                  <RotateCw :size="14" />
                </button>
                <button type="button" title="放大高清预览" @click="openPagePreview(page, idx)">
                  <ZoomIn :size="14" />
                </button>
                <button type="button" title="移除此页" class="danger" @click="removePage(idx)">
                  <Trash2 :size="14" />
                </button>
              </div>
            </div>
          </article>
        </div>
      </template>

      <!-- Tab 2: 图片 <-> PDF 互转 -->
      <div v-else-if="activeTab === 'convert'" class="convert-grid">
        <section class="panel-card">
          <div class="panel-head">
            <h2>1. PDF 导出为高清图片（PNG / JPG）</h2>
            <p>将已加载并勾选的 PDF 页面渲染为高清图片并打包 ZIP 下载。</p>
          </div>
          <div class="form-grid">
            <label>
              <span>清晰度倍率</span>
              <select v-model.number="imgScale">
                <option :value="1">1x 标准（72 DPI）</option>
                <option :value="2">2x 高清（144 DPI 推荐）</option>
                <option :value="3">3x 超清打印级（216 DPI）</option>
              </select>
            </label>
            <label>
              <span>输出格式</span>
              <select v-model="imgFormat">
                <option value="png">PNG（无损清晰）</option>
                <option value="jpeg">JPG（体积更小）</option>
              </select>
            </label>
          </div>
          <div class="panel-actions">
            <button type="button" class="btn secondary" @click="fileInputRef?.click()">
              <FilePlus2 :size="15" /> 选择/更换 PDF（当前 {{ selectedPages.length }} 页）
            </button>
            <button type="button" class="btn primary" :disabled="isBusy || selectedPages.length === 0" @click="runExportImages">
              <Download :size="16" /> 导出图片 ZIP
            </button>
            <button type="button" class="btn secondary" :disabled="isBusy || selectedPages.length === 0" @click="runExportLongImage">
              <ImageIcon :size="16" /> 拼接导出为竖向长图
            </button>
          </div>
        </section>

        <section class="panel-card">
          <div class="panel-head">
            <h2>2. 多张图片合成为单个 PDF</h2>
            <p>支持 PNG、JPG、WebP，纯本地合成无水印。</p>
          </div>
          <input
            ref="imgInputRef"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            hidden
            @change="(e) => { const f = (e.target as HTMLInputElement).files; if (f) handleImageFiles(f); }"
          />
          <div class="form-grid">
            <label>
              <span>页面排版尺寸</span>
              <select v-model="pdfPageMode">
                <option value="a4">统一 A4 纸张（自动居中留白）</option>
                <option value="fit">按每张图片原尺寸自适应</option>
              </select>
            </label>
            <div class="img-upload-btn-wrap">
              <button type="button" class="btn secondary" @click="imgInputRef?.click()">
                <Upload :size="15" /> 添加图片（已选 {{ imageInputs.length }} 张）
              </button>
            </div>
          </div>

          <ul v-if="imageInputs.length > 0" class="img-list">
            <li v-for="(img, idx) in imageInputs" :key="img.id">
              <img :src="img.previewUrl" :alt="img.name" />
              <span class="img-name">{{ idx + 1 }}. {{ img.name }}</span>
              <div class="page-ops">
                <button type="button" :disabled="idx === 0" @click="moveImage(idx, -1)"><ArrowLeft :size="13" /></button>
                <button type="button" :disabled="idx === imageInputs.length - 1" @click="moveImage(idx, 1)"><ArrowRight :size="13" /></button>
                <button type="button" class="danger" @click="removeImage(idx)"><Trash2 :size="13" /></button>
              </div>
            </li>
          </ul>

          <div class="panel-actions">
            <button type="button" class="btn primary" :disabled="isBusy || imageInputs.length === 0" @click="runImagesToPdf">
              <Download :size="16" /> 合成并下载 PDF
            </button>
          </div>
        </section>
      </div>

      <!-- Tab 3: 水印与电子盖章 -->
      <section v-else-if="activeTab === 'watermark'" class="panel-card watermark-panel">
        <div class="panel-head">
          <h2>本地文字水印 / 透明电子签名盖章</h2>
          <p>适合简历、合同、身份证复印件加注“仅限某某用途”或盖章，全程离线不泄密。</p>
        </div>

        <div class="wm-mode-switch">
          <button type="button" :class="['chip-btn', { active: wmMode === 'text' }]" @click="wmMode = 'text'">
            文字水印
          </button>
          <button type="button" :class="['chip-btn', { active: wmMode === 'draw' }]" @click="wmMode = 'draw'">
            手写电子签名
          </button>
          <button type="button" :class="['chip-btn', { active: wmMode === 'image' }]" @click="wmMode = 'image'">
            上传印章图片
          </button>
        </div>

        <div v-if="wmMode === 'draw'" class="sig-pad-wrap">
          <div class="sig-toolbar">
            <span>请在下方空白区手写签名（导出时自动生成透明背景 PNG）：</span>
            <div class="sig-controls">
              <input v-model="sigColor" type="color" title="签名笔迹颜色" />
              <button type="button" class="chip-btn" @click="clearSigCanvas">清空重签</button>
            </div>
          </div>
          <canvas
            ref="sigCanvasRef"
            width="520"
            height="180"
            class="sig-canvas"
            @pointerdown="startSigDraw"
            @pointermove="moveSigDraw"
            @pointerup="endSigDraw"
            @pointercancel="endSigDraw"
          />
          <div class="form-grid" style="margin-top: 12px">
            <label>
              <span>签名宽度占比 ({{ Math.round(wmStampScale * 100) }}%)</span>
              <input v-model.number="wmStampScale" type="range" min="0.1" max="0.5" step="0.02" />
            </label>
          </div>
        </div>

        <div v-else-if="wmMode === 'text'" class="form-grid">
          <label>
            <span>水印文字（支持中英文）</span>
            <input v-model="wmText" type="text" maxlength="60" />
          </label>
          <label>
            <span>文字颜色</span>
            <input v-model="wmColor" type="color" />
          </label>
          <label>
            <span>字号 ({{ wmFontSize }}px)</span>
            <input v-model.number="wmFontSize" type="range" min="14" max="64" />
          </label>
          <label>
            <span>旋转角度 ({{ wmAngle }}°)</span>
            <input v-model.number="wmAngle" type="range" min="-60" max="60" />
          </label>
        </div>

        <div v-else class="form-grid">
          <input ref="stampInputRef" type="file" accept="image/png,image/jpeg" hidden @change="handleStampFile" />
          <div>
            <button type="button" class="btn secondary" @click="stampInputRef?.click()">
              <Upload :size="15" /> 上传透明 PNG 签名 / 印章图
            </button>
            <img v-if="wmStampPreview" :src="wmStampPreview" alt="印章预览" class="stamp-preview" />
          </div>
          <label>
            <span>印章宽度占比 ({{ Math.round(wmStampScale * 100) }}%)</span>
            <input v-model.number="wmStampScale" type="range" min="0.1" max="0.5" step="0.02" />
          </label>
        </div>

        <div class="form-grid">
          <label>
            <span>位置分布</span>
            <select v-model="wmPosition">
              <option value="tile">全页斜向平铺（防盗用推荐）</option>
              <option value="center">页面正中</option>
              <option value="bottom-right">右下角（适合签名/盖章）</option>
              <option value="top-left">左上角</option>
            </select>
          </label>
          <label>
            <span>不透明度 ({{ Math.round(wmOpacity * 100) }}%)</span>
            <input v-model.number="wmOpacity" type="range" min="0.1" max="1" step="0.05" />
          </label>
        </div>

        <div class="panel-actions">
          <button type="button" class="btn primary" :disabled="isBusy || selectedPages.length === 0" @click="runExportMerged(true)">
            <Download :size="16" /> 应用到已选 {{ selectedPages.length }} 页并导出 PDF
          </button>
        </div>
      </section>

      <!-- Tab 4: 文本提取与瘦身压缩 -->
      <div v-else class="convert-grid">
        <section class="panel-card">
          <div class="panel-head">
            <h2>1. 一键提取 PDF 纯文本</h2>
            <p>纯本地解析已选 {{ selectedPages.length }} 页文字内容，支持一键复制或导出 .txt。</p>
          </div>
          <div class="panel-actions" style="margin-bottom: 14px">
            <button type="button" class="btn primary" :disabled="isBusy || selectedPages.length === 0" @click="runExtractText">
              <Type :size="16" /> 提取已选页文字
            </button>
            <button type="button" class="btn secondary" :disabled="!extractedText" @click="copyExtractedText">
              <Copy :size="15" /> 一键复制
            </button>
            <button type="button" class="btn secondary" :disabled="!extractedText" @click="downloadExtractedText">
              <Download :size="15" /> 导出 TXT
            </button>
          </div>
          <textarea
            v-model="extractedText"
            class="extracted-box"
            rows="10"
            placeholder="点击上方「提取已选页文字」后，提取结果将显示在这里..."
          />
        </section>

        <section class="panel-card">
          <div class="panel-head">
            <h2>2. 扫描件 PDF 本地瘦身压缩</h2>
            <p>适合手机拍照或扫描版大体积 PDF 本地减重，压缩后便于邮件/微信发送。</p>
          </div>
          <div class="form-grid">
            <label>
              <span>压缩强度</span>
              <select v-model="compressLevel">
                <option value="low">极限小体积（适合微信/邮件快速发送）</option>
                <option value="medium">均衡推荐（清晰度与体积兼顾）</option>
                <option value="high">高清轻压缩（保留高细节）</option>
              </select>
            </label>
          </div>
          <div class="panel-actions">
            <button type="button" class="btn primary" :disabled="isBusy || selectedPages.length === 0" @click="runCompressPdf">
              <FileDown :size="16" /> 本地压缩已选 {{ selectedPages.length }} 页并下载
            </button>
          </div>
        </section>
      </div>
    </main>

    <div v-if="previewModalUrl" class="preview-modal" @click.self="previewModalUrl = ''">
      <div class="preview-dialog">
        <div class="preview-header">
          <strong>{{ previewModalTitle }}</strong>
          <button type="button" class="close-btn" @click="previewModalUrl = ''"><X :size="18" /></button>
        </div>
        <div class="preview-body">
          <img :src="previewModalUrl" :alt="previewModalTitle" />
        </div>
      </div>
    </div>

    <div v-if="isDragging" class="drag-overlay">
      <div class="drag-box">
        <Upload :size="40" />
        <p>松开鼠标即可在本地导入文件</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
:global(body) {
  margin: 0;
  background: #f8fafc;
  color: #0f172a;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.studio-root {
  min-height: 100vh;
}
.topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid #e2e8f0;
}
.topbar-inner {
  max-width: 1240px;
  margin: 0 auto;
  padding: 12px 24px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}
.logo-box {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}
.brand h1 {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
}
.brand p {
  margin: 2px 0 0;
  font-size: 12px;
  color: #64748b;
}
.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 9px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #475569;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
}
.tab-btn.active {
  background: #dc2626;
  color: #fff;
  border-color: #dc2626;
}
.privacy-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border-radius: 999px;
  background: #ecfdf5;
  color: #047857;
  font-size: 12px;
  font-weight: 600;
}
.main-wrap {
  max-width: 1240px;
  margin: 0 auto;
  padding: 24px;
}
.toast {
  padding: 11px 16px;
  border-radius: 10px;
  margin-bottom: 16px;
  font-size: 13.5px;
  font-weight: 600;
}
.toast.ok {
  background: #ecfdf5;
  color: #047857;
  border: 1px solid #a7f3d0;
}
.toast.err {
  background: #fef2f2;
  color: #b91c1c;
  border: 1px solid #fecaca;
}
.busy-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 10px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 13.5px;
  font-weight: 600;
  margin-bottom: 16px;
}
.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #93c5fd;
  border-top-color: #1d4ed8;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.upload-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 20px;
  border-radius: 14px;
  background: #fff;
  border: 1px solid #e2e8f0;
  margin-bottom: 18px;
}
.upload-info strong {
  display: block;
  font-size: 15px;
}
.upload-info span {
  font-size: 12.5px;
  color: #64748b;
}
.upload-actions {
  display: flex;
  gap: 10px;
}
.btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 16px;
  border-radius: 10px;
  border: none;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn.primary {
  background: #dc2626;
  color: #fff;
}
.btn.primary:hover:not(:disabled) {
  background: #b91c1c;
}
.btn.secondary {
  background: #f1f5f9;
  color: #1e293b;
  border: 1px solid #cbd5e1;
}
.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}
.toolbar-left, .toolbar-right {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.range-form {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.range-form input {
  width: 112px;
  padding: 5px 9px;
  border-radius: 999px;
  border: 1px solid #cbd5e1;
  font-size: 12px;
  background: #fff;
}
.inline-check {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12.5px;
  font-weight: 600;
  color: #334155;
  cursor: pointer;
  padding: 4px 6px;
}
.page-card[draggable='true'] {
  cursor: grab;
}
.page-card.dragging {
  opacity: 0.45;
}
.extracted-box {
  width: 100%;
  box-sizing: border-box;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  color: #0f172a;
  font-size: 13px;
  line-height: 1.65;
  resize: vertical;
  font-family: inherit;
}
.sig-pad-wrap {
  margin-bottom: 16px;
}
.sig-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 12.5px;
  font-weight: 600;
  color: #334155;
  margin-bottom: 8px;
}
.sig-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}
.sig-canvas {
  width: 100%;
  max-width: 520px;
  height: 180px;
  border: 2px dashed #cbd5e1;
  border-radius: 12px;
  background: #fff;
  cursor: crosshair;
  touch-action: none;
}
.preview-modal {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: rgba(15, 23, 42, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.preview-dialog {
  width: min(860px, 95vw);
  max-height: 92vh;
  background: #fff;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 18px;
  border-bottom: 1px solid #e2e8f0;
  font-size: 14px;
}
.close-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  color: #64748b;
  padding: 4px;
}
.preview-body {
  padding: 16px;
  overflow: auto;
  background: #f1f5f9;
  text-align: center;
}
.preview-body img {
  max-width: 100%;
  height: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}
.chip-btn {
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #334155;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}
.chip-btn.active {
  background: #0f172a;
  color: #fff;
  border-color: #0f172a;
}
.empty-drop {
  padding: 72px 24px;
  border-radius: 16px;
  border: 2px dashed #cbd5e1;
  background: #fff;
  text-align: center;
  color: #64748b;
  cursor: pointer;
}
.empty-drop h2 {
  margin: 14px 0 6px;
  font-size: 18px;
  color: #0f172a;
}
.empty-drop p {
  margin: 0;
  font-size: 13.5px;
}
.pages-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(185px, 1fr));
  gap: 16px;
}
.page-card {
  border-radius: 12px;
  background: #fff;
  border: 2px solid #e2e8f0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.page-card.selected {
  border-color: #dc2626;
}
.page-thumb-wrap {
  position: relative;
  height: 220px;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  overflow: hidden;
  padding: 8px;
}
.page-thumb-wrap img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  transition: transform 0.2s;
}
.check-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.9);
  color: #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
}
.check-badge.on {
  background: #dc2626;
  color: #fff;
}
.page-num {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 2px 7px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.72);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
}
.page-meta {
  padding: 10px;
  border-top: 1px solid #f1f5f9;
}
.file-name {
  display: block;
  font-size: 11.5px;
  color: #475569;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 8px;
}
.page-ops {
  display: flex;
  justify-content: space-between;
  gap: 4px;
}
.page-ops button {
  flex: 1;
  padding: 5px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  color: #334155;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.page-ops button:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.page-ops button.danger:hover {
  background: #fef2f2;
  color: #dc2626;
  border-color: #fecaca;
}
.convert-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}
.panel-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 22px;
}
.panel-head h2 {
  margin: 0;
  font-size: 17px;
}
.panel-head p {
  margin: 6px 0 18px;
  font-size: 13px;
  color: #64748b;
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 16px;
}
.form-grid label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 600;
  color: #334155;
}
.form-grid input[type='text'],
.form-grid select {
  padding: 9px 11px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  font-size: 13.5px;
}
.img-upload-btn-wrap {
  display: flex;
  align-items: flex-end;
}
.img-list {
  list-style: none;
  padding: 0;
  margin: 0 0 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 240px;
  overflow-y: auto;
}
.img-list li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}
.img-list img {
  width: 36px;
  height: 36px;
  object-fit: cover;
  border-radius: 6px;
}
.img-name {
  flex: 1;
  font-size: 12.5px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.panel-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.wm-mode-switch {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}
.stamp-preview {
  display: block;
  margin-top: 10px;
  max-width: 140px;
  max-height: 70px;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  padding: 4px;
}
.drag-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
}
.drag-box {
  padding: 40px 56px;
  border-radius: 18px;
  background: #fff;
  color: #dc2626;
  text-align: center;
  font-size: 16px;
  font-weight: 700;
}
@media (max-width: 860px) {
  .convert-grid, .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
