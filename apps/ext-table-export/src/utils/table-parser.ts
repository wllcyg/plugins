import * as XLSX from 'xlsx';
import { exportCsv } from '@100free/core';

export interface ParsedTableData {
  rows: string[][];
  rowCount: number;
  colCount: number;
  title?: string;
  isVirtualScroll?: boolean; // 是否侦测到虚拟滚动
  virtualHint?: string;
}

const COMPONENT_TABLE_SELECTORS = [
  '.ant-table-wrapper',
  '.ant-table',
  '.el-table',
  '.n-data-table',
  '[role="table"]',
  '[role="grid"]'
];

/**
 * 探测目标元素所属的真实逻辑表格实体
 */
export function findLogicalTableRoot(target: HTMLElement): HTMLElement | null {
  for (const selector of COMPONENT_TABLE_SELECTORS) {
    const root = target.closest<HTMLElement>(selector);
    if (root && (root.querySelector('table') || root.querySelector('[role="row"]'))) {
      return root;
    }
  }

  const nativeTable = target.closest<HTMLTableElement>('table');
  if (nativeTable) {
    return nativeTable;
  }

  return null;
}

/**
 * 检测表格容器是否启用了虚拟滚动（Virtual Scroll）
 */
function detectVirtualScroll(container: HTMLElement, renderedRowsCount: number): { isVirtual: boolean; hint?: string } {
  // 1. 常见虚拟滚动容器类名或属性
  const scrollContainer = container.querySelector('.ant-table-body, .el-table__body-wrapper, .vxe-table--body-wrapper, [class*="virtual"], [class*="scroll"]') as HTMLElement | null;
  const targetEl = scrollContainer || container;

  const scrollHeight = targetEl.scrollHeight;
  const clientHeight = targetEl.clientHeight;

  // 如果内容高度远超可视高度，且渲染行数却很少（例如平均每行高度显得异常庞大）
  if (renderedRowsCount > 0 && scrollHeight > clientHeight * 1.8) {
    const avgRowHeight = scrollHeight / renderedRowsCount;
    // 正常一行表格 30px-50px，如果计算出的单行占高 > 80px 说明大量行被虚拟化未挂载
    if (avgRowHeight > 80 || targetEl.querySelector('[class*="phantom"], [class*="spacer"], [class*="virtual-scroll"]')) {
      return {
        isVirtual: true,
        hint: '检测到当前表格启用虚拟滚动，仅能导出可视区域。建议全屏或取消虚拟滚动后导出完整数据。'
      };
    }
  }

  return { isVirtual: false };
}

/**
 * 统一解析入口：智能识别原生单体 table 还是 AntD / Element 复合拆分表格
 */
export function parseTableOrContainer(root: HTMLElement): ParsedTableData {
  if (root instanceof HTMLTableElement && !root.closest('.ant-table-wrapper, .ant-table, .el-table')) {
    const res = parseSingleHtmlTable(root);
    const virtualCheck = detectVirtualScroll(root, res.rowCount);
    res.isVirtualScroll = virtualCheck.isVirtual;
    res.virtualHint = virtualCheck.hint;
    return res;
  }

  const res = parseCompositeContainer(root);
  const virtualCheck = detectVirtualScroll(root, res.rowCount);
  res.isVirtualScroll = virtualCheck.isVirtual;
  res.virtualHint = virtualCheck.hint;
  return res;
}

/**
 * 全量复合表格聚合解析引擎
 */
function parseCompositeContainer(container: HTMLElement): ParsedTableData {
  const allTables = Array.from(container.querySelectorAll<HTMLTableElement>('table'));

  if (allTables.length === 0) {
    // 兼容 role="grid" / role="table" 纯 div 表格
    return parseAriaGridTable(container);
  }

  // 1. 提取最完整的表头 (寻找所有 table 中包含 th 最多的一行表头)
  let bestHeaderRow: string[] = [];
  allTables.forEach((tbl) => {
    const theadThs = Array.from(tbl.querySelectorAll<HTMLTableCellElement>('thead th, tr:first-child th'));
    const validThs = theadThs.filter((th) => !th.classList.contains('ant-table-cell-scrollbar') && !th.classList.contains('gutter'));
    if (validThs.length > bestHeaderRow.length) {
      bestHeaderRow = validThs.map(cleanCellText);
    }
  });

  // 2. 扫描所有 table 中的数据行 (tr 包含 td)
  interface TableCandidate {
    table: HTMLTableElement;
    rows: string[][];
    colCount: number;
  }

  const candidateTables: TableCandidate[] = [];

  allTables.forEach((tbl) => {
    const dataTrs = Array.from(tbl.querySelectorAll<HTMLTableRowElement>('tr')).filter((tr) => {
      if (tr.querySelector('th') && !tr.querySelector('td')) return false;
      if (tr.classList.contains('ant-table-placeholder') || tr.classList.contains('el-table__empty-block')) return false;
      return tr.querySelectorAll('td').length > 0;
    });

    if (dataTrs.length > 0) {
      const rows = dataTrs.map((tr) => {
        const tds = Array.from(tr.querySelectorAll<HTMLTableCellElement>(':scope > td'));
        return tds.map(cleanCellText);
      });
      const maxCols = rows.reduce((max, r) => Math.max(max, r.length), 0);
      candidateTables.push({ table: tbl, rows, colCount: maxCols });
    }
  });

  let bodyRows: string[][] = [];

  if (candidateTables.length === 1) {
    bodyRows = candidateTables[0].rows;
  } else if (candidateTables.length > 1) {
    candidateTables.sort((a, b) => (b.rows.length * b.colCount) - (a.rows.length * a.colCount));
    const primary = candidateTables[0];

    if (primary.colCount >= bestHeaderRow.length - 2 || candidateTables.every(c => c.colCount <= 3)) {
      bodyRows = primary.rows;
    } else {
      const maxRowCount = Math.max(...candidateTables.map(c => c.rows.length));
      for (let i = 0; i < maxRowCount; i++) {
        const mergedRow: string[] = [];
        candidateTables.forEach(c => {
          if (c.rows[i]) {
            mergedRow.push(...c.rows[i]);
          }
        });
        bodyRows.push(mergedRow);
      }
    }
  } else {
    const rawTrs = Array.from(container.querySelectorAll<HTMLTableRowElement>('tbody tr, tr')).filter(tr => tr.querySelectorAll('td').length > 0);
    bodyRows = rawTrs.map(tr => Array.from(tr.querySelectorAll<HTMLTableCellElement>('td')).map(cleanCellText));
  }

  // 3. 缝合最终结果
  const resultRows: string[][] = [];
  if (bestHeaderRow.length > 0) {
    resultRows.push(bestHeaderRow);
  }
  resultRows.push(...bodyRows);

  const finalColCount = resultRows.reduce((max, r) => Math.max(max, r.length), 0);
  resultRows.forEach((r) => {
    while (r.length < finalColCount) r.push('');
  });

  const title = container.querySelector('.ant-table-title')?.textContent?.trim() || '表格导出数据';

  return {
    rows: resultRows,
    rowCount: resultRows.length,
    colCount: finalColCount,
    title
  };
}

/**
 * 兼容纯 DIV 实现的 ARIA Grid 表格
 */
function parseAriaGridTable(container: HTMLElement): ParsedTableData {
  const rowElements = Array.from(container.querySelectorAll<HTMLElement>('[role="row"]'));
  if (rowElements.length === 0) {
    return { rows: [], rowCount: 0, colCount: 0, title: '空表格' };
  }

  const resultRows: string[][] = [];
  rowElements.forEach((row) => {
    const cells = Array.from(row.querySelectorAll<HTMLElement>('[role="columnheader"], [role="gridcell"], [role="cell"]'));
    if (cells.length > 0) {
      resultRows.push(cells.map(c => cleanTextContent(c)));
    }
  });

  const colCount = resultRows.reduce((max, r) => Math.max(max, r.length), 0);
  return {
    rows: resultRows,
    rowCount: resultRows.length,
    colCount,
    title: '网络数据网格'
  };
}

/**
 * 原生单体 HTML 表格解析（支持标准二维合并矩阵）
 */
function parseSingleHtmlTable(table: HTMLTableElement): ParsedTableData {
  const matrix: string[][] = [];
  const trElements = Array.from(table.querySelectorAll('tr'));

  let title = '';
  const caption = table.querySelector('caption');
  if (caption) {
    title = caption.textContent?.trim() || '';
  }

  const occupied: boolean[][] = [];
  const setOccupied = (r: number, c: number) => {
    if (!occupied[r]) occupied[r] = [];
    occupied[r][c] = true;
  };
  const isOccupied = (r: number, c: number) => !!(occupied[r] && occupied[r][c]);

  trElements.forEach((tr, rowIndex) => {
    if (!matrix[rowIndex]) matrix[rowIndex] = [];
    let targetCol = 0;

    const cells = Array.from(tr.querySelectorAll<HTMLTableCellElement>(':scope > th, :scope > td'));

    cells.forEach((cell) => {
      while (isOccupied(rowIndex, targetCol)) {
        targetCol++;
      }

      const text = cleanCellText(cell);
      const rowspan = cell.rowSpan || 1;
      const colspan = cell.colSpan || 1;

      for (let r = 0; r < rowspan; r++) {
        const currR = rowIndex + r;
        if (!matrix[currR]) matrix[currR] = [];

        for (let c = 0; c < colspan; c++) {
          const currC = targetCol + c;
          setOccupied(currR, currC);
          matrix[currR][currC] = (r === 0 && c === 0) ? text : '';
        }
      }

      targetCol += colspan;
    });
  });

  const validRows = matrix.filter((row) => row && row.some((cell) => cell !== ''));
  const maxCols = validRows.reduce((max, row) => Math.max(max, row.length), 0);

  validRows.forEach((row) => {
    while (row.length < maxCols) row.push('');
  });

  return {
    rows: validRows,
    rowCount: validRows.length,
    colCount: maxCols,
    title: title || '网页表格数据'
  };
}

/**
 * 递归深度清理文本：剔除隐藏 DOM、操作按钮等噪音
 */
function cleanTextContent(node: HTMLElement): string {
  const clone = node.cloneNode(true) as HTMLElement;

  // 移除常见的操作列或过滤按钮等干扰元素
  clone.querySelectorAll(`
    script, style, noscript, [hidden],
    .caret-wrapper, .el-table__column-filter-trigger,
    .ant-table-column-sorter, .ant-table-filter-trigger, .ant-table-column-sorters
  `).forEach((el) => el.remove());

  // 移除 inline 隐藏的元素
  clone.querySelectorAll('*').forEach((el) => {
    const htmlEl = el as HTMLElement;
    if (htmlEl.style?.display === 'none' || htmlEl.style?.visibility === 'hidden' || htmlEl.getAttribute('aria-hidden') === 'true') {
      htmlEl.remove();
    }
  });

  const raw = clone.innerText || clone.textContent || '';
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\n+/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

/**
 * 清洗单元格文本，并精准剥离组件库噪音节点
 */
function cleanCellText(cell: HTMLTableCellElement): string {
  // 优先提取 Ant Design 列标题
  const antdTitle = cell.querySelector('.ant-table-column-title');
  if (antdTitle && antdTitle.textContent?.trim()) {
    return antdTitle.textContent.trim();
  }

  return cleanTextContent(cell);
}

/**
 * 导出为 Excel（包含对大于 11 位大数字的字符串格式保护，杜绝科学计数法截断）
 */
export function exportToExcel(data: ParsedTableData, fileName?: string): void {
  // 构建单元格并强制大整数转为 Text 类型
  const ws: XLSX.WorkSheet = {};
  const range = { s: { c: 0, r: 0 }, e: { c: data.colCount - 1, r: data.rows.length - 1 } };

  data.rows.forEach((row, r) => {
    row.forEach((val, c) => {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      const strVal = String(val ?? '');

      // 规则：纯数字且长度大于等于 11 位（如订单号、手机号、身份证），强制设为纯文本类型 's'
      const isLargeNumeric = /^\d{11,}$/.test(strVal.trim());

      if (isLargeNumeric) {
        ws[cellRef] = {
          t: 's',
          v: strVal.trim(),
          z: '@' // 文本格式
        };
      } else {
        // 尝试正常写入或数值转换
        const num = Number(strVal);
        if (!isNaN(num) && strVal.trim() !== '' && !strVal.startsWith('0') && strVal.length < 11) {
          ws[cellRef] = { t: 'n', v: num };
        } else {
          ws[cellRef] = { t: 's', v: strVal };
        }
      }
    });
  });

  ws['!ref'] = XLSX.utils.encode_range(range);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

  const name = fileName || `${data.title || '表格导出'}_${Date.now()}.xlsx`;
  XLSX.writeFile(wb, name.endsWith('.xlsx') ? name : `${name}.xlsx`);
}

/**
 * 导出为 CSV（长数字添加前置制表符以防 Excel 打开时科学计数法丢失精度）
 */
export function exportToCsv(data: ParsedTableData, fileName?: string): void {
  const safeRows = data.rows.map((row) =>
    row.map((cell) => {
      const str = String(cell ?? '').trim();
      // 11位以上大数字加 \t 制表符，Excel 直接双击打开时会自动识别为文本而非科学计数法
      if (/^\d{11,}$/.test(str)) {
        return `\t${str}`;
      }
      return cell;
    })
  );

  const name = fileName || `${data.title || '表格导出'}_${Date.now()}.csv`;
  exportCsv(safeRows, name);
}

/**
 * 复制表格为 TSV 剪贴板格式
 */
export async function copyTableToClipboard(data: ParsedTableData): Promise<void> {
  const safeRows = data.rows.map((row) =>
    row.map((cell) => {
      const str = String(cell ?? '').trim();
      if (/^\d{11,}$/.test(str)) {
        return `\t${str}`;
      }
      return cell;
    })
  );
  const tsv = safeRows.map((row) => row.join('\t')).join('\n');
  await navigator.clipboard.writeText(tsv);
}
