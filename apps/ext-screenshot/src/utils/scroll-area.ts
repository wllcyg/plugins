import { t } from './i18n';

export function isScrollArea(node: unknown): node is HTMLElement {
  return (
    node instanceof HTMLElement &&
    node !== document.body &&
    node !== document.documentElement &&
    node.scrollHeight > node.clientHeight + 1 &&
    /^(auto|scroll|overlay)$/.test(getComputedStyle(node).overflowY)
  );
}

function findScrollArea(event: MouseEvent): HTMLElement | undefined {
  return event.composedPath().find(isScrollArea);
}

export function selectScrollArea(): Promise<HTMLElement | undefined> {
  return new Promise((resolve) => {
    const frame = document.createElement('div');
    frame.style.cssText = 'position:fixed;pointer-events:none;z-index:2147483647;outline:3px solid #0284c7;background:#0284c720;display:none';
    const hint = document.createElement('div');
    hint.style.cssText = 'position:fixed;pointer-events:none;z-index:2147483647;top:16px;left:50%;transform:translateX(-50%);background:#0f172a;color:white;padding:10px 16px;border-radius:8px;font:14px system-ui';
    hint.textContent = t('scrollAreaPick');
    document.body.append(frame, hint);

    const move = (event: MouseEvent) => {
      const rect = findScrollArea(event)?.getBoundingClientRect();
      frame.style.display = rect ? 'block' : 'none';
      if (rect) {
        frame.style.left = `${rect.left}px`;
        frame.style.top = `${rect.top}px`;
        frame.style.width = `${rect.width}px`;
        frame.style.height = `${rect.height}px`;
      }
    };

    const finish = (area?: HTMLElement) => {
      window.removeEventListener('mousemove', move, true);
      window.removeEventListener('click', click, true);
      window.removeEventListener('keydown', key, true);
      frame.remove();
      hint.remove();
      resolve(area);
    };
    const click = (event: MouseEvent) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const area = findScrollArea(event);
      if (area) finish(area);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      finish();
    };
    window.addEventListener('mousemove', move, true);
    window.addEventListener('click', click, true);
    window.addEventListener('keydown', key, true);
  });
}

function getCaptureRect(area: HTMLElement) {
  const bounds = area.getBoundingClientRect();
  const x = bounds.left + area.clientLeft;
  const y = bounds.top + area.clientTop;
  const { clientWidth: width, clientHeight: height } = area;
  if (!width || !height || x < 0 || y < 0 || x + width > innerWidth + 0.5 || y + height > innerHeight + 0.5) {
    throw new Error(t('scrollAreaFit'));
  }
  for (let parent = area.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
    const style = getComputedStyle(parent);
    const rect = parent.getBoundingClientRect();
    if ((style.overflowX !== 'visible' && (x < rect.left || x + width > rect.right + 0.5)) ||
        (style.overflowY !== 'visible' && (y < rect.top || y + height > rect.bottom + 0.5))) {
      throw new Error(t('scrollAreaFit'));
    }
  }
  return { x, y, width, height };
}

function findBottomOverlays(area: HTMLElement): HTMLElement[] {
  const { x, y, width, height } = getCaptureRect(area);
  const bottom = y + height;
  const candidates = Array.from(document.querySelectorAll<HTMLElement>('*')).flatMap((element) => {
    if (!(element instanceof HTMLElement) || element.contains(area)) return [];
    const style = getComputedStyle(element);
    if (style.position !== 'fixed' && style.position !== 'absolute' &&
        !(style.position === 'sticky' && style.bottom !== 'auto')) return [];

    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height || rect.height > height / 3 ||
        rect.bottom > bottom + 2 || rect.bottom < bottom - Math.min(64, height / 4) ||
        rect.right <= x || rect.left >= x + width) return [];
    return [{ element, rect }];
  });
  if (!candidates.length) return [];

  // A floating control stays in place while the scroll area's content moves underneath it.
  const initialTop = area.scrollTop;
  const maxTop = area.scrollHeight - height;
  area.scrollTop = maxTop - initialTop > 1 ? Math.min(initialTop + 80, maxTop) : Math.max(0, initialTop - 80);
  const moved = Math.abs(area.scrollTop - initialTop) > 1;
  const overlays = moved ? candidates.filter(({ element, rect }) => {
    const current = element.getBoundingClientRect();
    return Math.abs(current.top - rect.top) < 1 && Math.abs(current.left - rect.left) < 1;
  }) : [];
  area.scrollTop = initialTop;
  return overlays.map(({ element }) => element);
}

export async function captureScrollArea(
  area: HTMLElement,
  capture: () => Promise<string>,
  progress: (step: number, total: number) => void,
  fromCurrent = false
): Promise<Blob | undefined> {
  const originalTop = area.scrollTop;
  const originalLeft = area.scrollLeft;
  const savedStyles: (() => void)[] = [];
  const setStyle = (element: HTMLElement, property: string, value: string) => {
    const previous = element.style.getPropertyValue(property);
    const priority = element.style.getPropertyPriority(property);
    savedStyles.push(() => {
      if (previous) element.style.setProperty(property, previous, priority);
      else element.style.removeProperty(property);
    });
    element.style.setProperty(property, value, 'important');
  };
  const controller = new AbortController();
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') controller.abort();
  }, { capture: true, signal: controller.signal });

  try {
    getCaptureRect(area);
    // Rounded overflow clips the corners of each frame, leaving notches at the seams.
    setStyle(area, 'border-radius', '0');
    setStyle(area, 'scrollbar-width', 'none');
    setStyle(area, 'scroll-behavior', 'auto');
    setStyle(area, 'scroll-snap-type', 'none');
    setStyle(area, 'overflow-anchor', 'none');
    if (!fromCurrent) area.scrollTop = 0;
    for (const overlay of findBottomOverlays(area)) {
      setStyle(overlay, 'transition', 'none');
      setStyle(overlay, 'opacity', '0');
    }
    const height = area.scrollHeight;
    const { width, height: viewportHeight } = getCaptureRect(area);
    const start = fromCurrent ? Math.min(originalTop, height - viewportHeight) : 0;
    const total = Math.ceil((height - start) / viewportHeight);
    const sticky = Array.from(area.querySelectorAll<HTMLElement>('*')).filter(
      (element) => getComputedStyle(element).position === 'sticky'
    );
    if (start > 0) sticky.forEach((element) => setStyle(element, 'position', 'relative'));
    const canvas = document.createElement('canvas');
    let context: CanvasRenderingContext2D | null = null;
    let covered = start;

    for (let step = 0; step < total; step++) {
      area.scrollTop = Math.min(covered, height - viewportHeight);
      progress(step + 1, total);
      await new Promise((resolve) => setTimeout(resolve, 320));
      if (controller.signal.aborted) return;
      const rect = getCaptureRect(area);
      const top = area.scrollTop;
      const end = Math.min(height, top + rect.height);
      if (top > covered + 0.5 || end <= covered || rect.width !== width || area.scrollHeight !== height) {
        throw new Error(t('scrollAreaChanged'));
      }
      const image = new Image();
      image.src = await capture();
      await image.decode();
      if (controller.signal.aborted) return;
      if (Math.abs(area.scrollTop - top) > 0.5) throw new Error(t('scrollAreaChanged'));
      const scaleX = image.naturalWidth / innerWidth;
      const scaleY = image.naturalHeight / innerHeight;
      if (!context) {
        canvas.width = Math.round(width * scaleX);
        canvas.height = Math.round((height - start) * scaleY);
        context = canvas.getContext('2d');
        if (!context) throw new Error(t('scrollAreaFailed'));
      }
      const destY = Math.round((covered - start) * scaleY);
      const drawHeight = Math.round((end - start) * scaleY) - destY;
      context.drawImage(image, Math.round(rect.x * scaleX), Math.round((rect.y + Math.max(0, covered - top)) * scaleY),
        canvas.width, drawHeight, 0, destY, canvas.width, drawHeight);
      covered = end;
      if (covered >= height) break;
      if (step === 0 && start === 0) sticky.forEach((element) => setStyle(element, 'position', 'relative'));
    }

    if (covered < height) throw new Error(t('scrollAreaChanged'));
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (controller.signal.aborted) return;
    if (!blob) throw new Error(t('scrollAreaFailed'));
    return blob;
  } finally {
    controller.abort();
    area.scrollTo({ top: originalTop, left: originalLeft, behavior: 'instant' });
    savedStyles.reverse().forEach((restore) => restore());
  }
}
