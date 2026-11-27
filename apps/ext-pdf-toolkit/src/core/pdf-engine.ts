import * as pdfjsLib from 'pdfjs-dist';
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker';
import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib';
import JSZip from 'jszip';

pdfjsLib.GlobalWorkerOptions.workerPort = new PdfWorker();

export interface PdfPageItem {
  uid: string;
  sourceId: string;
  fileName: string;
  pageIndex: number; // 0-based index in source PDF
  rotation: number; // 0 | 90 | 180 | 270
  selected: boolean;
  thumbnailUrl: string;
  width: number;
  height: number;
}

export interface WatermarkConfig {
  mode: 'text' | 'image';
  text?: string;
  color?: string;
  fontSize?: number;
  opacity: number; // 0.1 .. 1
  angle?: number; // degrees
  position: 'center' | 'bottom-right' | 'top-left' | 'tile';
  imageBytes?: Uint8Array;
  imageMime?: string;
  imageScale?: number; // 0.1 .. 0.6 relative to page width
}

export interface ImageInputItem {
  id: string;
  name: string;
  bytes: Uint8Array;
  mime: string;
  previewUrl: string;
}

let uidCounter = 1;

export async function loadPdfFile(
  fileName: string,
  bytes: Uint8Array
): Promise<{ sourceId: string; bytes: Uint8Array; pages: PdfPageItem[] }> {
  const sourceId = `src_${Date.now()}_${uidCounter++}`;
  // pdfjs 可能转移 ArrayBuffer，传入拷贝保留原始 bytes 供 pdf-lib 使用
  const loadingTask = pdfjsLib.getDocument({ data: bytes.slice() });
  const pdf = await loadingTask.promise;
  const pages: PdfPageItem[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 0.36 });
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    const ctx = canvas.getContext('2d');
    if (ctx) {
      await page.render({ canvasContext: ctx, viewport }).promise;
    }
    const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.82);
    pages.push({
      uid: `pg_${sourceId}_${i}_${uidCounter++}`,
      sourceId,
      fileName,
      pageIndex: i - 1,
      rotation: 0,
      selected: true,
      thumbnailUrl,
      width: viewport.width,
      height: viewport.height
    });
  }

  return { sourceId, bytes, pages };
}

function renderTextWatermarkToPng(
  text: string,
  color: string,
  fontSize: number,
  opacity: number,
  angleDeg: number
): Uint8Array {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return new Uint8Array();

  const scale = 2;
  const font = `600 ${fontSize * scale}px "Microsoft YaHei", "PingFang SC", sans-serif`;
  ctx.font = font;
  const metrics = ctx.measureText(text);
  const textW = Math.ceil(metrics.width) + 32;
  const textH = Math.ceil(fontSize * scale * 1.6) + 24;

  const rad = (angleDeg * Math.PI) / 180;
  const boundW = Math.ceil(Math.abs(textW * Math.cos(rad)) + Math.abs(textH * Math.sin(rad))) + 16;
  const boundH = Math.ceil(Math.abs(textW * Math.sin(rad)) + Math.abs(textH * Math.cos(rad))) + 16;

  canvas.width = Math.max(16, boundW);
  canvas.height = Math.max(16, boundH);

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(rad);
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.globalAlpha = opacity;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, 0);

  const dataUrl = canvas.toDataURL('image/png');
  const bin = atob(dataUrl.split(',')[1]);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function applyWatermarkToDoc(doc: PDFDocument, wm: WatermarkConfig) {
  let embeddedImg: Awaited<ReturnType<PDFDocument['embedPng']>> | null = null;
  let drawW = 160;
  let drawH = 60;

  if (wm.mode === 'text' && wm.text?.trim()) {
    const pngBytes = renderTextWatermarkToPng(
      wm.text.trim(),
      wm.color || '#dc2626',
      wm.fontSize || 28,
      wm.opacity,
      wm.angle ?? -30
    );
    if (pngBytes.length > 0) {
      embeddedImg = await doc.embedPng(pngBytes);
      drawW = embeddedImg.width / 2;
      drawH = embeddedImg.height / 2;
    }
  } else if (wm.mode === 'image' && wm.imageBytes?.length) {
    embeddedImg =
      wm.imageMime === 'image/jpeg'
        ? await doc.embedJpg(wm.imageBytes)
        : await doc.embedPng(wm.imageBytes);
  }

  if (!embeddedImg) return;

  for (const page of doc.getPages()) {
    const { width, height } = page.getSize();
    if (wm.mode === 'image') {
      const targetW = width * (wm.imageScale || 0.24);
      const ratio = embeddedImg.height / embeddedImg.width;
      drawW = targetW;
      drawH = targetW * ratio;
    }

    const opacity = wm.mode === 'image' ? wm.opacity : 1; // 文字透明度已在 canvas 绘制时处理

    if (wm.position === 'tile') {
      const stepX = Math.max(drawW + 60, width / 3);
      const stepY = Math.max(drawH + 60, height / 4);
      for (let x = 20; x < width; x += stepX) {
        for (let y = 20; y < height; y += stepY) {
          page.drawImage(embeddedImg, { x, y, width: drawW, height: drawH, opacity });
        }
      }
    } else if (wm.position === 'bottom-right') {
      page.drawImage(embeddedImg, {
        x: Math.max(16, width - drawW - 28),
        y: 28,
        width: drawW,
        height: drawH,
        opacity
      });
    } else if (wm.position === 'top-left') {
      page.drawImage(embeddedImg, {
        x: 28,
        y: Math.max(16, height - drawH - 28),
        width: drawW,
        height: drawH,
        opacity
      });
    } else {
      page.drawImage(embeddedImg, {
        x: (width - drawW) / 2,
        y: (height - drawH) / 2,
        width: drawW,
        height: drawH,
        opacity
      });
    }
  }
}

export interface ExportPdfOptions {
  watermark?: WatermarkConfig;
  annotations?: PageAnnotation[];
  stripMetadata?: boolean;
  addPageNumbers?: boolean;
}

export type PageAnnotation =
  | {
      id: string;
      pageUid: string;
      type: 'text';
      xRatio: number;
      yRatio: number;
      text: string;
      color: string;
      fontSize: number;
    }
  | {
      id: string;
      pageUid: string;
      type: 'redact';
      xRatio: number;
      yRatio: number;
      wRatio: number;
      hRatio: number;
      color: '#000000' | '#ffffff';
    }
  | {
      id: string;
      pageUid: string;
      type: 'stamp';
      xRatio: number;
      yRatio: number;
      wRatio: number;
      hRatio: number;
      previewUrl: string;
      imageBytes: Uint8Array;
      imageMime: string;
    }
  | {
      id: string;
      pageUid: string;
      type: 'highlight';
      xRatio: number;
      yRatio: number;
      wRatio: number;
      hRatio: number;
      color: string;
    }
  | {
      id: string;
      pageUid: string;
      type: 'ink';
      xRatio: number;
      yRatio: number;
      points: Array<{ x: number; y: number }>;
      color: string;
      strokeWidth: number;
    };

function hexToRgbTuple(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return [0.98, 0.8, 0.08];
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  return [r, g, b];
}

function renderAnnotationTextToPng(text: string, color: string, fontSize: number): { bytes: Uint8Array; width: number; height: number } {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return { bytes: new Uint8Array(), width: 100, height: 24 };
  const scale = 2;
  const font = `600 ${fontSize * scale}px "Microsoft YaHei", "PingFang SC", sans-serif`;
  ctx.font = font;
  const metrics = ctx.measureText(text);
  const w = Math.max(16, Math.ceil(metrics.width) + 12);
  const h = Math.max(16, Math.ceil(fontSize * scale * 1.45));
  canvas.width = w;
  canvas.height = h;
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textBaseline = 'top';
  ctx.fillText(text, 4, 4);
  const dataUrl = canvas.toDataURL('image/png');
  const bin = atob(dataUrl.split(',')[1]);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return { bytes: out, width: w / scale, height: h / scale };
}

export async function exportMergedPdf(
  sources: Map<string, Uint8Array>,
  pages: PdfPageItem[],
  options?: ExportPdfOptions
): Promise<Uint8Array> {
  const outDoc = await PDFDocument.create();
  const loadedDocs = new Map<string, PDFDocument>();
  const annsByPage = new Map<string, PageAnnotation[]>();
  for (const ann of options?.annotations || []) {
    const list = annsByPage.get(ann.pageUid) || [];
    list.push(ann);
    annsByPage.set(ann.pageUid, list);
  }

  for (const item of pages) {
    let srcDoc = loadedDocs.get(item.sourceId);
    if (!srcDoc) {
      const raw = sources.get(item.sourceId);
      if (!raw) continue;
      srcDoc = await PDFDocument.load(raw, { ignoreEncryption: true });
      loadedDocs.set(item.sourceId, srcDoc);
    }
    const [copied] = await outDoc.copyPages(srcDoc, [item.pageIndex]);
    if (item.rotation !== 0) {
      const prevAngle = copied.getRotation().angle;
      copied.setRotation(degrees((prevAngle + item.rotation) % 360));
    }
    outDoc.addPage(copied);

    const pageAnns = annsByPage.get(item.uid);
    if (pageAnns?.length) {
      const { width, height } = copied.getSize();
      for (const ann of pageAnns) {
        if (ann.type === 'redact') {
          const isWhite = ann.color === '#ffffff';
          copied.drawRectangle({
            x: ann.xRatio * width,
            y: height - (ann.yRatio + ann.hRatio) * height,
            width: ann.wRatio * width,
            height: ann.hRatio * height,
            color: isWhite ? rgb(1, 1, 1) : rgb(0, 0, 0)
          });
        } else if (ann.type === 'stamp') {
          const img =
            ann.imageMime === 'image/jpeg'
              ? await outDoc.embedJpg(ann.imageBytes)
              : await outDoc.embedPng(ann.imageBytes);
          copied.drawImage(img, {
            x: ann.xRatio * width,
            y: height - (ann.yRatio + ann.hRatio) * height,
            width: ann.wRatio * width,
            height: ann.hRatio * height
          });
        } else if (ann.type === 'highlight') {
          const [r, g, b] = hexToRgbTuple(ann.color);
          copied.drawRectangle({
            x: ann.xRatio * width,
            y: height - (ann.yRatio + ann.hRatio) * height,
            width: ann.wRatio * width,
            height: ann.hRatio * height,
            color: rgb(r, g, b),
            opacity: 0.38
          });
        } else if (ann.type === 'ink' && ann.points.length > 1) {
          const [r, g, b] = hexToRgbTuple(ann.color);
          for (let k = 1; k < ann.points.length; k++) {
            const p1 = ann.points[k - 1];
            const p2 = ann.points[k];
            copied.drawLine({
              start: { x: p1.x * width, y: height - p1.y * height },
              end: { x: p2.x * width, y: height - p2.y * height },
              thickness: ann.strokeWidth,
              color: rgb(r, g, b),
              opacity: 0.9
            });
          }
        } else if (ann.type === 'text' && ann.text.trim()) {
          const rendered = renderAnnotationTextToPng(ann.text, ann.color, ann.fontSize);
          if (rendered.bytes.length > 0) {
            const img = await outDoc.embedPng(rendered.bytes);
            copied.drawImage(img, {
              x: ann.xRatio * width,
              y: Math.max(0, height - ann.yRatio * height - rendered.height),
              width: rendered.width,
              height: rendered.height
            });
          }
        }
      }
    }
  }

  if (options?.watermark) {
    await applyWatermarkToDoc(outDoc, options.watermark);
  }

  if (options?.addPageNumbers) {
    const font = await outDoc.embedFont(StandardFonts.Helvetica);
    const allPages = outDoc.getPages();
    const total = allPages.length;
    allPages.forEach((p, idx) => {
      const label = `${idx + 1} / ${total}`;
      const fontSize = 10;
      const textW = font.widthOfTextAtSize(label, fontSize);
      const { width } = p.getSize();
      p.drawText(label, {
        x: (width - textW) / 2,
        y: 16,
        size: fontSize,
        font,
        color: rgb(0.35, 0.38, 0.45)
      });
    });
  }

  if (options?.stripMetadata) {
    outDoc.setTitle('');
    outDoc.setAuthor('');
    outDoc.setSubject('');
    outDoc.setKeywords([]);
    outDoc.setCreator('');
    outDoc.setProducer('100-Free Local PDF Toolkit');
  }

  return outDoc.save();
}

export async function extractTextFromPages(
  sources: Map<string, Uint8Array>,
  pages: PdfPageItem[]
): Promise<string> {
  const loadedPdfJs = new Map<string, pdfjsLib.PDFDocumentProxy>();
  const blocks: string[] = [];

  for (let idx = 0; idx < pages.length; idx++) {
    const item = pages[idx];
    let doc = loadedPdfJs.get(item.sourceId);
    if (!doc) {
      const raw = sources.get(item.sourceId);
      if (!raw) continue;
      doc = await pdfjsLib.getDocument({ data: raw.slice() }).promise;
      loadedPdfJs.set(item.sourceId, doc);
    }
    const page = await doc.getPage(item.pageIndex + 1);
    const textContent = await page.getTextContent();
    const line = textContent.items
      .map((it) => ('str' in it ? it.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    blocks.push(`--- 第 ${idx + 1} 页 (${item.fileName} P${item.pageIndex + 1}) ---\n${line || '(此页未检测到可选中文本，可能是纯扫描图片)'}`);
  }

  return blocks.join('\n\n');
}

export async function exportPagesAsLongImage(
  sources: Map<string, Uint8Array>,
  pages: PdfPageItem[],
  scale: number,
  format: 'png' | 'jpeg'
): Promise<Blob> {
  const loadedPdfJs = new Map<string, pdfjsLib.PDFDocumentProxy>();
  const rendered: HTMLCanvasElement[] = [];

  for (const item of pages) {
    let doc = loadedPdfJs.get(item.sourceId);
    if (!doc) {
      const raw = sources.get(item.sourceId);
      if (!raw) continue;
      doc = await pdfjsLib.getDocument({ data: raw.slice() }).promise;
      loadedPdfJs.set(item.sourceId, doc);
    }
    const page = await doc.getPage(item.pageIndex + 1);
    const viewport = page.getViewport({ scale, rotation: item.rotation });
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.floor(viewport.width));
    c.height = Math.max(1, Math.floor(viewport.height));
    const ctx = c.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, c.width, c.height);
      await page.render({ canvasContext: ctx, viewport }).promise;
    }
    rendered.push(c);
  }

  if (rendered.length === 0) throw new Error('没有可导出的页面');

  const gap = 16;
  const maxW = Math.max(...rendered.map((c) => c.width));
  const rawTotalH = rendered.reduce((sum, c) => sum + c.height, 0) + gap * Math.max(0, rendered.length - 1);
  // 防止超长画布突破浏览器上限（约 28000px）
  const shrink = rawTotalH > 26000 ? 26000 / rawTotalH : 1;

  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = Math.max(1, Math.floor(maxW * shrink));
  finalCanvas.height = Math.max(1, Math.floor(rawTotalH * shrink));
  const outCtx = finalCanvas.getContext('2d');
  if (!outCtx) throw new Error('Canvas 初始化失败');

  outCtx.fillStyle = '#e2e8f0';
  outCtx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

  let y = 0;
  for (const c of rendered) {
    const drawW = Math.floor(c.width * shrink);
    const drawH = Math.floor(c.height * shrink);
    const x = Math.floor((finalCanvas.width - drawW) / 2);
    outCtx.drawImage(c, x, y, drawW, drawH);
    y += drawH + Math.floor(gap * shrink);
  }

  const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
  const blob = await new Promise<Blob | null>((resolve) =>
    finalCanvas.toBlob(resolve, mime, format === 'jpeg' ? 0.9 : undefined)
  );
  if (!blob) throw new Error('生成长图失败');
  return blob;
}

export async function compressPdfPages(
  sources: Map<string, Uint8Array>,
  pages: PdfPageItem[],
  level: 'low' | 'medium' | 'high',
  whiten = false
): Promise<Uint8Array> {
  const presets = {
    low: { scale: 1.0, quality: 0.52 },
    medium: { scale: 1.35, quality: 0.72 },
    high: { scale: 1.75, quality: 0.85 }
  } as const;
  const { scale, quality } = presets[level];

  const loadedPdfJs = new Map<string, pdfjsLib.PDFDocumentProxy>();
  const outDoc = await PDFDocument.create();

  for (const item of pages) {
    let doc = loadedPdfJs.get(item.sourceId);
    if (!doc) {
      const raw = sources.get(item.sourceId);
      if (!raw) continue;
      doc = await pdfjsLib.getDocument({ data: raw.slice() }).promise;
      loadedPdfJs.set(item.sourceId, doc);
    }
    const page = await doc.getPage(item.pageIndex + 1);
    const origViewport = page.getViewport({ scale: 1, rotation: item.rotation });
    const renderViewport = page.getViewport({ scale, rotation: item.rotation });

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(renderViewport.width));
    canvas.height = Math.max(1, Math.floor(renderViewport.height));
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport: renderViewport }).promise;

      if (whiten) {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imgData.data;
        for (let i = 0; i < d.length; i += 4) {
          const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          if (lum > 175) {
            // 将灰暗纸张底色漂白为纯白
            d[i] = 255;
            d[i + 1] = 255;
            d[i + 2] = 255;
          } else {
            // 轻微加深深色文字对比度
            d[i] = Math.max(0, Math.floor(d[i] * 0.75));
            d[i + 1] = Math.max(0, Math.floor(d[i + 1] * 0.75));
            d[i + 2] = Math.max(0, Math.floor(d[i + 2] * 0.75));
          }
        }
        ctx.putImageData(imgData, 0, 0);
      }
    }

    const jpgBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!jpgBlob) continue;
    const jpgBytes = new Uint8Array(await jpgBlob.arrayBuffer());
    const embedded = await outDoc.embedJpg(jpgBytes);
    const outPage = outDoc.addPage([origViewport.width, origViewport.height]);
    outPage.drawImage(embedded, {
      x: 0,
      y: 0,
      width: origViewport.width,
      height: origViewport.height
    });
  }

  outDoc.setProducer('100-Free Local PDF Toolkit');
  return outDoc.save();
}

export async function exportNUpPdf(
  sources: Map<string, Uint8Array>,
  pages: PdfPageItem[],
  layout: '2up' | '4up',
  drawCutLines = true
): Promise<Uint8Array> {
  const outDoc = await PDFDocument.create();
  const loadedDocs = new Map<string, PDFDocument>();
  const A4_W = 595.28;
  const A4_H = 841.89;
  const MARGIN = 20;
  const GAP = 14;

  const perSheet = layout === '2up' ? 2 : 4;
  const cols = layout === '2up' ? 1 : 2;
  const rows = 2;
  const cellW = (A4_W - MARGIN * 2 - GAP * (cols - 1)) / cols;
  const cellH = (A4_H - MARGIN * 2 - GAP * (rows - 1)) / rows;

  for (let i = 0; i < pages.length; i += perSheet) {
    const sheet = outDoc.addPage([A4_W, A4_H]);
    const chunk = pages.slice(i, i + perSheet);

    for (let slot = 0; slot < chunk.length; slot++) {
      const item = chunk[slot];
      let srcDoc = loadedDocs.get(item.sourceId);
      if (!srcDoc) {
        const raw = sources.get(item.sourceId);
        if (!raw) continue;
        srcDoc = await PDFDocument.load(raw, { ignoreEncryption: true });
        loadedDocs.set(item.sourceId, srcDoc);
      }
      const srcPage = srcDoc.getPage(item.pageIndex);
      const embedded = await outDoc.embedPage(srcPage);

      const col = slot % cols;
      const row = Math.floor(slot / cols);
      const cellX = MARGIN + col * (cellW + GAP);
      const cellY = A4_H - MARGIN - (row + 1) * cellH - row * GAP;

      const scale = Math.min(cellW / embedded.width, cellH / embedded.height);
      const drawW = embedded.width * scale;
      const drawH = embedded.height * scale;
      const drawX = cellX + (cellW - drawW) / 2;
      const drawY = cellY + (cellH - drawH) / 2;

      sheet.drawPage(embedded, { x: drawX, y: drawY, width: drawW, height: drawH });

      if (drawCutLines) {
        sheet.drawRectangle({
          x: cellX,
          y: cellY,
          width: cellW,
          height: cellH,
          borderColor: rgb(0.75, 0.78, 0.82),
          borderWidth: 0.8,
          borderDashArray: [4, 4]
        });
      }
    }
  }

  outDoc.setProducer('100-Free Local PDF Toolkit');
  return outDoc.save();
}

export async function comparePdfPages(
  bytesA: Uint8Array,
  bytesB: Uint8Array,
  pageNumber1Based: number
): Promise<{
  diffDataUrl: string;
  totalPagesA: number;
  totalPagesB: number;
  diffPercent: number;
}> {
  const [docA, docB] = await Promise.all([
    pdfjsLib.getDocument({ data: bytesA.slice() }).promise,
    pdfjsLib.getDocument({ data: bytesB.slice() }).promise
  ]);

  const renderNorm = async (doc: pdfjsLib.PDFDocumentProxy, num: number) => {
    const safeNum = Math.min(Math.max(1, num), doc.numPages);
    const page = await doc.getPage(safeNum);
    const baseVp = page.getViewport({ scale: 1 });
    const targetScale = 900 / Math.max(1, baseVp.width);
    const vp = page.getViewport({ scale: targetScale });
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.floor(vp.width));
    c.height = Math.max(1, Math.floor(vp.height));
    const ctx = c.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, c.width, c.height);
      await page.render({ canvasContext: ctx, viewport: vp }).promise;
    }
    return c;
  };

  const [cA, cB] = await Promise.all([
    renderNorm(docA, pageNumber1Based),
    renderNorm(docB, pageNumber1Based)
  ]);

  const w = Math.max(cA.width, cB.width);
  const h = Math.max(cA.height, cB.height);
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const outCtx = out.getContext('2d');
  if (!outCtx) throw new Error('Canvas 初始化失败');

  const getData = (src: HTMLCanvasElement) => {
    const tmp = document.createElement('canvas');
    tmp.width = w;
    tmp.height = h;
    const tCtx = tmp.getContext('2d')!;
    tCtx.fillStyle = '#ffffff';
    tCtx.fillRect(0, 0, w, h);
    tCtx.drawImage(src, 0, 0);
    return tCtx.getImageData(0, 0, w, h);
  };

  const dA = getData(cA).data;
  const dB = getData(cB).data;
  const resImg = outCtx.createImageData(w, h);
  const res = resImg.data;
  let diffPixels = 0;

  for (let i = 0; i < res.length; i += 4) {
    const dr = Math.abs(dA[i] - dB[i]);
    const dg = Math.abs(dA[i + 1] - dB[i + 1]);
    const db = Math.abs(dA[i + 2] - dB[i + 2]);
    if (dr + dg + db > 45) {
      diffPixels++;
      // 差异处高亮标红
      res[i] = 220;
      res[i + 1] = 38;
      res[i + 2] = 38;
      res[i + 3] = 255;
    } else {
      // 原内容淡化保留作背景参考
      res[i] = Math.min(255, Math.floor(dB[i] * 0.35 + 255 * 0.65));
      res[i + 1] = Math.min(255, Math.floor(dB[i + 1] * 0.35 + 255 * 0.65));
      res[i + 2] = Math.min(255, Math.floor(dB[i + 2] * 0.35 + 255 * 0.65));
      res[i + 3] = 255;
    }
  }

  outCtx.putImageData(resImg, 0, 0);
  const diffPercent = Number(((diffPixels / (w * h)) * 100).toFixed(2));
  return {
    diffDataUrl: out.toDataURL('image/png'),
    totalPagesA: docA.numPages,
    totalPagesB: docB.numPages,
    diffPercent
  };
}

export async function exportSplitZip(
  sources: Map<string, Uint8Array>,
  pages: PdfPageItem[]
): Promise<Blob> {
  const zip = new JSZip();
  const loadedDocs = new Map<string, PDFDocument>();

  for (let idx = 0; idx < pages.length; idx++) {
    const item = pages[idx];
    let srcDoc = loadedDocs.get(item.sourceId);
    if (!srcDoc) {
      const raw = sources.get(item.sourceId);
      if (!raw) continue;
      srcDoc = await PDFDocument.load(raw, { ignoreEncryption: true });
      loadedDocs.set(item.sourceId, srcDoc);
    }
    const singleDoc = await PDFDocument.create();
    const [copied] = await singleDoc.copyPages(srcDoc, [item.pageIndex]);
    if (item.rotation !== 0) {
      const prevAngle = copied.getRotation().angle;
      copied.setRotation(degrees((prevAngle + item.rotation) % 360));
    }
    singleDoc.addPage(copied);
    const pdfBytes = await singleDoc.save();
    zip.file(`page-${String(idx + 1).padStart(3, '0')}.pdf`, pdfBytes);
  }

  return zip.generateAsync({ type: 'blob' });
}

export async function exportPagesAsImagesZip(
  sources: Map<string, Uint8Array>,
  pages: PdfPageItem[],
  scale: number,
  format: 'png' | 'jpeg'
): Promise<Blob> {
  const zip = new JSZip();
  const loadedPdfJs = new Map<string, pdfjsLib.PDFDocumentProxy>();

  for (let idx = 0; idx < pages.length; idx++) {
    const item = pages[idx];
    let doc = loadedPdfJs.get(item.sourceId);
    if (!doc) {
      const raw = sources.get(item.sourceId);
      if (!raw) continue;
      doc = await pdfjsLib.getDocument({ data: raw.slice() }).promise;
      loadedPdfJs.set(item.sourceId, doc);
    }
    const page = await doc.getPage(item.pageIndex + 1);
    const viewport = page.getViewport({ scale, rotation: item.rotation });
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    const ctx = canvas.getContext('2d');
    if (ctx) {
      if (format === 'jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      await page.render({ canvasContext: ctx, viewport }).promise;
    }

    const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, mime, format === 'jpeg' ? 0.92 : undefined)
    );
    if (blob) {
      zip.file(`page-${String(idx + 1).padStart(3, '0')}.${format === 'jpeg' ? 'jpg' : 'png'}`, blob);
    }
  }

  return zip.generateAsync({ type: 'blob' });
}

async function normalizeImageToPngOrJpg(
  bytes: Uint8Array,
  mime: string
): Promise<{ bytes: Uint8Array; kind: 'png' | 'jpg' }> {
  if (mime === 'image/png') return { bytes, kind: 'png' };
  if (mime === 'image/jpeg' || mime === 'image/jpg') return { bytes, kind: 'jpg' };

  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: mime || 'image/webp' });
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  ctx?.drawImage(bitmap, 0, 0);
  bitmap.close();

  const pngBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!pngBlob) throw new Error('Failed to convert image');
  const buf = await pngBlob.arrayBuffer();
  return { bytes: new Uint8Array(buf), kind: 'png' };
}

export async function convertImagesToPdf(
  images: ImageInputItem[],
  pageMode: 'a4' | 'fit'
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const A4_W = 595.28;
  const A4_H = 841.89;
  const MARGIN = 24;

  for (const item of images) {
    const normalized = await normalizeImageToPngOrJpg(item.bytes, item.mime);
    const img =
      normalized.kind === 'jpg'
        ? await doc.embedJpg(normalized.bytes)
        : await doc.embedPng(normalized.bytes);

    if (pageMode === 'fit') {
      const page = doc.addPage([img.width, img.height]);
      page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
    } else {
      const page = doc.addPage([A4_W, A4_H]);
      const maxW = A4_W - MARGIN * 2;
      const maxH = A4_H - MARGIN * 2;
      const scale = Math.min(maxW / img.width, maxH / img.height, 1);
      const w = img.width * scale;
      const h = img.height * scale;
      page.drawImage(img, {
        x: (A4_W - w) / 2,
        y: (A4_H - h) / 2,
        width: w,
        height: h
      });
    }
  }

  return doc.save();
}

export function triggerDownload(data: Uint8Array | Blob, fileName: string, mime = 'application/pdf') {
  const blob = data instanceof Blob ? data : new Blob([data.buffer as ArrayBuffer], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function renderSinglePagePreview(
  sources: Map<string, Uint8Array>,
  item: PdfPageItem,
  scale = 1.6
): Promise<string> {
  const raw = sources.get(item.sourceId);
  if (!raw) throw new Error('未找到原始 PDF 数据');
  const doc = await pdfjsLib.getDocument({ data: raw.slice() }).promise;
  const page = await doc.getPage(item.pageIndex + 1);
  const viewport = page.getViewport({ scale, rotation: item.rotation });
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;
  }
  return canvas.toDataURL('image/jpeg', 0.9);
}
