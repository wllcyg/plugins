import * as XLSX from 'xlsx';
import { exportCsv } from '@100free/core';

export interface ParsedTableData {
  rows: string[][];
  rowCount: number;
  colCount: number;
  title?: string;
}

/**
 * 健壮的 HTML 表格解析引擎，支持跨行跨列 (rowspan / colspan) 展开与文本净化
 */
export function parseHtmlTable(table: HTMLTableElement): ParsedTableData {
  const matrix: string[][] = [];
  const trElements = Array.from(table.querySelectorAll('tr'));

  // 尝试获取表格标题或附近有意义的描述文本
  let title = '';
  const caption = table.querySelector('caption');
  if (caption) {
    title = caption.textContent?.trim() || '';
  } else {
    // 尝试寻找前一个标题标签作为表格名
    let prev = table.previousElementSibling;
    while (prev) {
      if (/^H[1-6]$/i.test(prev.tagName)) {
        title = prev.textContent?.trim() || '';
        break;
      }
      prev = prev.previousElementSibling;
    }
  }

  // 跟踪单元格占用状态 [row][col] => boolean
  const occupied: boolean[][] = [];

  const setOccupied = (r: number, c: number) => {
    if (!occupied[r]) occupied[r] = [];
    occupied[r][c] = true;
  };

  const isOccupied = (r: number, c: number) => {
    return !!(occupied[r] && occupied[r][c]);
  };

  trElements.forEach((tr, rowIndex) => {
    if (!matrix[rowIndex]) matrix[rowIndex] = [];
    let targetCol = 0;

    const cells = Array.from(tr.querySelectorAll<HTMLTableCellElement>(':scope > th, :scope > td'));

    cells.forEach((cell) => {
      // 跳过已被上方或左侧跨行跨列占用的位置
      while (isOccupied(rowIndex, targetCol)) {
        targetCol++;
      }

      const text = cleanCellText(cell);
      const rowspan = cell.rowSpan || 1;
      const colspan = cell.colSpan || 1;

      // 填充当前单元格以及跨行跨列区域
      for (let r = 0; r < rowspan; r++) {
        const currR = rowIndex + r;
        if (!matrix[currR]) matrix[currR] = [];

        for (let c = 0; c < colspan; c++) {
          const currC = targetCol + c;
          setOccupied(currR, currC);
          // 仅在左上角放置内容，其余跨越格保持文本或留空（留空符合 Excel 合并习惯）
          matrix[currR][currC] = (r === 0 && c === 0) ? text : '';
        }
      }

      targetCol += colspan;
    });
  });

  // 剔除全空行并规范列数
  const validRows = matrix.filter((row) => row && row.some((cell) => cell !== ''));
  const maxCols = validRows.reduce((max, row) => Math.max(max, row.length), 0);

  // 补齐末尾空列保证矩形对齐
  validRows.forEach((row) => {
    while (row.length < maxCols) {
      row.push('');
    }
  });

  return {
    rows: validRows,
    rowCount: validRows.length,
    colCount: maxCols,
    title: title || '网页表格数据'
  };
}

/**
 * 清洗单元格文本，过滤隐藏节点并规范空白
 */
function cleanCellText(cell: HTMLTableCellElement): string {
  // 克隆节点以防修改原始 DOM
  const clone = cell.cloneNode(true) as HTMLElement;

  // 移除脚本与不可见元素
  clone.querySelectorAll('script, style, noscript, [hidden], [style*="display: none"]').forEach((el) => el.remove());

  // 替换换行与多余空白
  const raw = clone.innerText || clone.textContent || '';
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\n+/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

/**
 * 导出为 .xlsx 文件
 */
export function exportToExcel(data: ParsedTableData, fileName?: string): void {
  const ws = XLSX.utils.aoa_to_sheet(data.rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

  const name = fileName || `${data.title || '表格导出'}_${Date.now()}.xlsx`;
  XLSX.writeFile(wb, name.endsWith('.xlsx') ? name : `${name}.xlsx`);
}

/**
 * 导出为 .csv 文件
 */
export function exportToCsv(data: ParsedTableData, fileName?: string): void {
  const name = fileName || `${data.title || '表格导出'}_${Date.now()}.csv`;
  exportCsv(data.rows, name);
}

/**
 * 复制为制表符分隔格式 (TSV)，方便直接粘贴到 Excel / Numbers
 */
export async function copyTableToClipboard(data: ParsedTableData): Promise<void> {
  const tsv = data.rows.map((row) => row.join('\t')).join('\n');
  await navigator.clipboard.writeText(tsv);
}

