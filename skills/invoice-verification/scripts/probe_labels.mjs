// 平台表单诊断探针：检查查验平台表单字段的实际标签与输入框结构
// 用途: 平台改版/字段变化时快速定位表单结构；确认老式税控票第4字段是否切换为"校验码后6位"
// 用法: node probe_labels.mjs [可选:发票代码]
import { createRequire } from 'module';
import { existsSync } from 'fs';
import path from 'path';
import os from 'os';

function loadPlaywright() {
  const candidates = [
    process.env.PLAYWRIGHT_BASE,
    path.join(os.homedir(), '.workbuddy/binaries/node/workspace'),
    process.cwd(),
  ].filter(Boolean);
  for (const base of candidates) {
    try {
      const req = createRequire(path.join(base, 'noop.js'));
      return req('playwright').chromium;
    } catch (e) { /* next */ }
  }
  console.error('找不到 playwright 模块，请先运行 setup_env.mjs');
  process.exit(1);
}
const chromium = loadPlaywright();
const testCode = process.argv[2] || '044002543112';

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
  viewport: { width: 1440, height: 900 }, locale: 'zh-CN',
})).newPage();

await page.goto('https://inv-veri.chinatax.gov.cn/fpcygzfw/national-invoice-check', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(4500);

const dump = async (label) => {
  const labels = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('.t-form__item, .t-form__label, label').forEach(el => {
      const t = (el.textContent || '').trim();
      if (t && t.length < 40) out.push(t);
    });
    return [...new Set(out)];
  });
  const phs = await page.evaluate(() =>
    [...document.querySelectorAll('input.t-input__inner')].map((i, n) =>
      `input${n}: placeholder="${i.placeholder}" readonly=${i.readOnly}`));
  console.log(`\n=== ${label} ===`);
  console.log('表单标签:', JSON.stringify(labels));
  console.log('输入框:\n' + phs.join('\n'));
};

await dump('默认表单（数电票模式）');

const inputs = page.locator('input.t-input__inner');
await inputs.nth(0).fill(testCode);
await page.waitForTimeout(1500);
await dump(`填入发票代码 ${testCode} 后（老式税控票模式）`);

await browser.close();
console.log('\n诊断完成。若第4字段标签含"校验码"，则老式税控票必须提供校验码后6位。');
