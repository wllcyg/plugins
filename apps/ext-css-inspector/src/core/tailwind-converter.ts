/**
 * 极简 CSS to Tailwind 智能转换引擎
 */

// 常用像素映射表 (px -> tailwind scale)
const SPACING_MAP: Record<string, string> = {
  '0px': '0',
  '1px': 'px',
  '2px': '0.5',
  '4px': '1',
  '6px': '1.5',
  '8px': '2',
  '10px': '2.5',
  '12px': '3',
  '14px': '3.5',
  '16px': '4',
  '20px': '5',
  '24px': '6',
  '28px': '7',
  '32px': '8',
  '36px': '9',
  '40px': '10',
  '48px': '12',
  '56px': '14',
  '64px': '16',
};

const RADIUS_MAP: Record<string, string> = {
  '0px': 'rounded-none',
  '2px': 'rounded-sm',
  '4px': 'rounded',
  '6px': 'rounded-md',
  '8px': 'rounded-lg',
  '12px': 'rounded-xl',
  '16px': 'rounded-2xl',
  '24px': 'rounded-3xl',
  '9999px': 'rounded-full',
  '50%': 'rounded-full'
};

const FONT_SIZE_MAP: Record<string, string> = {
  '12px': 'text-xs',
  '14px': 'text-sm',
  '16px': 'text-base',
  '18px': 'text-lg',
  '20px': 'text-xl',
  '24px': 'text-2xl',
  '30px': 'text-3xl',
  '36px': 'text-4xl',
};

const FONT_WEIGHT_MAP: Record<string, string> = {
  '100': 'font-thin',
  '200': 'font-extralight',
  '300': 'font-light',
  '400': 'font-normal',
  '500': 'font-medium',
  '600': 'font-semibold',
  '700': 'font-bold',
  '800': 'font-extrabold',
  '900': 'font-black'
};

function formatColorToHex(colorStr: string): string | null {
  if (!colorStr || colorStr === 'rgba(0, 0, 0, 0)' || colorStr === 'transparent') {
    return null;
  }
  // 如果是 rgb/rgba
  const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (match) {
    const r = parseInt(match[1]).toString(16).padStart(2, '0');
    const g = parseInt(match[2]).toString(16).padStart(2, '0');
    const b = parseInt(match[3]).toString(16).padStart(2, '0');
    if (match[4] && parseFloat(match[4]) < 1) {
      const alpha = Math.round(parseFloat(match[4]) * 100);
      return `#${r}${g}${b}/${alpha}%`;
    }
    return `#${r}${g}${b}`;
  }
  return colorStr;
}

export function convertStylesToTailwind(styles: CSSStyleDeclaration): string {
  const classes: string[] = [];

  // 1. 布局 (display, flex, grid)
  const display = styles.display;
  if (display === 'flex') {
    classes.push('flex');
    if (styles.flexDirection === 'column') classes.push('flex-col');
    if (styles.alignItems === 'center') classes.push('items-center');
    if (styles.justifyContent === 'center') classes.push('justify-center');
    if (styles.justifyContent === 'space-between') classes.push('justify-between');
    if (styles.gap && styles.gap !== 'normal' && styles.gap !== '0px') {
      const scale = SPACING_MAP[styles.gap];
      classes.push(scale ? `gap-${scale}` : `gap-[${styles.gap}]`);
    }
  } else if (display === 'inline-flex') {
    classes.push('inline-flex');
    if (styles.alignItems === 'center') classes.push('items-center');
  } else if (display === 'grid') {
    classes.push('grid');
  } else if (display === 'inline-block') {
    classes.push('inline-block');
  } else if (display === 'none') {
    classes.push('hidden');
  }

  // 2. 边距与间距
  const pt = styles.paddingTop;
  const pr = styles.paddingRight;
  const pb = styles.paddingBottom;
  const pl = styles.paddingLeft;

  if (pt === pb && pr === pl && pt === pr) {
    if (pt && pt !== '0px') {
      const s = SPACING_MAP[pt];
      classes.push(s ? `p-${s}` : `p-[${pt}]`);
    }
  } else {
    if (pt === pb && pt && pt !== '0px') {
      const s = SPACING_MAP[pt];
      classes.push(s ? `py-${s}` : `py-[${pt}]`);
    } else {
      if (pt && pt !== '0px') classes.push(SPACING_MAP[pt] ? `pt-${SPACING_MAP[pt]}` : `pt-[${pt}]`);
      if (pb && pb !== '0px') classes.push(SPACING_MAP[pb] ? `pb-${SPACING_MAP[pb]}` : `pb-[${pb}]`);
    }

    if (pl === pr && pl && pl !== '0px') {
      const s = SPACING_MAP[pl];
      classes.push(s ? `px-${s}` : `px-[${pl}]`);
    } else {
      if (pl && pl !== '0px') classes.push(SPACING_MAP[pl] ? `pl-${SPACING_MAP[pl]}` : `pl-[${pl}]`);
      if (pr && pr !== '0px') classes.push(SPACING_MAP[pr] ? `pr-${SPACING_MAP[pr]}` : `pr-[${pr}]`);
    }
  }

  // 3. 背景色
  const hexBg = formatColorToHex(styles.backgroundColor);
  if (hexBg) {
    if (hexBg === '#ffffff') classes.push('bg-white');
    else if (hexBg === '#000000') classes.push('bg-black');
    else classes.push(`bg-[${hexBg}]`);
  }

  // 4. 文字颜色与排版
  const hexColor = formatColorToHex(styles.color);
  if (hexColor) {
    if (hexColor === '#ffffff') classes.push('text-white');
    else if (hexColor === '#000000') classes.push('text-black');
    else classes.push(`text-[${hexColor}]`);
  }

  const fontSize = FONT_SIZE_MAP[styles.fontSize];
  if (fontSize) {
    classes.push(fontSize);
  } else if (styles.fontSize && styles.fontSize !== '16px') {
    classes.push(`text-[${styles.fontSize}]`);
  }

  const fontWeight = FONT_WEIGHT_MAP[styles.fontWeight];
  if (fontWeight && fontWeight !== 'font-normal') {
    classes.push(fontWeight);
  }

  // 5. 圆角
  const radius = styles.borderRadius;
  if (radius && radius !== '0px') {
    const rClass = RADIUS_MAP[radius];
    classes.push(rClass || `rounded-[${radius}]`);
  }

  // 6. 边框
  const borderW = styles.borderTopWidth;
  if (borderW && borderW !== '0px') {
    classes.push(borderW === '1px' ? 'border' : `border-[${borderW}]`);
    const borderCol = formatColorToHex(styles.borderTopColor);
    if (borderCol) classes.push(`border-[${borderCol}]`);
  }

  // 7. 阴影
  const shadow = styles.boxShadow;
  if (shadow && shadow !== 'none') {
    classes.push('shadow-md');
  }

  return classes.join(' ');
}
