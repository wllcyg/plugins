<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from 'vue';
import { Copy, Download, Minus, Pencil, Plus, Printer } from 'lucide-vue-next';
import { t } from '../../src/utils/i18n';
import { readResult, type CaptureResult } from '../../src/utils/result-store';

const result = ref<CaptureResult>();
const imageUrl = ref('');
const editorUrl = ref('');
const image = ref<HTMLImageElement>();
const printSection = ref<HTMLElement>();
const printPages = ref<string[]>([]);
const ready = ref(false);
const busy = ref(false);
const status = ref('');
const imageWidth = ref(0);
const zoom = ref(100);
const MIN_ZOOM = 25;
const MAX_ZOOM = 400;

function adjustZoom(change: number) {
  zoom.value = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom.value + change));
}

function onImageLoad(event: Event) {
  imageWidth.value = (event.currentTarget as HTMLImageElement).naturalWidth;
  ready.value = true;
}

onMounted(async () => {
  document.title = t('resultTitle');
  document.documentElement.lang = chrome.i18n.getUILanguage();
  try {
    const id = new URLSearchParams(location.search).get('id');
    result.value = id ? await readResult(id) : undefined;
    if (!result.value) throw new Error();
    imageUrl.value = URL.createObjectURL(result.value.editedImage ?? result.value.image);
    editorUrl.value = chrome.runtime.getURL('editor.html') + '?' + new URLSearchParams({ id: result.value.id });
  } catch {
    status.value = t('resultUnavailable');
  }
});

onUnmounted(() => {
  if (imageUrl.value) URL.revokeObjectURL(imageUrl.value);
});

async function copyImage() {
  if (!result.value) return;
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': result.value.editedImage ?? result.value.image })]);
    status.value = t('resultCopied');
  } catch {
    status.value = t('resultCopyFailed');
  }
}

async function printImage() {
  const source = image.value;
  if (!source || busy.value) return;
  busy.value = true;
  status.value = '';
  try {
    const { naturalWidth: width, naturalHeight: height } = source;
    // Match the printable area of an A4 page, leaving a little room for rounding.
    const pageHeight = Math.max(1, Math.floor(width * 272 / 186));
    const pages: string[] = [];
    const canvas = document.createElement('canvas');
    canvas.width = width;
    for (let top = 0; top < height; top += pageHeight) {
      canvas.height = Math.min(pageHeight, height - top);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error();
      ctx.drawImage(source, 0, top, width, canvas.height, 0, 0, width, canvas.height);
      const png = canvas.toDataURL('image/png');
      if (png === 'data:,') throw new Error();
      pages.push(png);
    }
    printPages.value = pages;
    await nextTick();
    await Promise.all(Array.from(printSection.value!.querySelectorAll('img'), (page) => page.decode()));
    window.print();
  } catch {
    status.value = t('resultPrintFailed');
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <header>
    <h1>{{ t('resultTitle') }}</h1>
    <div v-if="ready && result" class="actions">
      <a class="edit" :href="editorUrl"><Pencil />{{ t('editorTitle') }}</a>
      <button type="button" @click="copyImage"><Copy />{{ t('selectedCaptureCopy') }}</button>
      <a :href="imageUrl" :download="result.filename"><Download />{{ t('selectedCaptureDownload') }}</a>
      <button type="button" :disabled="busy" @click="printImage"><Printer />{{ t('resultPrint') }}</button>
    </div>
  </header>
  <p v-if="status" role="status" class="status">{{ status }}</p>
  <main :style="{ '--image-width': imageWidth + 'px', '--zoom': zoom / 100 }">
    <img v-if="imageUrl" ref="image" :src="imageUrl" :alt="t('resultTitle')"
      @load="onImageLoad" @error="status = t('resultUnavailable')">
  </main>
  <div v-if="ready" class="zoom-controls" role="group" :aria-label="t('resultZoom')">
    <button type="button" :aria-label="t('resultZoomOut')" :disabled="zoom <= MIN_ZOOM" @click="adjustZoom(-25)">
      <Minus aria-hidden="true" />
    </button>
    <output aria-live="polite">{{ zoom }}%</output>
    <button type="button" :aria-label="t('resultZoomIn')" :disabled="zoom >= MAX_ZOOM" @click="adjustZoom(25)">
      <Plus aria-hidden="true" />
    </button>
  </div>
  <section ref="printSection" class="print-pages" aria-hidden="true">
    <img v-for="(page, index) in printPages" :key="index" :src="page" alt="">
  </section>
</template>

<style>
:root { color: #172033; background: #edf1f4; font: 15px system-ui, sans-serif; }
body { margin: 0; }
header { position: sticky; top: 0; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; padding: 14px clamp(14px, 4vw, 48px); background: #fff; border-bottom: 1px solid #d5dee7; }
h1 { margin: 0; font-size: 18px; font-weight: 650; }
.actions { display: flex; flex-wrap: wrap; gap: 8px; }
.actions button, .actions a { display: inline-flex; align-items: center; gap: 7px; padding: 8px 12px; border: 1px solid #c7d3de; border-radius: 6px; color: inherit; background: #fff; font: inherit; text-decoration: none; cursor: pointer; }
.actions a[download] { color: #fff; background: #086b76; border-color: #086b76; }
.actions svg { width: 16px; height: 16px; }
.actions button:focus-visible, .actions a:focus-visible { outline: 2px solid #087580; outline-offset: 2px; }
.actions button:disabled { opacity: .65; cursor: wait; }
.status { margin: 14px auto 0; text-align: center; }
main { container-type: inline-size; overflow: auto; padding: clamp(12px, 4vw, 48px); }
main img { display: block; width: calc(min(100cqw, var(--image-width)) * var(--zoom)); height: auto; margin: 0 auto; background: #fff; box-shadow: 0 2px 12px #17203320; }
.zoom-controls { position: fixed; z-index: 1; bottom: 16px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 6px; padding: 4px; border: 1px solid #c7d3de; border-radius: 8px; background: #fff; box-shadow: 0 2px 12px #17203320; }
.zoom-controls button { display: grid; place-items: center; width: 36px; height: 36px; border: 0; border-radius: 5px; background: #edf1f4; color: inherit; cursor: pointer; }
.zoom-controls button:focus-visible { outline: 2px solid #087580; }
.zoom-controls button:disabled { opacity: .45; cursor: default; }
.zoom-controls svg { width: 18px; height: 18px; }
.zoom-controls output { min-width: 4ch; text-align: center; font-variant-numeric: tabular-nums; }
.print-pages { display: none; }
@page { size: A4 portrait; margin: 12mm; }
@media print {
  :root { background: white; }
  header, .status, .zoom-controls, main:has(~ .print-pages img) { display: none; }
  main { container-type: normal; overflow: visible; padding: 0; }
  main img { width: auto; max-width: 100%; box-shadow: none; }
  .print-pages { display: block; }
  .print-pages img { display: block; width: 100%; height: auto; break-inside: avoid; }
  .print-pages img + img { break-before: page; }
}
</style>
