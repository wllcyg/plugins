<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue';
import { Canvas, Circle, FabricImage, FabricText, Group, IText, Point, Polygon, Polyline, Rect, type FabricObject } from 'fabric';
import { ArrowUpRight, Check, Crop, Hand, Highlighter, ListOrdered, MousePointer2, Pencil, Redo2, Square, Type, Undo2 } from 'lucide-vue-next';
import { renderEditedImage, restoreObjects, type CropBounds, type EditorDocument } from '../../src/utils/editor-document';
import { readResult, saveResult, type CaptureResult } from '../../src/utils/result-store';
import { t } from '../../src/utils/i18n';

const tools = [
  { id: 'select', label: 'editorSelect', key: 'V', icon: MousePointer2 },
  { id: 'pan', label: 'editorPan', key: 'H', icon: Hand },
  { id: 'rectangle', label: 'editorRectangle', key: 'R', icon: Square },
  { id: 'arrow', label: 'editorArrow', key: 'A', icon: ArrowUpRight },
  { id: 'text', label: 'editorText', key: 'T', icon: Type },
  { id: 'pen', label: 'editorPen', key: 'B', icon: Pencil },
  { id: 'highlight', label: 'editorHighlight', key: 'G', icon: Highlighter },
  { id: 'redact', label: 'editorRedact', key: 'M', icon: Square },
  { id: 'number', label: 'editorNumber', key: 'N', icon: ListOrdered },
  { id: 'crop', label: 'editorCrop', key: 'C', icon: Crop }
] as const;
type Tool = typeof tools[number]['id'];
const activeTool = ref<Tool>('select');
const color = ref('#dc2626');
const highlightColor = ref('#facc15');
const toolColor = computed(() => activeTool.value === 'highlight' ? highlightColor.value : color.value);
const strokeWidth = ref(4);
const MIN_FONT_SIZE = 12;
const fontSize = ref(MIN_FONT_SIZE);
const selectedTextSize = ref<number | null>(null);
const stage = ref<HTMLDivElement>();
const surface = ref<HTMLCanvasElement>();
const ready = ref(false);
const busy = ref(false);
const status = ref('');
const zoom = ref(1);
const history = shallowRef<EditorDocument[]>([]);
const historyIndex = ref(0);
const documentState = computed(() => history.value[historyIndex.value]);
const hasSelection = ref(false);
const dirty = computed(() => historyIndex.value !== 0 || history.value[0] !== initialDocument);
const resultUrl = ref('');
const imageSize = ref('');
let initialDocument: EditorDocument | undefined;
let capture: CaptureResult | undefined;
let canvas: Canvas | undefined;
let background: FabricImage | undefined;
let source: HTMLImageElement | undefined;
let sourceUrl: string | undefined;
let resizeObserver: ResizeObserver | undefined;
let cropGuide: Rect | undefined;
let drawing: { start: Point; points: Point[]; object?: FabricObject } | undefined;
let panPoint: Point | undefined;
let spaceHeld = false;

function annotations() {
  return canvas?.getObjects().filter((object) => object !== background && object !== cropGuide && object !== drawing?.object) ?? [];
}

function commit(crop = documentState.value?.crop) {
  if (!ready.value || !canvas) return;
  const next = { objects: annotations().map((object) => object.toObject()), ...(crop && { crop }) };
  if (JSON.stringify(next) === JSON.stringify(documentState.value)) return;
  history.value = [...history.value.slice(0, historyIndex.value + 1), next];
  historyIndex.value++;
}

function showCrop(crop = documentState.value?.crop) {
  if (!canvas) return;
  if (cropGuide) canvas.remove(cropGuide);
  cropGuide = crop ? new Rect({
    left: crop.x, top: crop.y, width: crop.width, height: crop.height,
    fill: 'transparent', stroke: '#0891b2', strokeWidth: 2,
    strokeUniform: true, strokeDashArray: [8, 5], selectable: false, evented: false
  }) : undefined;
  if (cropGuide) canvas.add(cropGuide);
  canvas.requestRenderAll();
}

function setTool(tool: Tool) {
  if (!canvas) return;
  const selected = canvas.getActiveObject();
  if (selected instanceof IText && selected.isEditing) selected.exitEditing();
  canvas.discardActiveObject();
  activeTool.value = tool;
  updatePointerMode();
  canvas.requestRenderAll();
}

function updatePointerMode() {
  if (!canvas) return;
  const tool = activeTool.value;
  canvas.skipTargetFind = spaceHeld || tool !== 'select';
  canvas.defaultCursor = spaceHeld || tool === 'pan' ? 'grab' : tool === 'select' ? 'default' : 'crosshair';
  canvas.setCursor(canvas.defaultCursor);
  canvas.requestRenderAll();
}

function fitImage() {
  if (!canvas || !source) return;
  const width = canvas.getWidth();
  const height = canvas.getHeight();
  const scale = Math.min(1, Math.max(1, width - 48) / source.naturalWidth,
    Math.max(1, height - 48) / source.naturalHeight);
  canvas.setViewportTransform([scale, 0, 0, scale,
    (width - source.naturalWidth * scale) / 2, (height - source.naturalHeight * scale) / 2]);
  zoom.value = scale;
}

function setZoom(value: number, at?: Point) {
  if (!canvas) return;
  const min = Math.min(0.05, zoom.value);
  const next = Math.max(min, Math.min(4, value));
  canvas.zoomToPoint(at ?? new Point(canvas.getWidth() / 2, canvas.getHeight() / 2), next);
  zoom.value = next;
}

function clampPoint(point: Point) {
  return new Point(Math.max(0, Math.min(source!.naturalWidth, point.x)),
    Math.max(0, Math.min(source!.naturalHeight, point.y)));
}

function bounds(a: Point, b: Point): CropBounds {
  const x = Math.round(Math.min(a.x, b.x));
  const y = Math.round(Math.min(a.y, b.y));
  return { x, y, width: Math.round(Math.max(a.x, b.x)) - x, height: Math.round(Math.max(a.y, b.y)) - y };
}

function isFreehand() {
  return activeTool.value === 'pen' || activeTool.value === 'highlight';
}

function makeShape(start: Point, end: Point, points: Point[]): FabricObject {
  if (isFreehand()) {
    const highlight = activeTool.value === 'highlight';
    return new Polyline([...points, end], {
      fill: '', stroke: toolColor.value, strokeWidth: strokeWidth.value * (highlight ? 4 : 1),
      strokeLineCap: 'round', strokeLineJoin: 'round', opacity: highlight ? 0.35 : 1
    });
  }
  const area = bounds(start, end);
  if (activeTool.value === 'redact') {
    return new Rect({ left: area.x, top: area.y, width: area.width, height: area.height, fill: '#000', strokeWidth: 0 });
  }
  if (activeTool.value === 'rectangle') {
    return new Rect({ left: area.x, top: area.y, width: area.width, height: area.height,
      fill: 'transparent', stroke: color.value, strokeWidth: strokeWidth.value });
  }
  const distance = Math.max(1, Math.hypot(end.x - start.x, end.y - start.y));
  const vx = (end.x - start.x) / distance;
  const vy = (end.y - start.y) / distance;
  const head = Math.min(distance * 0.55, Math.max(12, strokeWidth.value * 4));
  const shaft = strokeWidth.value / 2;
  const point = (along: number, side: number) =>
    new Point(start.x + vx * along - vy * side, start.y + vy * along + vx * side);
  return new Polygon([
    point(0, -shaft), point(distance - head, -shaft), point(distance - head, -head / 2),
    end, point(distance - head, head / 2), point(distance - head, shaft), point(0, shaft)
  ], { fill: color.value });
}

function addNumber(point: Point) {
  if (!canvas) return;
  const number = annotations().reduce((max, object) => {
    if (!(object instanceof Group)) return max;
    const label = object.getObjects().find((child) => child instanceof FabricText);
    return label instanceof FabricText ? Math.max(max, Number(label.text) || 0) : max;
  }, 0) + 1;
  const radius = String(number).length > 2 ? 17 : 13;
  const circle = new Circle({ radius, fill: color.value, originX: 'center', originY: 'center', strokeWidth: 0 });
  const label = new FabricText(String(number), {
    fill: '#fff', fontSize: 15, fontWeight: 'bold', fontFamily: 'sans-serif', originX: 'center', originY: 'center'
  });
  canvas.add(new Group([circle, label], { left: point.x, top: point.y, originX: 'center', originY: 'center' }));
  commit();
}

async function moveHistory(change: number) {
  if (!canvas || busy.value) return;
  const index = historyIndex.value + change;
  const state = history.value[index];
  if (!state) return;
  busy.value = true;
  try {
    const objects = await restoreObjects(state);
    canvas.discardActiveObject();
    canvas.remove(...annotations());
    canvas.add(...objects);
    historyIndex.value = index;
    showCrop(state.crop);
  } catch {
    status.value = t('editorLoadFailed');
  } finally {
    busy.value = false;
  }
}

function deleteSelection() {
  if (!canvas || busy.value) return;
  const selected = canvas.getActiveObjects();
  canvas.discardActiveObject();
  canvas.remove(...selected);
  commit();
}

function changeColor(event: Event) {
  const next = (event.target as HTMLInputElement).value;
  if (activeTool.value === 'highlight') highlightColor.value = next;
  else color.value = next;
  if (!canvas || busy.value) return;
  const object = canvas.getActiveObject();
  if (object instanceof Group) {
    const badge = object.getObjects().find((child) => child instanceof Circle);
    badge?.set('fill', next);
    object.set('dirty', true);
  } else if (object instanceof Polyline && !(object instanceof Polygon)) {
    object.set('stroke', next);
  } else if (object && !(object instanceof Rect && object.fill === '#000' && object.strokeWidth === 0)) {
    object.set(object instanceof Rect ? 'stroke' : 'fill', next);
  }
  canvas.requestRenderAll();
  commit();
}

function changeStrokeWidth(event: Event) {
  strokeWidth.value = Number((event.target as HTMLInputElement).value);
  if (!canvas || busy.value) return;
  for (const object of canvas.getActiveObjects()) {
    if (object instanceof Rect && object.fill === 'transparent') object.set('strokeWidth', strokeWidth.value);
    if (object instanceof Polyline && !(object instanceof Polygon)) {
      object.set('strokeWidth', strokeWidth.value * (object.opacity < 1 ? 4 : 1));
      object.setCoords();
    }
  }
  canvas.requestRenderAll();
  commit();
}

function changeFontSize(event: Event) {
  const input = event.target as HTMLInputElement;
  const selected = canvas?.getActiveObject();
  const previous = selectedTextSize.value ?? fontSize.value;
  const size = Number.isFinite(input.valueAsNumber)
    ? Math.max(MIN_FONT_SIZE, Math.round(input.valueAsNumber))
    : previous;
  input.value = String(size);
  fontSize.value = size;

  if (!(selected instanceof IText) || busy.value) return;
  selected.set('fontSize', size);
  selected.setCoords();
  selectedTextSize.value = size;
  canvas?.requestRenderAll();
  commit();
}

function returnToResult() {
  if (!busy.value && (!dirty.value || confirm(t('editorDiscard')))) location.replace(resultUrl.value);
}

async function save() {
  if (!source || !capture || !canvas || busy.value) return;
  const selected = canvas.getActiveObject();
  if (selected instanceof IText && selected.isEditing) selected.exitEditing();
  busy.value = true;
  status.value = '';
  try {
    const state = documentState.value;
    const editedImage = state.objects.length || state.crop ? await renderEditedImage(source, state) : undefined;
    await saveResult({ ...capture, editorDocument: editedImage ? state : undefined, editedImage });
    location.replace(resultUrl.value);
  } catch {
    status.value = t('editorSaveFailed');
  } finally {
    busy.value = false;
  }
}

function releaseSpace() {
  if (!spaceHeld) return;
  spaceHeld = false;
  panPoint = undefined;
  updatePointerMode();
}

function handleKeyUp(event: KeyboardEvent) {
  if (event.code === 'Space') releaseSpace();
}

function handleKeys(event: KeyboardEvent) {
  if (!ready.value || busy.value || !canvas || event.defaultPrevented || event.isComposing) return;
  const key = event.key.toLowerCase();
  const shortcut = event.metaKey || event.ctrlKey;
  if (shortcut && !event.altKey && key === 's') {
    event.preventDefault();
    void save();
    return;
  }
  const object = canvas.getActiveObject();
  if ((object instanceof IText && object.isEditing) ||
      (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable]'))) return;

  if (shortcut && !event.altKey && (key === 'z' || key === 'y')) {
    event.preventDefault();
    void moveHistory(key === 'y' || event.shiftKey ? 1 : -1);
    return;
  }
  if (shortcut || event.altKey) return;
  if (event.code === 'Space') {
    event.preventDefault();
    if (!drawing) {
      spaceHeld = true;
      updatePointerMode();
    }
    return;
  }
  if (key === '+' || key === '=') setZoom(zoom.value * 1.25);
  else if (key === '-' || key === '_') setZoom(zoom.value / 1.25);
  else if (key === '0') fitImage();
  else if (key === 'delete' || key === 'backspace') deleteSelection();
  else if (key === 'escape') {
    if (drawing?.object) canvas.remove(drawing.object);
    drawing = undefined;
    showCrop();
    setTool('select');
  }
  else {
    const tool = tools.find((item) => item.key.toLowerCase() === key);
    if (!tool || drawing) return;
    setTool(tool.id);
  }
  event.preventDefault();
}

onMounted(async () => {
  document.title = t('editorTitle');
  document.documentElement.lang = chrome.i18n.getUILanguage();
  const id = new URLSearchParams(location.search).get('id');
  if (id) resultUrl.value = chrome.runtime.getURL('result.html') + '?' + new URLSearchParams({ id });
  try {
    capture = id ? await readResult(id) : undefined;
    if (!capture || !stage.value || !surface.value) throw new Error('Missing screenshot');
    source = new Image();
    sourceUrl = URL.createObjectURL(capture.image);
    source.src = sourceUrl;
    await source.decode();
    imageSize.value = `${source.naturalWidth} × ${source.naturalHeight} px`;
    canvas = new Canvas(surface.value, { preserveObjectStacking: true, selection: false, selectionKey: null });
    const editor = canvas;
    background = new FabricImage(source, { selectable: false, evented: false, objectCaching: false });
    initialDocument = capture.editorDocument ?? { objects: [] };
    history.value = [initialDocument];
    editor.add(background, ...await restoreObjects(initialDocument));
    const resize = () => {
      if (!stage.value) return;
      editor.setDimensions({ width: stage.value.clientWidth, height: stage.value.clientHeight });
      fitImage();
    };
    resize();
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(stage.value);
    showCrop();
    editor.on('object:modified', () => commit());
    editor.on('text:editing:exited', ({ target }) => {
      if (!target.text.trim()) editor.remove(target);
      commit();
    });
    const syncSelection = () => {
      const selected = editor.getActiveObject();
      hasSelection.value = !!selected;
      selectedTextSize.value = selected instanceof IText ? selected.fontSize : null;
    };
    editor.on('selection:created', syncSelection);
    editor.on('selection:updated', syncSelection);
    editor.on('selection:cleared', syncSelection);
    editor.on('mouse:down', ({ e, scenePoint, viewportPoint }) => {
      if (busy.value || ('button' in e && e.button !== 0)) return;
      if (spaceHeld || activeTool.value === 'pan') {
        panPoint = viewportPoint;
        return;
      }
      if (activeTool.value === 'select' || !scenePoint.eq(clampPoint(scenePoint))) return;
      if (activeTool.value === 'text') {
        const text = new IText('', { left: scenePoint.x, top: scenePoint.y, fill: color.value, fontSize: fontSize.value, fontFamily: 'sans-serif' });
        setTool('select');
        editor.add(text);
        editor.setActiveObject(text);
        text.enterEditing();
        text.hiddenTextarea?.focus();
        return;
      }
      if (activeTool.value === 'number') {
        addNumber(scenePoint);
        return;
      }
      drawing = { start: scenePoint, points: [scenePoint] };
    });
    editor.on('mouse:move', ({ scenePoint, viewportPoint }) => {
      if (panPoint) {
        editor.relativePan(viewportPoint.subtract(panPoint));
        panPoint = viewportPoint;
      }
      if (!drawing) return;
      const end = clampPoint(scenePoint);
      if (activeTool.value === 'crop') {
        showCrop(bounds(drawing.start, end));
      } else {
        if (isFreehand() && drawing.points[drawing.points.length - 1].distanceFrom(end) >= 1) {
          drawing.points.push(end);
        }
        if (drawing.object) editor.remove(drawing.object);
        drawing.object = makeShape(drawing.start, end, drawing.points);
        drawing.object.set({ selectable: false, evented: false });
        editor.add(drawing.object);
      }
    });
    editor.on('mouse:up', ({ scenePoint }) => {
      panPoint = undefined;
      if (!drawing) return;
      const { start, object, points } = drawing;
      drawing = undefined;
      const end = clampPoint(scenePoint);
      if (activeTool.value === 'crop') {
        const crop = bounds(start, end);
        if (crop.width >= 4 && crop.height >= 4) commit(crop);
      } else if (object) {
        editor.remove(object);
        const area = bounds(start, end);
        const valid = activeTool.value === 'redact' || activeTool.value === 'rectangle'
          ? area.width >= 2 && area.height >= 2
          : isFreehand() ? points.length > 1 : start.distanceFrom(end) >= 3;
        if (valid) editor.add(makeShape(start, end, points));
        commit();
      }
      showCrop();
    });
    editor.on('mouse:wheel', ({ e, viewportPoint }) => {
      e.preventDefault();
      setZoom(zoom.value * Math.exp(-e.deltaY * 0.002), viewportPoint);
    });
    window.addEventListener('keydown', handleKeys);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', releaseSpace);
    ready.value = true;
  } catch {
    status.value = t('editorLoadFailed');
  }
});

onUnmounted(() => {
  resizeObserver?.disconnect();
  window.removeEventListener('keydown', handleKeys);
  window.removeEventListener('keyup', handleKeyUp);
  window.removeEventListener('blur', releaseSpace);
  void canvas?.dispose();
  if (sourceUrl) URL.revokeObjectURL(sourceUrl);
});
</script>

<template>
  <div class="editor">
    <header>
      <div class="heading">
        <h1>{{ t('editorTitle') }}</h1>
        <span v-if="imageSize">{{ imageSize }}</span>
      </div>
      <div class="actions">
        <button v-if="resultUrl" type="button" :disabled="busy" @click="returnToResult">{{ t('editorBack') }}</button>
        <button class="primary" type="button" :disabled="!ready || busy" @click="save"><Check />{{ t('editorSave') }}</button>
      </div>
    </header>
    <nav v-if="ready" :aria-label="t('editorTools')">
      <button v-for="tool in tools" :key="tool.id" type="button" :aria-pressed="activeTool === tool.id"
        :disabled="busy" :title="`${t(tool.label)} (${tool.key})`" :aria-keyshortcuts="tool.key" @click="setTool(tool.id)"><component :is="tool.icon" />{{ t(tool.label) }}</button>
      <span class="divider"></span>
      <label>{{ t('editorColor') }} <input type="color" :value="toolColor" :disabled="busy || activeTool === 'redact'" @change="changeColor"></label>
      <label>{{ t('editorStroke') }} <select :value="strokeWidth" :disabled="busy" @change="changeStrokeWidth">
        <option v-for="size in [2, 4, 8, 12]" :key="size" :value="size">{{ size }} px</option>
      </select></label>
      <label v-if="activeTool === 'text' || selectedTextSize !== null">
        {{ t('editorFontSize') }}
        <input type="number" :min="MIN_FONT_SIZE" step="1" :value="selectedTextSize ?? fontSize"
          :disabled="busy" @change="changeFontSize">
        <span>px</span>
      </label>
      <button type="button" :disabled="busy || !hasSelection" @click="deleteSelection">{{ t('editorDelete') }}</button>
      <span class="divider"></span>
      <button type="button" :disabled="busy || historyIndex === 0" @click="moveHistory(-1)"><Undo2 />{{ t('editorUndo') }}</button>
      <button type="button" :disabled="busy || historyIndex >= history.length - 1" @click="moveHistory(1)"><Redo2 />{{ t('editorRedo') }}</button>
    </nav>
    <p v-if="status" class="status" role="alert">{{ status }}</p>
    <main ref="stage" :inert="busy"><canvas ref="surface"></canvas></main>
    <footer v-if="ready">
      <span class="shortcut-hint">{{ t('editorNavigationShortcuts') }}</span>
      <span v-if="documentState?.crop">{{ t('editorCrop') }} {{ documentState.crop.width }} × {{ documentState.crop.height }} px</span>
      <div class="zoom">
        <button type="button" :aria-label="t('resultZoomOut')" @click="setZoom(zoom / 1.25)">−</button>
        <output>{{ Math.round(zoom * 100) }}%</output>
        <button type="button" :aria-label="t('resultZoomIn')" @click="setZoom(zoom * 1.25)">+</button>
        <button type="button" @click="fitImage">{{ t('editorFit') }}</button>
      </div>
    </footer>
  </div>
</template>

<style>
:root { font: 14px system-ui, sans-serif; color: #172033; background: #edf1f4; }
body { margin: 0; }
.editor { display: grid; grid-template-rows: auto auto auto minmax(0, 1fr) auto; height: 100dvh; }
header, nav, footer { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; padding: 10px 16px; background: #fff; border-bottom: 1px solid #d5dee7; }
header { grid-row: 1; justify-content: space-between; }
.heading, .actions, .zoom, label { display: flex; align-items: center; gap: 8px; }
h1 { font-size: 18px; margin: 0; }
.heading span, footer { color: #46566a; }
button, select { display: inline-flex; align-items: center; gap: 6px; padding: 6px 9px; border: 1px solid #c7d3de; border-radius: 5px; background: #fff; color: inherit; font: inherit; }
button { cursor: pointer; }
button:disabled { opacity: .45; cursor: default; }
button:focus-visible, input:focus-visible, select:focus-visible { outline: 2px solid #087580; outline-offset: 2px; }
button[aria-pressed="true"] { background: #e5f6f7; border-color: #087580; }
button.primary { background: #086b76; color: white; border-color: #086b76; }
button svg { width: 16px; height: 16px; }
nav { grid-row: 2; }
.divider { width: 1px; height: 22px; background: #d5dee7; }
input[type="number"] { box-sizing: border-box; width: 66px; padding: 5px 6px; border: 1px solid #c7d3de; border-radius: 5px; color: inherit; font: inherit; }
input[type="color"] { width: 30px; height: 28px; padding: 1px; }
.status { grid-row: 3; margin: 0; padding: 8px 16px; background: #fff2d6; }
main { grid-row: 4; min-width: 0; overflow: hidden; background-color: #e9eef2; background-image: radial-gradient(#b8c5d1 1px, transparent 1px); background-size: 16px 16px; }
footer { grid-row: 5; justify-content: space-between; border-bottom: 0; border-top: 1px solid #d5dee7; }
.zoom { margin-left: auto; }
output { min-width: 4ch; text-align: center; font-variant-numeric: tabular-nums; }
</style>
