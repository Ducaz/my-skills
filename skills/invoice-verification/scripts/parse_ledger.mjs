// 发票台账 CSV -> invoices.json
// 用法: node parse_ledger.mjs <csv路径> <输出json路径>
// 支持 GBK / UTF-8 / UTF-8 BOM 自动检测；字段名按常见发票台账列名匹配，可用 --map 覆盖。
import { readFileSync, writeFileSync } from 'fs';

const csvPath = process.argv[2];
const outPath = process.argv[3];
if (!csvPath || !outPath) {
  console.error('用法: node parse_ledger.mjs <csv路径> <输出json路径>');
  process.exit(1);
}

const buf = readFileSync(csvPath);
function decode(b) {
  for (const enc of ['utf-8', 'gbk', 'gb18030']) {
    try {
      const t = new TextDecoder(enc, { fatal: true }).decode(b).replace(/^\uFEFF/, '');
      if (t.includes('发票')) return t;
    } catch (e) {}
  }
  return new TextDecoder('gb18030').decode(b).replace(/^\uFEFF/, '');
}
const raw = decode(buf);
const lines = raw.replace(/\r/g, '').split('\n').filter(l => l.trim());

function parseLine(line) {
  const fields = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (c === ',' && !inQ) { fields.push(cur); cur = ''; }
    else cur += c;
  }
  fields.push(cur);
  // 去掉字段内首尾的制表符与空白（部分导出工具会填充 \t）
  return fields.map(f => f.replace(/^\t+|\t+$/g, '').trim());
}

const cols = parseLine(lines[0]);
const idx = {};
cols.forEach((c, i) => idx[c] = i);
// 常见列名别名映射（优先精确匹配，其次别名）
function findCol(...names) {
  for (const n of names) if (idx[n] !== undefined) return idx[n];
  for (const n of names) {
    const hit = cols.findIndex(c => c.includes(n));
    if (hit >= 0) return hit;
  }
  return -1;
}
const C = {
  type: findCol('发票类型', '票据类型'),
  date: findCol('开票日期'),
  code: findCol('发票代码'),
  number: findCol('发票号码'),
  seller: findCol('销售方', '开票方', '销售方名称'),
  amountNoTax: findCol('不含税金额', '不含税价', '金额'),
  tax: findCol('税额合计', '税额'),
  amountTotal: findCol('价税合计', '含税金额', '总额'),
  checksumCode: findCol('校验码', '校验码后六位', '校验码后6位'),
  status: findCol('是否有效', '查验状态'),
};

const invoices = [];
for (let i = 1; i < lines.length; i++) {
  const f = parseLine(lines[i]);
  const g = ci => (ci >= 0 && f[ci] !== undefined) ? f[ci].trim() : '';
  const num = g(C.number);
  if (!num) continue;
  invoices.push({
    seq: invoices.length + 1,
    type: g(C.type),
    date: g(C.date),        // YYYY-MM-DD
    code: g(C.code),
    number: num,
    seller: g(C.seller),
    amountNoTax: g(C.amountNoTax),
    tax: g(C.tax),
    amountTotal: g(C.amountTotal),
    checksumCode: g(C.checksumCode),  // 老式税控票查验需校验码后6位
    ledgerStatus: g(C.status),
  });
}

writeFileSync(outPath, JSON.stringify(invoices, null, 2));
const byType = {};
invoices.forEach(v => { byType[v.type] = (byType[v.type] || 0) + 1; });
console.log('解析完成:', invoices.length, '张 ->', outPath);
console.log('按类型:', JSON.stringify(byType));
console.log('全电票(无发票代码):', invoices.filter(v => !v.code).length);
console.log('无价税合计金额:', invoices.filter(v => !v.amountTotal && !v.amountNoTax).length);
