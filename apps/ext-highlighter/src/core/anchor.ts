import { HIGHLIGHT_COLORS, HighlightColorId, HighlightItem, HighlightStyle } from '../types';

export const HIGHLIGHT_ATTR = 'data-100free-hl-id';
const CONTEXT_LEN = 32;

function getColorPreset(id: HighlightColorId) {
  return HIGHLIGHT_COLORS.find((c) => c.id === id) || HIGHLIGHT_COLORS[0];
}

function isIgnoredElement(node: Node | null): boolean {
  let el: HTMLElement | null = node instanceof HTMLElement ? node : node?.parentElement || null;
  while (el) {
    const tag = el.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'TEXTAREA' || tag === 'INPUT') {
      return true;
    }
    if (el.id === '100free-hl-host') return true;
    el = el.parentElement;
  }
  return false;
}

/**
 * 收集页面中所有可见文本节点及其在拼接全文中的起止偏移
 */
function collectTextNodes(root: Node = document.body): { nodes: Text[]; starts: number[]; fullText: string } {
  const nodes: Text[] = [];
  const starts: number[] = [];
  const chunks: string[] = [];
  let offset = 0;

  if (!root) return { nodes, starts, fullText: '' };

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue || isIgnoredElement(node)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  let curr = walker.nextNode() as Text | null;
  while (curr) {
    const val = curr.nodeValue || '';
    if (val.length > 0) {
      nodes.push(curr);
      starts.push(offset);
      chunks.push(val);
      offset += val.length;
    }
    curr = walker.nextNode() as Text | null;
  }

  return { nodes, starts, fullText: chunks.join('') };
}

/**
 * 收集与 Range 相交的所有 Text 节点及其在各自节点内的选中起止偏移
 */
function getRangeTextSlices(range: Range): { node: Text; start: number; end: number }[] {
  const slices: { node: Text; start: number; end: number }[] = [];

  if (range.startContainer === range.endContainer && range.startContainer.nodeType === Node.TEXT_NODE) {
    const t = range.startContainer as Text;
    if (!isIgnoredElement(t) && range.endOffset > range.startOffset) {
      slices.push({ node: t, start: range.startOffset, end: range.endOffset });
    }
    return slices;
  }

  const root = range.commonAncestorContainer;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue || isIgnoredElement(node)) return NodeFilter.FILTER_REJECT;
      if (range.intersectsNode(node)) return NodeFilter.FILTER_ACCEPT;
      return NodeFilter.FILTER_REJECT;
    }
  });

  let curr = walker.nextNode() as Text | null;
  while (curr) {
    const len = curr.nodeValue?.length || 0;
    const start = curr === range.startContainer ? range.startOffset : 0;
    const end = curr === range.endContainer ? range.endOffset : len;
    if (end > start) {
      slices.push({ node: curr, start, end });
    }
    curr = walker.nextNode() as Text | null;
  }

  return slices;
}

/**
 * 基于真实 Text 节点偏移提取精确可还原的文本与前后文语义指纹
 * 保证存入的 text 与刷新后 collectTextNodes().fullText 100% 一致
 */
export function extractSelectionAnchor(range: Range): { text: string; prefix: string; suffix: string } | null {
  const displayText = range.toString().trim();
  if (!displayText) return null;

  const slices = getRangeTextSlices(range);
  if (slices.length === 0) {
    return { text: displayText, prefix: '', suffix: '' };
  }

  const { nodes, starts, fullText } = collectTextNodes(document.body);
  const firstSlice = slices[0];
  const lastSlice = slices[slices.length - 1];

  const firstIdx = nodes.indexOf(firstSlice.node);
  const lastIdx = nodes.indexOf(lastSlice.node);

  if (firstIdx >= 0 && lastIdx >= 0) {
    const absStart = starts[firstIdx] + firstSlice.start;
    const absEnd = starts[lastIdx] + lastSlice.end;
    const exact = fullText.slice(absStart, absEnd);
    if (exact.trim()) {
      const prefix = fullText.slice(Math.max(0, absStart - CONTEXT_LEN), absStart);
      const suffix = fullText.slice(absEnd, Math.min(fullText.length, absEnd + CONTEXT_LEN));
      return { text: exact, prefix, suffix };
    }
  }

  const rawJoined = slices.map((s) => (s.node.nodeValue || '').slice(s.start, s.end)).join('');
  return { text: rawJoined || displayText, prefix: '', suffix: '' };
}

function applyMarkStyle(mark: HTMLElement, colorId: HighlightColorId, style: HighlightStyle, hasNote: boolean) {
  const preset = getColorPreset(colorId);
  mark.style.cursor = 'pointer';
  mark.style.borderRadius = '3px';
  mark.style.padding = '1px 0';
  mark.style.transition = 'filter 0.15s ease, box-shadow 0.2s ease';

  if (style === 'underline') {
    mark.style.backgroundColor = 'transparent';
    mark.style.borderBottom = `2.5px solid ${preset.border}`;
    mark.style.color = 'inherit';
  } else {
    mark.style.backgroundColor = preset.bg;
    mark.style.borderBottom = hasNote ? `2px dashed ${preset.border}` : 'none';
    mark.style.color = '#111827';
  }
}

/**
 * 稳健地将任意跨节点 Range 切分包裹为带 ID 的 <mark> 元素
 */
export function wrapRangeWithHighlight(
  range: Range,
  id: string,
  color: HighlightColorId,
  style: HighlightStyle,
  hasNote: boolean
): HTMLElement[] {
  const marks: HTMLElement[] = [];
  const slices = getRangeTextSlices(range);

  for (const slice of slices) {
    let target = slice.node;
    const val = target.nodeValue;
    if (!val || !val.trim()) continue;

    let e = slice.end;
    if (e < val.length) {
      target.splitText(e);
    }
    if (slice.start > 0) {
      target = target.splitText(slice.start);
    }

    if (target.nodeValue && target.nodeValue.length > 0) {
      const mark = document.createElement('mark');
      mark.setAttribute(HIGHLIGHT_ATTR, id);
      mark.className = '100free-hl-mark';
      applyMarkStyle(mark, color, style, hasNote);
      target.parentNode?.insertBefore(mark, target);
      mark.appendChild(target);
      marks.push(mark);
    }
  }

  return marks;
}

/**
 * 折叠空白字符进行模糊兜底匹配并映射回原始偏移
 */
function findCollapsedMatch(fullText: string, query: string): { start: number; end: number } | null {
  const normQuery = query.replace(/\s+/g, '');
  if (!normQuery) return null;

  const mapIndices: number[] = [];
  const normChars: string[] = [];
  for (let i = 0; i < fullText.length; i++) {
    const ch = fullText[i];
    if (!/\s/.test(ch)) {
      mapIndices.push(i);
      normChars.push(ch);
    }
  }
  const normFull = normChars.join('');
  const idx = normFull.indexOf(normQuery);
  if (idx < 0) return null;

  const start = mapIndices[idx];
  const end = mapIndices[idx + normQuery.length - 1] + 1;
  return { start, end };
}

/**
 * 在页面中查找并恢复单条高亮记录
 */
export function restoreHighlightOnPage(item: HighlightItem): boolean {
  if (document.querySelector(`[${HIGHLIGHT_ATTR}="${item.id}"]`)) return true;

  const { nodes, starts, fullText } = collectTextNodes(document.body);
  if (!fullText || !item.text) return false;

  let matchStart = -1;
  let matchEnd = -1;

  if (item.prefix || item.suffix) {
    const needle = `${item.prefix}${item.text}${item.suffix}`;
    const idx = fullText.indexOf(needle);
    if (idx >= 0) {
      matchStart = idx + item.prefix.length;
      matchEnd = matchStart + item.text.length;
    }
  }

  if (matchStart < 0) {
    const idx = fullText.indexOf(item.text);
    if (idx >= 0) {
      matchStart = idx;
      matchEnd = idx + item.text.length;
    }
  }

  // 兜底：忽略空白符差异进行精确字符序列匹配
  if (matchStart < 0) {
    const collapsed = findCollapsedMatch(fullText, item.text);
    if (collapsed) {
      matchStart = collapsed.start;
      matchEnd = collapsed.end;
    }
  }

  if (matchStart < 0 || matchEnd <= matchStart) return false;

  let startNodeIdx = -1;
  let endNodeIdx = -1;

  for (let i = 0; i < nodes.length; i++) {
    const nodeStart = starts[i];
    const nodeEnd = nodeStart + (nodes[i].nodeValue?.length || 0);
    if (startNodeIdx < 0 && matchStart >= nodeStart && matchStart < nodeEnd) {
      startNodeIdx = i;
    }
    if (matchEnd > nodeStart && matchEnd <= nodeEnd) {
      endNodeIdx = i;
      break;
    }
  }

  if (startNodeIdx < 0 || endNodeIdx < 0) return false;

  try {
    const range = document.createRange();
    range.setStart(nodes[startNodeIdx], matchStart - starts[startNodeIdx]);
    range.setEnd(nodes[endNodeIdx], matchEnd - starts[endNodeIdx]);
    const marks = wrapRangeWithHighlight(range, item.id, item.color, item.style, Boolean(item.note?.trim()));
    return marks.length > 0;
  } catch {
    return false;
  }
}

export function updateHighlightAppearance(id: string, color: HighlightColorId, style: HighlightStyle, hasNote: boolean) {
  const marks = document.querySelectorAll<HTMLElement>(`[${HIGHLIGHT_ATTR}="${id}"]`);
  marks.forEach((mark) => applyMarkStyle(mark, color, style, hasNote));
}

export function removeHighlightFromPage(id: string) {
  const marks = document.querySelectorAll<HTMLElement>(`[${HIGHLIGHT_ATTR}="${id}"]`);
  marks.forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;
    while (mark.firstChild) {
      parent.insertBefore(mark.firstChild, mark);
    }
    parent.removeChild(mark);
    parent.normalize();
  });
}

export function scrollToHighlight(id: string) {
  const mark = document.querySelector<HTMLElement>(`[${HIGHLIGHT_ATTR}="${id}"]`);
  if (!mark) return false;
  mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const prevShadow = mark.style.boxShadow;
  mark.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.55)';
  setTimeout(() => {
    mark.style.boxShadow = prevShadow;
  }, 1600);
  return true;
}
