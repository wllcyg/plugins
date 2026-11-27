<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Eraser,
  Highlighter,
  MousePointer,
  Pencil,
  PenTool,
  Square,
  Trash2,
  Type,
  Upload
} from 'lucide-vue-next';
import {
  renderSinglePagePreview,
  type PageAnnotation,
  type PdfPageItem
} from '../core/pdf-engine';
import { m } from '../locales';

const props = defineProps<{
  pages: PdfPageItem[];
  sources: Map<string, Uint8Array>;
  annotations: PageAnnotation[];
  isBusy: boolean;
}>();

const emit = defineEmits<{
  'update:annotations': [value: PageAnnotation[]];
  exportPdf: [];
}>();

type ToolMode = 'select' | 'text' | 'redact' | 'highlight' | 'ink' | 'stamp';

const currentPageIdx = ref(0);
const pageImageUrl = ref('');
const isRenderingPage = ref(false);
const toolMode = ref<ToolMode>('text');

const textInputDraft = ref('');
const textColor = ref('#0f172a');
const textSize = ref(16);
const pendingTextPos = ref<{ xRatio: number; yRatio: number } | null>(null);

const redactColor = ref<'#000000' | '#ffffff'>('#000000');
const highlightColor = ref('#facc15');
const inkColor = ref('#dc2626');
const inkStrokeWidth = ref(2.5);
const drawingBox = ref<{ kind: 'redact' | 'highlight'; startX: number; startY: number; curX: number; curY: number } | null>(null);
const drawingInk = ref<Array<{ x: number; y: number }> | null>(null);

// 签名板状态
const showSigModal = ref(false);
const sigCanvasRef = ref<HTMLCanvasElement | null>(null);
const sigColor = ref('#0f172a');
const isDrawingSig = ref(false);
const hasDrawnSig = ref(false);
const stampUploadRef = ref<HTMLInputElement | null>(null);

// 拖拽已有元素
const selectedAnnId = ref<string | null>(null);
const dragState = ref<{
  id: string;
  kind: 'move' | 'resize';
  startClientX: number;
  startClientY: number;
  origX: number;
  origY: number;
  origW: number;
  origH: number;
} | null>(null);

const stageRef = ref<HTMLElement | null>(null);

const activePage = computed(() => props.pages[currentPageIdx.value] || props.pages[0]);
const currentPageAnnotations = computed(() =>
  activePage.value ? props.annotations.filter((a) => a.pageUid === activePage.value.uid) : []
);

watch(
  () => [activePage.value?.uid, activePage.value?.rotation] as const,
  async () => {
    const p = activePage.value;
    if (!p) {
      pageImageUrl.value = '';
      return;
    }
    isRenderingPage.value = true;
    try {
      pageImageUrl.value = await renderSinglePagePreview(props.sources, p, 1.5);
    } catch {
      pageImageUrl.value = p.thumbnailUrl;
    } finally {
      isRenderingPage.value = false;
    }
  },
  { immediate: true }
);

watch(
  () => props.pages.length,
  (len) => {
    if (currentPageIdx.value >= len) currentPageIdx.value = Math.max(0, len - 1);
  }
);

function getRelPos(e: PointerEvent | MouseEvent) {
  const rect = stageRef.value?.getBoundingClientRect();
  if (!rect || rect.width === 0 || rect.height === 0) return { x: 0, y: 0 };
  return {
    x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
    y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height))
  };
}

function onStagePointerDown(e: PointerEvent) {
  if (!activePage.value) return;
  if ((e.target as HTMLElement).closest('.ann-item, .inline-text-editor')) return;

  selectedAnnId.value = null;
  const pos = getRelPos(e);

  if (toolMode.value === 'text') {
    pendingTextPos.value = { xRatio: pos.x, yRatio: pos.y };
    textInputDraft.value = '';
    return;
  }

  if (toolMode.value === 'redact' || toolMode.value === 'highlight') {
    stageRef.value?.setPointerCapture(e.pointerId);
    drawingBox.value = { kind: toolMode.value, startX: pos.x, startY: pos.y, curX: pos.x, curY: pos.y };
    return;
  }

  if (toolMode.value === 'ink') {
    stageRef.value?.setPointerCapture(e.pointerId);
    drawingInk.value = [{ x: pos.x, y: pos.y }];
  }
}

function onStagePointerMove(e: PointerEvent) {
  if (drawingBox.value) {
    const pos = getRelPos(e);
    drawingBox.value.curX = pos.x;
    drawingBox.value.curY = pos.y;
    return;
  }

  if (drawingInk.value) {
    const pos = getRelPos(e);
    drawingInk.value.push({ x: pos.x, y: pos.y });
    return;
  }

  if (dragState.value && stageRef.value) {
    const rect = stageRef.value.getBoundingClientRect();
    const dx = (e.clientX - dragState.value.startClientX) / rect.width;
    const dy = (e.clientY - dragState.value.startClientY) / rect.height;
    const next = props.annotations.map((ann) => {
      if (ann.id !== dragState.value?.id) return ann;
      if (dragState.value.kind === 'move' && ann.type !== 'ink') {
        return {
          ...ann,
          xRatio: Math.min(0.95, Math.max(0, dragState.value.origX + dx)),
          yRatio: Math.min(0.95, Math.max(0, dragState.value.origY + dy))
        };
      }
      if (ann.type === 'redact' || ann.type === 'stamp' || ann.type === 'highlight') {
        return {
          ...ann,
          wRatio: Math.max(0.03, dragState.value.origW + dx),
          hRatio: Math.max(0.015, dragState.value.origH + dy)
        };
      }
      return ann;
    });
    emit('update:annotations', next);
  }
}

function onStagePointerUp() {
  if (drawingBox.value && activePage.value) {
    const d = drawingBox.value;
    const xRatio = Math.min(d.startX, d.curX);
    const yRatio = Math.min(d.startY, d.curY);
    const wRatio = Math.abs(d.curX - d.startX);
    const hRatio = Math.abs(d.curY - d.startY);
    drawingBox.value = null;
    if (wRatio > 0.015 && hRatio > 0.008) {
      const id = `ann_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      emit('update:annotations', [
        ...props.annotations,
        d.kind === 'redact'
          ? {
              id,
              pageUid: activePage.value.uid,
              type: 'redact',
              xRatio,
              yRatio,
              wRatio,
              hRatio,
              color: redactColor.value
            }
          : {
              id,
              pageUid: activePage.value.uid,
              type: 'highlight',
              xRatio,
              yRatio,
              wRatio,
              hRatio,
              color: highlightColor.value
            }
      ]);
      selectedAnnId.value = id;
    }
  }

  if (drawingInk.value && activePage.value) {
    const pts = drawingInk.value;
    drawingInk.value = null;
    if (pts.length > 2) {
      const id = `ann_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      emit('update:annotations', [
        ...props.annotations,
        {
          id,
          pageUid: activePage.value.uid,
          type: 'ink',
          xRatio: pts[0].x,
          yRatio: pts[0].y,
          points: pts,
          color: inkColor.value,
          strokeWidth: inkStrokeWidth.value
        }
      ]);
    }
  }
  dragState.value = null;
}

function confirmTextInput(preset?: string) {
  if (!activePage.value || !pendingTextPos.value) return;
  const val = (preset ?? textInputDraft.value).trim();
  if (val) {
    const id = `ann_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    emit('update:annotations', [
      ...props.annotations,
      {
        id,
        pageUid: activePage.value.uid,
        type: 'text',
        xRatio: pendingTextPos.value.xRatio,
        yRatio: pendingTextPos.value.yRatio,
        text: val,
        color: textColor.value,
        fontSize: textSize.value
      }
    ]);
    selectedAnnId.value = id;
  }
  pendingTextPos.value = null;
  textInputDraft.value = '';
}

function startAnnDrag(e: PointerEvent, ann: PageAnnotation, kind: 'move' | 'resize') {
  e.stopPropagation();
  selectedAnnId.value = ann.id;
  dragState.value = {
    id: ann.id,
    kind,
    startClientX: e.clientX,
    startClientY: e.clientY,
    origX: ann.xRatio,
    origY: ann.yRatio,
    origW: ann.type === 'text' || ann.type === 'ink' ? 0.1 : ann.wRatio,
    origH: ann.type === 'text' || ann.type === 'ink' ? 0.05 : ann.hRatio
  };
}

function deleteAnnotation(id: string) {
  emit(
    'update:annotations',
    props.annotations.filter((a) => a.id !== id)
  );
  if (selectedAnnId.value === id) selectedAnnId.value = null;
}

function clearCurrentPageAnnotations() {
  if (!activePage.value) return;
  emit(
    'update:annotations',
    props.annotations.filter((a) => a.pageUid !== activePage.value.uid)
  );
}

// 签名画板逻辑
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

function clearSigCanvas() {
  const canvas = sigCanvasRef.value;
  canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
  hasDrawnSig.value = false;
}

async function placeDrawnSignature() {
  const canvas = sigCanvasRef.value;
  if (!canvas || !hasDrawnSig.value || !activePage.value) return;
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) return;
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const previewUrl = URL.createObjectURL(blob);
  const id = `ann_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  emit('update:annotations', [
    ...props.annotations,
    {
      id,
      pageUid: activePage.value.uid,
      type: 'stamp',
      xRatio: 0.62,
      yRatio: 0.78,
      wRatio: 0.26,
      hRatio: 0.09,
      previewUrl,
      imageBytes: bytes,
      imageMime: 'image/png'
    }
  ]);
  showSigModal.value = false;
  toolMode.value = 'select';
  selectedAnnId.value = id;
}

async function onUploadStamp(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file || !activePage.value) return;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const previewUrl = URL.createObjectURL(file);
  const id = `ann_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  emit('update:annotations', [
    ...props.annotations,
    {
      id,
      pageUid: activePage.value.uid,
      type: 'stamp',
      xRatio: 0.62,
      yRatio: 0.75,
      wRatio: 0.22,
      hRatio: 0.14,
      previewUrl,
      imageBytes: bytes,
      imageMime: file.type || 'image/png'
    }
  ]);
  toolMode.value = 'select';
  selectedAnnId.value = id;
}

const todayStr = new Date().toISOString().slice(0, 10);
</script>

<template>
  <div class="editor-shell">
    <div class="editor-toolbar">
      <div class="tool-group">
        <button
          type="button"
          :class="['tool-btn', { active: toolMode === 'select' }]"
          @click="toolMode = 'select'"
        >
          <MousePointer :size="15" /> {{ m.edSelect }}
        </button>
        <button
          type="button"
          :class="['tool-btn', { active: toolMode === 'text' }]"
          @click="toolMode = 'text'"
        >
          <Type :size="15" /> {{ m.edText }}
        </button>
        <button
          type="button"
          :class="['tool-btn', { active: toolMode === 'redact' }]"
          @click="toolMode = 'redact'"
        >
          <Square :size="15" /> {{ m.edRedact }}
        </button>
        <button
          type="button"
          :class="['tool-btn', { active: toolMode === 'highlight' }]"
          @click="toolMode = 'highlight'"
        >
          <Highlighter :size="15" /> {{ m.edHighlight }}
        </button>
        <button
          type="button"
          :class="['tool-btn', { active: toolMode === 'ink' }]"
          @click="toolMode = 'ink'"
        >
          <Pencil :size="15" /> {{ m.edInk }}
        </button>
        <button type="button" class="tool-btn" @click="showSigModal = true">
          <PenTool :size="15" /> {{ m.edSign }}
        </button>
        <input ref="stampUploadRef" type="file" accept="image/png,image/jpeg" hidden @change="onUploadStamp" />
        <button type="button" class="tool-btn" @click="stampUploadRef?.click()">
          <Upload :size="15" /> {{ m.edUploadStamp }}
        </button>
      </div>

      <div v-if="toolMode === 'text'" class="sub-opts">
        <input v-model="textColor" type="color" />
        <select v-model.number="textSize">
          <option :value="12">12px</option>
          <option :value="16">16px</option>
          <option :value="22">22px</option>
          <option :value="28">28px</option>
        </select>
      </div>
      <div v-else-if="toolMode === 'redact'" class="sub-opts">
        <select v-model="redactColor">
          <option value="#000000">{{ m.edRedactBlack }}</option>
          <option value="#ffffff">{{ m.edRedactWhite }}</option>
        </select>
      </div>
      <div v-else-if="toolMode === 'highlight'" class="sub-opts">
        <input v-model="highlightColor" type="color" />
      </div>
      <div v-else-if="toolMode === 'ink'" class="sub-opts">
        <input v-model="inkColor" type="color" />
      </div>

      <div class="page-nav">
        <button
          type="button"
          class="icon-btn"
          :disabled="currentPageIdx === 0"
          @click="currentPageIdx--"
        >
          <ChevronLeft :size="16" />
        </button>
        <span>{{ m.edPageOf(currentPageIdx + 1, pages.length) }}</span>
        <button
          type="button"
          class="icon-btn"
          :disabled="currentPageIdx >= pages.length - 1"
          @click="currentPageIdx++"
        >
          <ChevronRight :size="16" />
        </button>
        <button
          v-if="currentPageAnnotations.length > 0"
          type="button"
          class="icon-btn danger"
          :title="m.edClearPage"
          @click="clearCurrentPageAnnotations"
        >
          <Eraser :size="15" />
        </button>
        <button type="button" class="export-btn" :disabled="isBusy" @click="emit('exportPdf')">
          <Download :size="15" /> {{ m.edExport(annotations.length) }}
        </button>
      </div>
    </div>

    <p class="hint-line">
      {{
        toolMode === 'text'
          ? m.edHintText
          : toolMode === 'redact'
            ? m.edHintRedact
            : m.edHintSelect
      }}
    </p>

    <div class="canvas-viewport">
      <div
        ref="stageRef"
        class="pdf-stage"
        :class="`mode-${toolMode}`"
        @pointerdown="onStagePointerDown"
        @pointermove="onStagePointerMove"
        @pointerup="onStagePointerUp"
      >
        <img v-if="pageImageUrl" :src="pageImageUrl" alt="PDF Canvas" draggable="false" />
        <div v-if="isRenderingPage" class="rendering-mask">{{ m.edRendering }}</div>

        <!-- 正在框选的打码 / 荧光笔区域 -->
        <div
          v-if="drawingBox"
          class="redact-preview"
          :style="{
            left: `${Math.min(drawingBox.startX, drawingBox.curX) * 100}%`,
            top: `${Math.min(drawingBox.startY, drawingBox.curY) * 100}%`,
            width: `${Math.abs(drawingBox.curX - drawingBox.startX) * 100}%`,
            height: `${Math.abs(drawingBox.curY - drawingBox.startY) * 100}%`,
            background: drawingBox.kind === 'redact' ? redactColor : highlightColor,
            opacity: drawingBox.kind === 'redact' ? 0.78 : 0.38
          }"
        />

        <!-- 自由画笔矢量层 -->
        <svg class="ink-overlay" viewBox="0 0 100 100" preserveAspectRatio="none">
          <polyline
            v-for="ann in currentPageAnnotations.filter((a) => a.type === 'ink')"
            :key="ann.id"
            fill="none"
            :stroke="ann.type === 'ink' ? ann.color : '#dc2626'"
            :stroke-width="ann.type === 'ink' ? ann.strokeWidth * 0.16 : 0.4"
            stroke-linecap="round"
            stroke-linejoin="round"
            :points="ann.type === 'ink' ? ann.points.map((pt) => `${pt.x * 100},${pt.y * 100}`).join(' ') : ''"
          />
          <polyline
            v-if="drawingInk"
            fill="none"
            :stroke="inkColor"
            :stroke-width="inkStrokeWidth * 0.16"
            stroke-linecap="round"
            stroke-linejoin="round"
            :points="drawingInk.map((pt) => `${pt.x * 100},${pt.y * 100}`).join(' ')"
          />
        </svg>

        <!-- 已放置的批注元素 -->
        <div
          v-for="ann in currentPageAnnotations.filter((a) => a.type !== 'ink')"
          :key="ann.id"
          :class="['ann-item', `ann-${ann.type}`, { active: selectedAnnId === ann.id }]"
          :style="
            ann.type === 'text'
              ? {
                  left: `${ann.xRatio * 100}%`,
                  top: `${ann.yRatio * 100}%`,
                  color: ann.color,
                  fontSize: `${ann.fontSize}px`
                }
              : {
                  left: `${ann.xRatio * 100}%`,
                  top: `${ann.yRatio * 100}%`,
                  width: `${ann.wRatio * 100}%`,
                  height: `${ann.hRatio * 100}%`,
                  background: ann.type === 'redact' || ann.type === 'highlight' ? ann.color : 'transparent',
                  opacity: ann.type === 'highlight' ? 0.38 : 1
                }
          "
          @pointerdown="startAnnDrag($event, ann, 'move')"
        >
          <span v-if="ann.type === 'text'">{{ ann.text }}</span>
          <img v-else-if="ann.type === 'stamp'" :src="ann.previewUrl" alt="签名印章" draggable="false" />

          <button
            type="button"
            class="ann-del"
            title="删除"
            @pointerdown.stop
            @click.stop="deleteAnnotation(ann.id)"
          >
            <Trash2 :size="12" />
          </button>
          <span
            v-if="ann.type !== 'text'"
            class="ann-resize"
            @pointerdown="startAnnDrag($event, ann, 'resize')"
          />
        </div>

        <!-- 点击打字浮窗 -->
        <div
          v-if="pendingTextPos"
          class="inline-text-editor"
          :style="{ left: `${pendingTextPos.xRatio * 100}%`, top: `${pendingTextPos.yRatio * 100}%` }"
          @pointerdown.stop
        >
          <input
            v-model="textInputDraft"
            type="text"
            autofocus
            :placeholder="m.edInputPlaceholder"
            @keydown.enter.prevent="confirmTextInput()"
            @keydown.esc="pendingTextPos = null"
          />
          <div class="preset-chips">
            <button type="button" @click="confirmTextInput('✓')">✓</button>
            <button type="button" @click="confirmTextInput('✕')">✕</button>
            <button type="button" @click="confirmTextInput(todayStr)">{{ todayStr }}</button>
            <button type="button" class="ok" @click="confirmTextInput()"><Check :size="13" /> {{ m.edConfirm }}</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 手写签名弹窗 -->
    <div v-if="showSigModal" class="sig-modal" @click.self="showSigModal = false">
      <div class="sig-dialog">
        <div class="sig-head">
          <strong>{{ m.edSigTitle }}</strong>
          <div class="sig-head-actions">
            <input v-model="sigColor" type="color" />
            <button type="button" class="tool-btn" @click="clearSigCanvas">{{ m.edSigClear }}</button>
          </div>
        </div>
        <canvas
          ref="sigCanvasRef"
          width="520"
          height="190"
          class="sig-canvas"
          @pointerdown="startSigDraw"
          @pointermove="moveSigDraw"
          @pointerup="isDrawingSig = false"
          @pointercancel="isDrawingSig = false"
        />
        <div class="sig-foot">
          <button type="button" class="tool-btn" @click="showSigModal = false">{{ m.edCancel }}</button>
          <button type="button" class="export-btn" :disabled="!hasDrawnSig" @click="placeDrawnSignature">
            <Check :size="15" /> {{ m.edSigInsert }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.editor-shell {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 16px;
}
.editor-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f1f5f9;
}
.tool-group, .sub-opts, .page-nav {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}
.tool-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 12px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #334155;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}
.tool-btn.active {
  background: #0f172a;
  color: #fff;
  border-color: #0f172a;
}
.sub-opts select {
  padding: 6px 9px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  font-size: 12.5px;
}
.icon-btn {
  padding: 6px 8px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
}
.icon-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.icon-btn.danger:hover {
  color: #dc2626;
  border-color: #fecaca;
}
.page-nav span {
  font-size: 12.5px;
  font-weight: 600;
  color: #475569;
  padding: 0 4px;
}
.export-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 8px;
  border: none;
  background: #dc2626;
  color: #fff;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}
.export-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.hint-line {
  margin: 10px 0 12px;
  font-size: 12.5px;
  color: #64748b;
}
.canvas-viewport {
  background: #e2e8f0;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  justify-content: center;
  overflow: auto;
  max-height: 74vh;
}
.pdf-stage {
  position: relative;
  display: inline-block;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.18);
  user-select: none;
  background: #fff;
}
.pdf-stage.mode-text { cursor: text; }
.pdf-stage.mode-redact,
.pdf-stage.mode-highlight,
.pdf-stage.mode-ink { cursor: crosshair; }
.ink-overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
.pdf-stage img {
  display: block;
  max-width: 820px;
  width: 100%;
  height: auto;
}
.rendering-mask {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
}
.redact-preview {
  position: absolute;
  opacity: 0.75;
  pointer-events: none;
}
.ann-item {
  position: absolute;
  cursor: move;
  border: 1.5px dashed transparent;
}
.ann-item:hover, .ann-item.active {
  border-color: #2563eb;
}
.ann-text {
  font-weight: 600;
  line-height: 1.2;
  white-space: nowrap;
  padding: 2px 4px;
}
.ann-stamp img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.ann-del {
  display: none;
  position: absolute;
  top: -12px;
  right: -12px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: none;
  background: #dc2626;
  color: #fff;
  cursor: pointer;
  align-items: center;
  justify-content: center;
}
.ann-item:hover .ann-del, .ann-item.active .ann-del {
  display: flex;
}
.ann-resize {
  display: none;
  position: absolute;
  right: -5px;
  bottom: -5px;
  width: 11px;
  height: 11px;
  border-radius: 2px;
  background: #2563eb;
  cursor: nwse-resize;
}
.ann-item:hover .ann-resize, .ann-item.active .ann-resize {
  display: block;
}
.inline-text-editor {
  position: absolute;
  z-index: 15;
  background: #fff;
  border: 1px solid #2563eb;
  border-radius: 10px;
  padding: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16);
  min-width: 220px;
}
.inline-text-editor input {
  width: 100%;
  box-sizing: border-box;
  padding: 6px 8px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 13px;
  margin-bottom: 6px;
}
.preset-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.preset-chips button {
  padding: 3px 8px;
  border-radius: 6px;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  font-size: 11.5px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 3px;
}
.preset-chips button.ok {
  margin-left: auto;
  background: #2563eb;
  color: #fff;
  border-color: #2563eb;
}
.sig-modal {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: rgba(15, 23, 42, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.sig-dialog {
  background: #fff;
  border-radius: 14px;
  padding: 18px;
  width: min(560px, 95vw);
}
.sig-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 13.5px;
  margin-bottom: 12px;
}
.sig-head-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.sig-canvas {
  width: 100%;
  height: 190px;
  border: 2px dashed #cbd5e1;
  border-radius: 10px;
  background: #fff;
  cursor: crosshair;
  touch-action: none;
}
.sig-foot {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 12px;
}
</style>
