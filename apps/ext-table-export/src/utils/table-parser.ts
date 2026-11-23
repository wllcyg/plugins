import * as XLSX from 'xlsx';
import { exportCsv } from '@100free/core';

export interface ParsedTableData {
  rows: string[][];
  rowCount: number;
  colCount: number;
  title?: string;
}

const COMPONENT_TABLE_SELECTORS = [
  '.ant-table-wrapper',
  '.ant-table',
  '.el-table',
  '.n-data-table',
  '[role="table"]'
];

/**
 * 探测目标元素所属的真实逻辑表格实体
 */
export function findLogicalTableRoot(target: HTMLElement): HTMLElement | null {
  for (const selector of COMPONENT_TABLE_SELECTORS) {
    const root = target.closest<HTMLElement>(selector);
    if (root && root.querySelector('table')) {
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
 * 统一解析入口：智能识别是原生单体 table 还是 AntD / Element 复合拆分表格
 */
export function parseTableOrContainer(root: HTMLElement): ParsedTableData {
  // 如果是纯单体 table，且完全没有任何外部 UI 框架复合容器包裹
  if (root instanceof HTMLTableElement && !root.closest('.ant-table-wrapper, .ant-table, .el-table')) {
    return parseSingleHtmlTable(root);
  }

  // 只要处于复合容器内，采用强大的“全量表头 + 数据表体聚合引擎”
  return parseCompositeContainer(root);
}

/**
 * 全量复合表格聚合解析引擎
 * 专门攻克 Ant Design 3/4/5、Element Plus 等将一个表格拆为多个 table 的机制
 */
function parseCompositeContainer(container: HTMLElement): ParsedTableData {
  const allTables = Array.from(container.querySelectorAll<HTMLTableElement>('table'));

  if (allTables.length === 0) {
    return { rows: [], rowCount: 0, colCount: 0, title: '空表格' };
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
  // 按 table 分组找出所有包含有效数据的 candidate tables
  interface TableCandidate {
    table: HTMLTableElement;
    rows: string[][];
    colCount: number;
  }

  const candidateTables: TableCandidate[] = [];

  allTables.forEach((tbl) => {
    const dataTrs = Array.from(tbl.querySelectorAll<HTMLTableRowElement>('tr')).filter((tr) => {
      // 排除表头行、无 td 的行、空占位行
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
    // 只有一个包含数据的 table，直接采用
    bodyRows = candidateTables[0].rows;
  } else if (candidateTables.length > 1) {
    // 存在多个数据 table（典型场景：Ant Design 3/4 的左侧固定列 table + 主体滚动区 table）
    // 判断：是否存在一个“主 table”，其列数已经涵盖了大部分列甚至等于表头列数
    candidateTables.sort((a, b) => (b.rows.length * b.colCount) - (a.rows.length * a.colCount));
    const primary = candidateTables[0];

    // 如果主 table 的列数与最佳表头列数基本一致（相差不超过固定列数），或者主 table 本身就包含了全部 34 列：
    if (primary.colCount >= bestHeaderRow.length - 2 || candidateTables.every(c => c.colCount <= 3)) {
      bodyRows = primary.rows;
    } else {
      // 极罕见情况：数据确实被物理拆分在多个等行数的 table 里，按行索引横向合并
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
    // 如果没有任何 table 里找到标准 td，尝试遍历 container 内所有的 tr
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
 * 原生单体 HTML 表格解析
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
 * 清洗单元格文本，并精准剥离组件库噪音节点
 */
function cleanCellText(cell: HTMLTableCellElement): string {
  const clone = cell.cloneNode(true) as HTMLElement;

  // 优先提取 Ant Design 列标题
  const antdTitle = clone.querySelector('.ant-table-column-title');
  if (antdTitle && antdTitle.textContent?.trim()) {
    return antdTitle.textContent.trim();
  }

  clone.querySelectorAll('.caret-wrapper, .el-table__column-filter-trigger').forEach((el) => el.remove());

  clone.querySelectorAll(`
    script, style, noscript, [hidden], [style*="display: none"],
    .ant-table-column-sorter, .ant-table-filter-trigger, .ant-table-column-sorters
  `).forEach((el) => el.remove());

  const raw = clone.innerText || clone.textContent || '';
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\n+/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

export function exportToExcel(data: ParsedTableData, fileName?: string): void {
  const ws = XLSX.utils.aoa_to_sheet(data.rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

  const name = fileName || `${data.title || '表格导出'}_${Date.now()}.xlsx`;
  XLSX.writeFile(wb, name.endsWith('.xlsx') ? name : `${name}.xlsx`);
}

export function exportToCsv(data: ParsedTableData, fileName?: string): void {
  const name = fileName || `${data.title || '表格导出'}_${Date.now()}.csv`;
  exportCsv(data.rows, name);
}

export async function copyTableToClipboard(data: ParsedTableData): Promise<void> {
  const tsv = data.rows.map((row) => row.join('\t')).join('\n');
  await navigator.clipboard.writeText(tsv);
}
