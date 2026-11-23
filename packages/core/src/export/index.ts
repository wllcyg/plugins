/**
 * 数据导出基础工具函数
 */

/**
 * 触发浏览器本地下载
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * 导出 CSV 数据文件（添加 UTF-8 BOM 防中文乱码）
 */
export function exportCsv(rows: string[][], filename: string): void {
  const escapeCell = (cell: string): string => {
    if (cell.includes('"') || cell.includes(',') || cell.includes('\n')) {
      return `"${cell.replace(/"/g, '""')}"`;
    }
    return cell;
  };

  const csvContent = rows.map((row) => row.map(escapeCell).join(',')).join('\r\n');
  const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
  const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`);
}

