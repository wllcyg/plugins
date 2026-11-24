import { StyleSummary } from '../types';
import { convertStylesToTailwind } from './tailwind-converter';

export function extractElementStyles(el: HTMLElement): StyleSummary {
  const computed = window.getComputedStyle(el);
  const rect = el.getBoundingClientRect();

  const tagName = el.tagName.toLowerCase();
  const idName = el.id ? `#${el.id}` : '';
  const classList = Array.from(el.classList).slice(0, 4);

  // 构造纯 CSS 关键代码块
  const cssLines: string[] = [];
  
  if (computed.display && computed.display !== 'block' && computed.display !== 'inline') {
    cssLines.push(`display: ${computed.display};`);
    if (computed.display.includes('flex')) {
      if (computed.flexDirection !== 'row') cssLines.push(`flex-direction: ${computed.flexDirection};`);
      if (computed.alignItems !== 'normal') cssLines.push(`align-items: ${computed.alignItems};`);
      if (computed.justifyContent !== 'normal') cssLines.push(`justify-content: ${computed.justifyContent};`);
      if (computed.gap && computed.gap !== 'normal') cssLines.push(`gap: ${computed.gap};`);
    }
  }

  if (computed.backgroundColor && computed.backgroundColor !== 'rgba(0, 0, 0, 0)') {
    cssLines.push(`background-color: ${computed.backgroundColor};`);
  }

  if (computed.color) {
    cssLines.push(`color: ${computed.color};`);
  }

  if (computed.fontSize) {
    cssLines.push(`font-size: ${computed.fontSize};`);
  }

  if (computed.fontWeight && computed.fontWeight !== '400') {
    cssLines.push(`font-weight: ${computed.fontWeight};`);
  }

  if (computed.lineHeight && computed.lineHeight !== 'normal') {
    cssLines.push(`line-height: ${computed.lineHeight};`);
  }

  if (computed.fontFamily) {
    const font = computed.fontFamily.split(',')[0].trim();
    cssLines.push(`font-family: ${font};`);
  }

  if (computed.padding && computed.padding !== '0px') {
    cssLines.push(`padding: ${computed.padding};`);
  }

  if (computed.borderRadius && computed.borderRadius !== '0px') {
    cssLines.push(`border-radius: ${computed.borderRadius};`);
  }

  if (computed.borderWidth && computed.borderWidth !== '0px') {
    cssLines.push(`border: ${computed.borderWidth} ${computed.borderStyle} ${computed.borderColor};`);
  }

  if (computed.boxShadow && computed.boxShadow !== 'none') {
    cssLines.push(`box-shadow: ${computed.boxShadow};`);
  }

  const rawCss = cssLines.join('\n');
  const tailwindClasses = convertStylesToTailwind(computed);

  return {
    tagName,
    idName,
    classList,
    dimensions: {
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    },
    color: computed.color,
    backgroundColor: computed.backgroundColor,
    fontSize: computed.fontSize,
    fontWeight: computed.fontWeight,
    lineHeight: computed.lineHeight,
    fontFamily: computed.fontFamily.split(',')[0].replace(/['"]/g, '').trim(),
    padding: computed.padding,
    margin: computed.margin,
    borderRadius: computed.borderRadius,
    border: computed.borderWidth !== '0px' ? `${computed.borderWidth} ${computed.borderStyle}` : 'none',
    boxShadow: computed.boxShadow,
    display: computed.display,
    flexDirection: computed.flexDirection,
    rawCss,
    tailwindClasses
  };
}
