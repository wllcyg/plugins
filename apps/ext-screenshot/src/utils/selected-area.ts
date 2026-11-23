import { t } from './i18n';
import { openCaptureResult } from './open-result';

type Point = { x: number; y: number };
type Selection = { left: number; top: number; right: number; bottom: number };
type Action = 'preview' | 'download' | 'copy';

const clamp = (value: number, max: number) => Math.max(0, Math.min(max, value));

async function cropPng(dataUrl: string, rect: Selection, width: number, height: number): Promise<Blob> {
  const image = new Image();
  image.src = dataUrl;
  await image.decode();
  const scaleX = image.naturalWidth / width;
  const scaleY = image.naturalHeight / height;
  const x = Math.round(rect.left * scaleX);
  const y = Math.round(rect.top * scaleY);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(rect.right * scaleX) - x;
  canvas.height = Math.round(rect.bottom * scaleY) - y;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error(t('selectedCaptureFailed'));
  ctx.drawImage(image, x, y, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error(t('selectedCaptureFailed'));
  return blob;
}

export async function captureSelectedArea(capture: () => Promise<string>): Promise<void> {
  const host = document.createElement('div');
  host.style.cssText = 'all:initial!important;position:fixed!important;inset:0!important;z-index:2147483647!important';
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `
    <style>
      #layer { position:absolute; inset:0; overflow:hidden; cursor:crosshair; user-select:none; touch-action:none; font:13px system-ui,sans-serif; }
      #layer:not(.selected) { background:#17203366; }
      #frame { position:absolute; box-sizing:border-box; border:1px solid #5fdbdf; box-shadow:0 0 0 200vmax #17203366; cursor:move; }
      #frame[hidden], #actions[hidden], #hint[hidden] { display:none; }
      #hint, #size { position:absolute; background:#172033; color:white; border-radius:5px; padding:5px 9px; pointer-events:none; white-space:nowrap; }
      #hint { top:14px; left:50%; transform:translateX(-50%); }
      #size { left:0; bottom:calc(100% + 7px); font-variant-numeric:tabular-nums; }
      #frame.near-top #size { top:6px; bottom:auto; left:6px; }
      .handle { position:absolute; width:12px; height:12px; border:2px solid #fff; border-radius:50%; box-sizing:border-box; background:#087f8c; transform:translate(-50%,-50%); }
      #actions { position:absolute; display:flex; gap:2px; padding:3px; border-radius:7px; background:#172033; cursor:default; max-width:calc(100% - 8px); }
      button { border:0; border-radius:4px; padding:6px 9px; font:inherit; color:white; background:transparent; cursor:pointer; white-space:nowrap; }
      button:hover { background:#344357; }
      button:focus-visible { outline:2px solid #5fdbdf; outline-offset:-2px; }
      #preview { background:#087580; }
    </style>
    <div id="layer" tabindex="-1">
      <div id="hint"></div>
      <div id="frame" hidden><div id="size"></div></div>
      <div id="actions" hidden>
        <button id="preview" type="button"></button>
        <button id="download" type="button"></button>
        <button id="copy" type="button"></button>
        <button id="cancel" type="button"></button>
      </div>
    </div>`;
  const layer = shadow.querySelector<HTMLDivElement>('#layer')!;
  const frame = shadow.querySelector<HTMLDivElement>('#frame')!;
  const hint = shadow.querySelector<HTMLDivElement>('#hint')!;
  const size = shadow.querySelector<HTMLDivElement>('#size')!;
  const actions = shadow.querySelector<HTMLDivElement>('#actions')!;
  const preview = shadow.querySelector<HTMLButtonElement>('#preview')!;
  const download = shadow.querySelector<HTMLButtonElement>('#download')!;
  const copy = shadow.querySelector<HTMLButtonElement>('#copy')!;
  const cancel = shadow.querySelector<HTMLButtonElement>('#cancel')!;
  hint.textContent = t('selectedCaptureHint');
  preview.textContent = t('selectedCapturePreview');
  download.textContent = t('selectedCaptureDownload');
  copy.textContent = t('selectedCaptureCopy');
  cancel.textContent = t('selectedCaptureCancel');
  copy.hidden = !navigator.clipboard?.write || typeof ClipboardItem === 'undefined';

  for (const [direction, x, y] of [
    ['nw', 0, 0], ['n', 50, 0], ['ne', 100, 0], ['w', 0, 50],
    ['e', 100, 50], ['sw', 0, 100], ['s', 50, 100], ['se', 100, 100]
  ] as const) {
    const handle = document.createElement('span');
    handle.className = 'handle';
    handle.dataset.direction = direction;
    handle.style.cssText = `left:${x}%;top:${y}%;cursor:${direction}-resize`;
    frame.append(handle);
  }

  const width = innerWidth;
  const height = innerHeight;
  const previousFocus = document.activeElement;
  document.documentElement.append(host);
  layer.focus({ preventScroll: true });
  const events = new AbortController();
  const options = { signal: events.signal };
  let rect: Selection | undefined;
  let drag: { id: number; origin: Point; initial?: Selection; mode: string } | undefined;

  const render = () => {
    frame.hidden = !rect;
    hint.hidden = !!rect;
    actions.hidden = !rect || !!drag;
    layer.classList.toggle('selected', !!rect);
    if (!rect) return;
    const w = rect.right - rect.left;
    const h = rect.bottom - rect.top;
    frame.style.cssText = `left:${rect.left}px;top:${rect.top}px;width:${w}px;height:${h}px`;
    frame.classList.toggle('near-top', rect.top < 34);
    size.textContent = `${Math.round(w)} × ${Math.round(h)}`;
    if (!actions.hidden) {
      actions.style.left = `${Math.max(4, Math.min(width - actions.offsetWidth - 4, rect.right - actions.offsetWidth))}px`;
      const below = rect.bottom + 8;
      const above = rect.top - actions.offsetHeight - 8;
      const top = below + actions.offsetHeight <= height ? below : Math.max(4, above);
      actions.style.top = `${top}px`;
    }
  };

  try {
    await new Promise<void>((resolve, reject) => {
      const finish = (action?: Action) => {
        events.abort();
        host.remove();
        if (!action || !rect) {
          resolve();
          return;
        }
        const selection = rect;
        const png = capture().then((data) => cropPng(data, selection, width, height));
        if (action === 'copy') {
          navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]).then(resolve, () => {
            reject(new Error(t('selectedCopyFailed')));
          });
          return;
        }
        const filename = `Screenshot_Selected_${Date.now()}.png`;
        if (action === 'preview') {
          png.then((blob) => openCaptureResult(blob, filename)).then(resolve, reject);
          return;
        }
        png.then((blob) => {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          link.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }).then(resolve, reject);
      };

      layer.addEventListener('pointerdown', (event) => {
        if (drag || event.button !== 0 || event.composedPath().includes(actions)) return;
        const target = event.target as HTMLElement;
        const mode = target.dataset.direction ?? (target === frame ? 'move' : 'new');
        drag = { id: event.pointerId, origin: { x: event.clientX, y: event.clientY }, initial: rect, mode };
        layer.setPointerCapture(event.pointerId);
        event.preventDefault();
      }, options);

      layer.addEventListener('pointermove', (event) => {
        if (!drag || drag.id !== event.pointerId) return;
        const { origin, initial, mode } = drag;
        const x = clamp(event.clientX, width);
        const y = clamp(event.clientY, height);
        if (!initial || mode === 'new') {
          rect = { left: Math.min(x, origin.x), top: Math.min(y, origin.y), right: Math.max(x, origin.x), bottom: Math.max(y, origin.y) };
        } else if (mode === 'move') {
          const w = initial.right - initial.left;
          const h = initial.bottom - initial.top;
          const left = clamp(initial.left + x - origin.x, width - w);
          const top = clamp(initial.top + y - origin.y, height - h);
          rect = { left, top, right: left + w, bottom: top + h };
        } else {
          rect = {
            left: mode.includes('w') ? Math.min(x, initial.right - 4) : initial.left,
            top: mode.includes('n') ? Math.min(y, initial.bottom - 4) : initial.top,
            right: mode.includes('e') ? Math.max(x, initial.left + 4) : initial.right,
            bottom: mode.includes('s') ? Math.max(y, initial.top + 4) : initial.bottom
          };
        }
        render();
      }, options);

      const endDrag = (event: PointerEvent) => {
        if (!drag || drag.id !== event.pointerId) return;
        if (event.type === 'pointercancel' || !rect || rect.right - rect.left < 4 || rect.bottom - rect.top < 4) {
          rect = drag.initial;
        }
        drag = undefined;
        render();
      };
      layer.addEventListener('pointerup', endDrag, options);
      layer.addEventListener('pointercancel', endDrag, options);
      layer.addEventListener('wheel', (event) => event.preventDefault(), { ...options, passive: false });
      window.addEventListener('resize', () => finish(), options);
      window.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape' && event.key !== 'Enter') return;
        if (event.key === 'Enter' && actions.contains(shadow.activeElement)) return;
        if (event.key === 'Enter' && (!rect || drag)) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        finish(event.key === 'Enter' ? 'preview' : undefined);
      }, { ...options, capture: true });
      preview.addEventListener('click', () => finish('preview'), options);
      download.addEventListener('click', () => finish('download'), options);
      copy.addEventListener('click', () => finish('copy'), options);
      cancel.addEventListener('click', () => finish(), options);
    });
  } finally {
    events.abort();
    host.remove();
    if (previousFocus instanceof HTMLElement && document.activeElement === document.body) {
      previousFocus.focus({ preventScroll: true });
    }
  }
}
