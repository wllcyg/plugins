import * as XLSX from 'xlsx';
import { exportCsv } from '@100free/core';

export interface ParsedTableData {
  rows: string[][];
  rowCount: number;
  colCount: number;
  title?: string;
}

/**
 * 复合组件库表格选择器配置
 */
const COMPONENT_TABLE_SELECTORS = [
  '.ant-table-wrapper',
  '.ant-table',
  '.el-table',
  '.n-data-table',
  '[role="table"]'
];

/**
 * 探测目标元素所属的真实逻辑表格实体 (支持单体 table 与 AntD/Element 等复合大容器)
 */
export function findLogicalTableRoot(target: HTMLElement): HTMLElement | null {
  // 1. 优先探测是否处于现代 UI 组件库的大表格容器内
  for (const selector of COMPONENT_TABLE_SELECTORS) {
    const root = target.closest<HTMLElement>(selector);
    if (root) {
      // 必须确保容器内确实含有 table 节点
      if (root.querySelector('table')) {
        return root;
      }
    }
  }

  // 2. 普通单体原生表格回退
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
  if (root instanceof HTMLTableElement && !root.closest('.ant-table-wrapper, .ant-table, .el-table')) {
    return parseSingleHtmlTable(root);
  }

  // 检查是否是 Ant Design 复合表格
  if (root.matches('.ant-table-wrapper, .ant-table') || root.querySelector('.ant-table-header, .ant-table-body, .ant-table-content')) {
    return parseAntDesignTable(root);
  }

  // 检查是否是 Element Plus / Element UI 复合表格
  if (root.matches('.el-table') || root.querySelector('.el-table__header-wrapper, .el-table__body-wrapper')) {
    return parseElementTable(root);
  }

  // 回退机制：如果是普通容器且内含单个主 table
  const mainTable = root instanceof HTMLTableElement ? root : root.querySelector('table');
  if (mainTable) {
    return parseSingleHtmlTable(mainTable);
  }

  return { rows: [], rowCount: 0, colCount: 0, title: '空表格' };
}

/**
 * 深度解析 Ant Design 分离式 / 固定列表格
 */
function parseAntDesignTable(container: HTMLElement): ParsedTableData {
  // 1. 寻找表头
  // AntD 结构中，表头可能在 .ant-table-header table 或 .ant-table-thead
  let headerCells: string[] = [];
  const headerThead = container.querySelector('.ant-table-header thead, thead.ant-table-thead');
  if (headerThead) {
    const ths = Array.from(headerThead.querySelectorAll<HTMLTableCellElement>('th'));
    headerCells = ths
      .filter((th) => !th.classList.contains('ant-table-cell-scrollbar')) // 排除右侧滚动条占位
      .map(cleanCellText);
  }

  // 2. 寻找主数据行
  // 优先选取主要 body table（排除纯固定左列/右列 clone）
  const bodyRows: string[][] = [];
  const bodyTable = container.querySelector('.ant-table-body table, .ant-table-content table') || container.querySelector('table');

  if (bodyTable) {
    const trs = Array.from(bodyTable.querySelectorAll<HTMLTableRowElement>('tbody > tr'));
    trs.forEach((tr) => {
      // 排除嵌套展开行或空占位行
      if (tr.classList.contains('ant-table-placeholder') || tr.classList.contains('ant-table-expanded-row')) {
        return;
      }
      const cells = Array.from(tr.querySelectorAll<HTMLTableCellElement>(':scope > td, :scope > th'));
      if (cells.length > 0) {
        bodyRows.push(cells.map(cleanCellText));
      }
    });
  }

  // 3. 缝合表头与表体
  const allRows: string[][] = [];
  if (headerCells.length > 0) {
    allRows.push(headerCells);
  }
  allRows.push(...bodyRows);

  // 4. 计算规格并规整列宽
  const maxCols = allRows.reduce((max, r) => Math.max(max, r.length), 0);
  allRows.forEach((row) => {
    while (row.length < maxCols) row.push('');
  });

  // 获取表格标题
  const title = container.querySelector('.ant-table-title')?.textContent?.trim() || 'AntD表格数据';

  return {
    rows: allRows,
    rowCount: allRows.length,
    colCount: maxCols,
    title
  };
}

/**
 * 深度解析 Element Plus / Element UI 分离式表格
 */
function parseElementTable(container: HTMLElement): ParsedTableData {
  // 表头在 .el-table__header-wrapper table
  let headerCells: string[] = [];
  const headerTable = container.querySelector('.el-table__header-wrapper table, table.el-table__header');
  if (headerTable) {
    const ths = Array.from(headerTable.querySelectorAll<HTMLTableCellElement>('th'));
    headerCells = ths
      .filter((th) => !th.classList.contains('gutter')) // 排除滚动条占位列
      .map(cleanCellText);
  }

  // 表体在 .el-table__body-wrapper table
  const bodyRows: string[][] = [];
  const bodyTable = container.querySelector('.el-table__body-wrapper table, table.el-table__body');
  if (bodyTable) {
    const trs = Array.from(bodyTable.querySelectorAll<HTMLTableRowElement>('tbody > tr'));
    trs.forEach((tr) => {
      if (tr.classList.contains('el-table__row--striped') || tr.classList.contains('el-table__row') || tr.querySelectorAll('td').length > 0) {
        const cells = Array.from(tr.querySelectorAll<HTMLTableCellElement>(':scope > td'));
        bodyRows.push(cells.map(cleanCellText));
      }
    });
  }

  const allRows: string[][] = [];
  if (headerCells.length > 0) allRows.push(headerCells);
  allRows.push(...bodyRows);

  const maxCols = allRows.reduce((max, r) => Math.max(max, r.length), 0);
  allRows.forEach((row) => {
    while (row.length < maxCols) row.push('');
  });

  return {
    rows: allRows,
    rowCount: allRows.length,
    colCount: maxCols,
    title: 'Element表格数据'
  };
}

/**
 * 原生单体 HTML 表格解析（支持跨行跨列展开与矩阵规整）
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
 * 清洗单元格文本，并精准剥离组件库噪音节点（排序箭头、筛选下拉等）
 */
function cleanCellText(cell: HTMLTableCellElement): string {
  const clone = cell.cloneNode(true) as HTMLElement;

  // 针对 Ant Design 表头的特别清理：优先提取 .ant-table-column-title
  const antdTitle = clone.querySelector('.ant-table-column-title');
  if (antdTitle && antdTitle.textContent?.trim()) {
    return antdTitle.textContent.trim();
  }

  // 针对 Element UI 表头的特别清理：过滤 caret 排序小图标
  clone.querySelectorAll('.caret-wrapper, .el-table__column-filter-trigger').forEach((el) => el.remove());

  // 通用过滤噪音节点
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
 * 复制为制表符分隔格式 (TSV)
 */
export async function copyTableToClipboard(data: ParsedTableData): Promise<void> {
  const tsv = data.rows.map((row) => row.join('\t')).join('\n');
  await navigator.clipboard.writeText(tsv);
}
