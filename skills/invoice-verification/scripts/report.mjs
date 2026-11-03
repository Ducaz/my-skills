// 发票查验报告生成（HTML）
// 用法: node report.mjs <工作目录> [报告文件名]
//   读取 <工作目录>/invoices.json + results.json，输出 <工作目录>/发票查验报告.html
//   报告内嵌 screenshots/ 相对路径截图，配合 serve.mjs 预览或本地直接打开
import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';

const DIR = path.resolve(process.argv[2] || '.');
const OUT = path.join(DIR, process.argv[3] || '发票查验报告.html');

const invoices = JSON.parse(readFileSync(path.join(DIR, 'invoices.json'), 'utf-8'));
const allPath = path.join(DIR, 'results.json');
const all = existsSync(allPath) ? JSON.parse(readFileSync(allPath, 'utf-8')) : {};

function norm(status) {
  if (status.startsWith('一致')) return '一致';
  if (status.startsWith('不一致')) return '不一致';
  if (status.startsWith('查无')) return '查无此票';
  if (status.includes('超过')) return '超过每日次数';
  if (status.startsWith('平台不支持')) return '平台不支持';
  if (status.startsWith('需补充数据')) return '需补充数据';
  return null; // 失败/待重试
}
const CATS = ['一致', '不一致', '查无此票', '超过每日次数', '平台不支持', '需补充数据', '待重试', '未查验'];
const statusCount = {}; CATS.forEach(c => statusCount[c] = 0);

const rows = invoices.map(inv => {
  const r = all[inv.seq];
  let status, shot = '', dialogText = '';
  if (!r) { status = '未查验'; statusCount['未查验']++; }
  else {
    const n = norm(r.status);
    if (n) { status = n; statusCount[n]++; }
    else { status = '待重试'; statusCount['待重试']++; }
    shot = r.screenshot || '';
    dialogText = r.dialogText || '';
  }
  return { ...inv, status, shot, dialogText };
});

const stCls = { '一致': 'ok', '不一致': 'bad', '查无此票': 'bad', '平台不支持': 'gray', '需补充数据': 'amber', '待重试': 'todo', '未查验': 'todo', '超过每日次数': 'todo' };
const htmlRows = rows.map(r => {
  const cls = stCls[r.status] || 'bad';
  const shotName = r.shot ? path.basename(r.shot) : '';
  const shotCell = shotName
    ? `<details><summary>查看</summary><img src="screenshots/${shotName}" style="max-width:860px"></details>`
    : (r.dialogText ? `<span class="note">${r.dialogText}</span>` : '—');
  return `<tr><td>${r.seq}</td><td>${r.type}</td><td class="mono">${r.number}</td><td class="mono">${r.code || '—'}</td><td>${r.date}</td><td>${r.seller || '—'}</td><td>¥${r.amountTotal || r.amountNoTax || '—'}</td><td class="st ${cls}">${r.status}</td><td>${shotCell}</td></tr>`;
}).join('\n');

const checked = statusCount['一致'] + statusCount['不一致'] + statusCount['查无此票'] + statusCount['超过每日次数'];
const summary = Object.entries(statusCount).filter(([k, v]) => v > 0).map(([k, v]) => `${k}：<b>${v}</b>`).join('　');
const finished = statusCount['未查验'] === 0 && statusCount['待重试'] === 0;
const title = finished ? '发票查验报告' : '发票查验报告（中期）';

const html = `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8"><title>${title}</title>
<style>
body{font-family:"Microsoft YaHei",sans-serif;margin:24px;background:#f7f8fa;color:#222}
h1{font-size:22px}
h2{font-size:17px;margin-top:28px}
.meta{color:#666;margin:8px 0 4px;font-size:14px}
.cards{display:flex;gap:12px;margin:16px 0;flex-wrap:wrap}
.card{background:#fff;border:1px solid #e3e6ea;border-radius:8px;padding:12px 20px;min-width:110px}
.card .num{font-size:26px;font-weight:bold}
.card.ok .num{color:#1a7f37}.card.bad .num{color:#c0392b}.card.gray .num{color:#888}.card.amber .num{color:#b08800}.card.todo .num{color:#b08800}
table{border-collapse:collapse;width:100%;background:#fff;font-size:13px}
th,td{border:1px solid #e3e6ea;padding:6px 8px;text-align:left;vertical-align:top}
th{background:#f0f4f8;position:sticky;top:0}
tr:nth-child(even){background:#fafbfc}
.mono{font-family:Consolas,monospace;font-size:12px}
.st{font-weight:bold;white-space:nowrap}
.st.ok{color:#1a7f37}.st.bad{color:#c0392b}.st.todo{color:#b08800}.st.gray{color:#888}.st.amber{color:#b08800}
details summary{cursor:pointer;color:#1667c9}
img{border:1px solid #ddd;margin-top:6px}
.note{color:#888;font-size:12px}
.findings{background:#fff;border:1px solid #e3e6ea;border-radius:8px;padding:16px 20px;margin:12px 0;line-height:1.9;font-size:14px}
.findings li{margin:4px 0}
</style></head><body>
<h1>${title}</h1>
<div class="meta">生成时间：${new Date().toLocaleString('zh-CN')}　｜　查验平台：国家税务总局全国增值税发票查验平台（inv-veri.chinatax.gov.cn）　｜　台账共 ${invoices.length} 张</div>
<div class="cards">
<div class="card"><div class="num">${invoices.length}</div>台账总数</div>
<div class="card ok"><div class="num">${checked}</div>已实际查验</div>
<div class="card ok"><div class="num">${statusCount['一致']}</div>查验一致</div>
<div class="card bad"><div class="num">${statusCount['不一致'] + statusCount['查无此票']}</div>不一致/查无此票</div>
<div class="card gray"><div class="num">${statusCount['平台不支持']}</div>平台不支持</div>
<div class="card amber"><div class="num">${statusCount['需补充数据'] + statusCount['待重试'] + statusCount['未查验']}</div>待处理</div>
</div>
<div class="meta">结果统计：${summary}</div>

<h2>核心结论</h2>
<div class="findings">
<ol>
<li><b>已实际查验 ${checked} 张，其中 ${statusCount['一致']} 张查验一致，${statusCount['不一致'] + statusCount['查无此票']} 张不一致/查无此票。</b></li>
<li><b>${statusCount['平台不支持']} 张无法在该平台查验</b>：区块链电子发票不接入全国增值税底账库，需到开具地区的电子税务局平台查验；纸质车票不属于增值税发票。</li>
<li>${statusCount['需补充数据'] > 0 ? `<b>${statusCount['需补充数据']} 张老式税控票需补充校验码</b>：该平台对此类票要求填写"校验码后6位"（印在发票票面右上角），台账中未包含此字段。如需查验请补充提供。` : '台账中无老式税控票，无需校验码。'}</li>
</ol>
</div>

<h2>明细清单（${invoices.length} 张）</h2>
<table>
<tr><th>#</th><th>类型</th><th>发票号码</th><th>发票代码</th><th>开票日期</th><th>销售方</th><th>价税合计</th><th>查验结果</th><th>结果截图/说明</th></tr>
${htmlRows}
</table>
<p class="meta">说明：状态"一致"表示平台返回完整发票详情（即"经查验，发票信息一致"），每张可点击"查看"展开平台查验结果页截图。</p>
</body></html>`;

writeFileSync(OUT, html);
console.log('报告已生成:', OUT);
console.log('统计:', summary);
