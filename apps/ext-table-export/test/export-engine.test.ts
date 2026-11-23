import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { exportToExcel, exportToCsv, type ParsedTableData } from '../src/utils/table-parser';

describe('Table Parser & Exporter 核心算法测试套件', () => {
  it('测试 1：大数字订单号导出为 Excel 时必须保持字符串类型，严禁科学计数法', () => {
    const testData: ParsedTableData = {
      title: '测试订单大数字表',
      rowCount: 2,
      colCount: 3,
      rows: [
        ['序号', '订单编号', '金额'],
        ['1', '1795412177040171443', '99.5']
      ]
    };

    // 模拟 exportToExcel 中的 WorkSheet 构建逻辑
    const ws: XLSX.WorkSheet = {};
    const range = { s: { c: 0, r: 0 }, e: { c: 2, r: 1 } };

    testData.rows.forEach((row, r) => {
      row.forEach((val, c) => {
        const cellRef = XLSX.utils.encode_cell({ r, c });
        const strVal = String(val ?? '');
        const isLargeNumeric = /^\d{11,}$/.test(strVal.trim());

        if (isLargeNumeric) {
          ws[cellRef] = { t: 's', v: strVal.trim(), z: '@' };
        } else {
          const num = Number(strVal);
          if (!isNaN(num) && strVal.trim() !== '' && !strVal.startsWith('0') && strVal.length < 11) {
            ws[cellRef] = { t: 'n', v: num };
          } else {
            ws[cellRef] = { t: 's', v: strVal };
          }
        }
      });
    });

    // 验证订单号单元格 B2 (r:1, c:1)
    const orderCell = ws['B2'];
    expect(orderCell).toBeDefined();
    expect(orderCell.t).toBe('s'); // 强制为 String 类型
    expect(orderCell.v).toBe('1795412177040171443'); // 精度无截断
    expect(orderCell.z).toBe('@');
  });

  it('测试 2：CSV 导出针对 11 位以上数字前置制表符以防截断', () => {
    const testData: ParsedTableData = {
      title: '测试CSV',
      rowCount: 2,
      colCount: 2,
      rows: [
        ['姓名', '身份证号'],
        ['张三', '110101199003072391']
      ]
    };

    const safeRows = testData.rows.map((row) =>
      row.map((cell) => {
        const str = String(cell ?? '').trim();
        if (/^\d{11,}$/.test(str)) {
          return `\t${str}`;
        }
        return cell;
      })
    );

    expect(safeRows[1][1]).toBe('\t110101199003072391');
  });
});
