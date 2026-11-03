// 发票查验主脚本（通用版）
// 用法: node check.mjs <工作目录> [from] [to] [输出文件名]
//   工作目录需包含 invoices.json（由 parse_ledger.mjs 生成），自动创建 screenshots/ 与结果文件
//   环境变量: OCR_URL(默认 http://127.0.0.1:8731/ocr)  PLAYWRIGHT_BASE(可选)  MAX_ATTEMPTS(默认12)
// 前置: OCR 服务已启动(ocr_server.py)、playwright 已安装(setup_env.mjs)
import { createRequire } from 'module';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';
import os from 'os';

const DIR = path.resolve(process.argv[2] || '.');
const OCR_URL = process.env.OCR_URL || 'http://127.0.0.1:8731/ocr';
const MAX_ATTEMPTS = Number(process.env.MAX_ATTEMPTS || 12);

const invoicesPath = path.join(DIR, 'invoices.json');
if (!existsSync(invoicesPath)) {
  console.error('未找到', invoicesPath, '，请先运行 parse_ledger.mjs 解析台账');
  process.exit(1);
}
const invoices = JSON.parse(readFileSync(invoicesPath, 'utf-8'));
const from = Number(process.argv[3] || 1);
const to = Number(process.argv[4] || invoices.length);
const OUT = path.join(DIR, process.argv[5] || 'results.json');
mkdirSync(path.join(DIR, 'screenshots'), { recursive: true });

// ---- playwright 加载（多候选路径） ----
function loadPlaywright() {
  const candidates = [
    process.env.PLAYWRIGHT_BASE,
    path.join(os.homedir(), '.workbuddy/binaries/node/workspace'),
    DIR,
    process.cwd(),
  ].filter(Boolean);
  for (const base of candidates) {
    try {
      const req = createRequire(path.join(base, 'noop.js'));
      return req('playwright').chromium;
    } catch (e) { /* try next */ }
  }
  console.error('找不到 playwright 模块。请先运行: node setup_env.mjs');
  process.exit(1);
}
const chromium = loadPlaywright();

// ---- 结果存储（支持分片：非主文件时以 results.json 为种子，跳过已完成） ----
let results = {};
if (existsSync(OUT)) results = JSON.parse(readFileSync(OUT, 'utf-8'));
const MAIN = path.join(DIR, 'results.json');
if (OUT !== MAIN && existsSync(MAIN)) {
  const seed = JSON.parse(readFileSync(MAIN, 'utf-8'));
  for (const [k, v] of Object.entries(seed)) if (!results[k]) results[k] = v;
}
const saveResults = () => writeFileSync(OUT, JSON.stringify(results, null, 2));
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---- OCR 服务 ----
async function ocrHealth() {
  try {
    const r = await fetch(OCR_URL.replace(/\/ocr$/, '/health'), { signal: AbortSignal.timeout(3000) });
    return r.ok;
  } catch (e) { return false; }
}
async function ocrCaptcha(b64, color) {
  const resp = await fetch(OCR_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: b64, color: color || null }),
  });
  return await resp.json();
}

// ---- 预检：票种与字段修正 ----
function preflight(inv) {
  // 区块链电子发票不接入全国底账库
  if (/区块链/.test(inv.type)) {
    return { status: '平台不支持查验:区块链发票不接入全国底账库,需在开具地区电子税务局查验', dialogText: '区块链电子发票未接入全国增值税发票查验平台' };
  }
  // 纸质车票（号码非20位数字，如 A041880）
  if (!/^\d{20}$/.test(inv.number) && /动车|高铁|火车|客运/.test(inv.type)) {
    return { status: '平台不支持查验:纸质车票非增值税发票,无法在发票查验平台查验', dialogText: `票号${inv.number}为纸质车票,不属于增值税发票范畴` };
  }
  // 数电票"伪发票代码"修正：代码列被误填为20位号码本身
  if (inv.code && inv.code === inv.number && /^\d{20}$/.test(inv.code)) {
    console.log(`  [预检] #${inv.seq} 发票代码列=号码(数电票误填)，已清空代码字段`);
    inv.code = '';
  }
  // 老式税控票（有发票代码）平台要求"校验码后6位"，无校验码则无法查验
  if (inv.code && !inv.checksumCode) {
    return { status: '需补充数据:老式税控票查验需校验码后6位,台账无此字段', dialogText: '平台表单要求填写校验码后6位(发票票面右上角),台账未包含该字段,无法自动查验' };
  }
  return null;
}

async function readDialogText(page) {
  try {
    const dlgs = page.locator('.t-dialog');
    const n = await dlgs.count();
    for (let i = 0; i < n; i++) {
      const d = dlgs.nth(i);
      if (await d.isVisible()) {
        const txt = (await d.textContent() || '').trim();
        if (txt) return txt.slice(0, 800);
      }
    }
  } catch (e) {}
  return null;
}
function isResultDialog(txt) {
  return !!txt && (/发票详情/.test(txt) || /查验结果/.test(txt) || /当日查验次数/.test(txt));
}
function isTipDialog(txt) {
  return !!txt && !isResultDialog(txt) && /提示|确定/.test(txt);
}
async function closeDialog(page) {
  try {
    const txt = await readDialogText(page);
    if (txt && isTipDialog(txt)) {
      const okBtn = page.locator('.t-dialog button').filter({ hasText: /确定|确认|关闭/ }).first();
      if (await okBtn.count()) await okBtn.click({ timeout: 3000 });
      else await page.keyboard.press('Escape');
      await sleep(500);
      return txt;
    }
  } catch (e) {}
  return null;
}

async function pickDate(page, dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateInput = page.locator('input.t-input__inner').nth(2);
  await dateInput.click();
  await sleep(800);
  if (!(await page.locator('.t-date-picker__panel').count())) { await dateInput.click(); await sleep(800); }
  const yearSel = page.locator('.t-date-picker__header-controller-year input').first();
  const curYear = Number((await yearSel.inputValue()).replace(/\D/g, ''));
  if (curYear !== y) {
    await yearSel.click(); await sleep(500);
    await page.locator('.t-select-option').filter({ hasText: new RegExp(`^${y}$`) }).first().click();
    await sleep(400);
  }
  const monthSel = page.locator('.t-date-picker__header-controller-month input').first();
  const curMonth = Number(((await monthSel.inputValue()).match(/\d+/) || [0])[0]);
  if (curMonth !== m) {
    await monthSel.click(); await sleep(500);
    await page.locator('.t-select-option').filter({ hasText: new RegExp(`^${m}\\s*月$`) }).first().click();
    await sleep(400);
  }
  await page.locator('td.t-date-picker__cell:not(.t-date-picker__cell--additional)').filter({ hasText: new RegExp(`^${d}$`) }).first().click();
  await sleep(300);
  return await dateInput.inputValue();
}

async function getHintColor(page) {
  const txt = await page.evaluate(() => document.body.innerText);
  const m = txt.match(/验证码图片中\s*的?\s*(黑色|红色|蓝色|绿色|紫色|橙色|黄色|粉色)/);
  return m ? m[1] : null;
}

// ---- 启动检查 ----
if (!(await ocrHealth())) {
  console.error('OCR 服务不可达:', OCR_URL, '——请先启动 ocr_server.py');
  process.exit(1);
}
console.log(`查验范围 #${from}-#${to}，共 ${to - from + 1} 张，结果写入`, path.basename(OUT));

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
  viewport: { width: 1440, height: 900 },
  locale: 'zh-CN',
});

for (let i = from; i <= to; i++) {
  const inv = invoices[i - 1];
  if (!inv) continue;
  const tag = `#${inv.seq} ${inv.number}`;
  const prev = results[inv.seq];
  const suppliedChecksum = prev?.status.startsWith('需补充数据') && !!inv.checksumCode;
  if (prev && !suppliedChecksum && /^(一致|不一致|查无此票|超过每日查验次数|平台不支持查验|需补充数据)/.test(prev.status)) { console.log(`${tag} 已有结果，跳过`); continue; }

  console.log(`\n=== ${tag} [${inv.type}] ${inv.date} ===`);
  const rec = { seq: inv.seq, number: inv.number, type: inv.type, date: inv.date, status: 'unknown', dialogText: '', screenshot: '' };

  // 预检：不可查验票种直接标记
  const pf = preflight(inv);
  if (pf) {
    rec.status = pf.status;
    rec.dialogText = pf.dialogText;
    results[inv.seq] = rec;
    saveResults();
    console.log(`  >> 预检标记: ${rec.status}`);
    continue;
  }

  const page = await ctx.newPage();
  try {
    await page.goto('https://inv-veri.chinatax.gov.cn/fpcygzfw/national-invoice-check', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(3500);

    const inputs = page.locator('input.t-input__inner');
    if (inv.code) await inputs.nth(0).fill(inv.code);
    await inputs.nth(1).fill(inv.number);
    const dv = await pickDate(page, inv.date);
    console.log('  date:', dv);
    // 金额/校验码字段：
    //   有发票代码(老式税控票) -> 第4字段为"校验码后6位"
    //   无发票代码(数电票)     -> 第4字段填价税合计
    let field4;
    if (inv.code) {
      field4 = String(inv.checksumCode).slice(-6);
    } else {
      field4 = (inv.amountTotal && inv.amountTotal !== '0') ? inv.amountTotal : inv.amountNoTax;
    }
    await inputs.nth(3).fill(String(field4));
    await sleep(300);

    const captchaImg = page.locator('img[style*="cursor"]').first();
    const yzmInput = inputs.nth(4);
    let verified = false;
    let lastDialog = '';
    let pendingSrc = null; // 服务端静默刷新后的新验证码，可直接复用
    let loadFails = 0;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS && !verified; attempt++) {
      // 先回收上一次提交迟到的结果弹窗
      const preDlg = await readDialogText(page);
      if (preDlg && isResultDialog(preDlg)) {
        const shot = path.join(DIR, 'screenshots', `${String(inv.seq).padStart(3, '0')}_${inv.number}.png`);
        await page.screenshot({ path: shot, fullPage: false });
        rec.screenshot = shot;
        const full = (await page.evaluate(() => document.body.innerText)) + '\n' + preDlg;
        rec.dialogText = (full.match(/查验结果[:：][^,，|]{0,30}/)?.[0] || '').replace(/\s+/g, '') || preDlg.replace(/\s+/g, ' ').slice(0, 120);
        if (/不一致/.test(full)) rec.status = '不一致';
        else if (/查无此票/.test(full)) rec.status = '查无此票';
        else rec.status = '一致';
        verified = true;
        break;
      }
      await closeDialog(page);
      let src = pendingSrc;
      if (!src) {
        const prevSrc = await captchaImg.getAttribute('src');
        try {
          await captchaImg.click({ timeout: 8000 });
        } catch (e1) {
          try { await captchaImg.click({ force: true, timeout: 5000 }); }
          catch (e2) { console.log(`  [${attempt}] 验证码点击被遮挡，重试`); continue; }
        }
        src = prevSrc;
        for (let w = 0; w < 20; w++) {
          await sleep(400);
          src = await captchaImg.getAttribute('src');
          if (src && src.startsWith('data:') && src !== prevSrc) break;
        }
      }
      pendingSrc = null;
      if (!src || !src.startsWith('data:')) {
        loadFails++;
        const wait = loadFails >= 3 ? 45000 : 2000;
        console.log(`  [${attempt}] 验证码未加载(连续${loadFails}次)，等待${wait/1000}秒`);
        if (loadFails >= 3) loadFails = 0;
        await sleep(wait);
        continue;
      }
      await sleep(600);
      const submittedSrc = src;
      const color = await getHintColor(page);
      const ocr = await ocrCaptcha(src.split(',')[1], color);
      let code = '', count = -1;
      if (ocr.ok) {
        code = ocr.results.color || '';
        count = ocr.results.count ?? -1;
        if (!code || (count > 0 && code.length !== count)) {
          if (!color) code = ocr.results.raw;
        }
      }
      console.log(`  [${attempt}] 要求颜色=${color} 提取数=${count} OCR="${code}"`);
      if (!code || code.length > 5 || (count > 0 && code.length !== count)) continue;

      await yzmInput.fill(code);
      await sleep(200);
      await page.locator('button').filter({ hasText: /查\s*验/ }).first().click({ timeout: 10000 }).catch(async () => {
        await page.locator('button').filter({ hasText: /查\s*验/ }).first().click({ force: true }).catch(() => {});
      });
      // 轮询12秒：结果弹窗 或 静默刷新验证码（验证码错误无提示）
      let dlgTxt = '';
      let silentWrong = false;
      for (let w = 0; w < 15; w++) {
        await sleep(800);
        dlgTxt = (await readDialogText(page)) || '';
        if (dlgTxt) break;
        const nowSrc = await captchaImg.getAttribute('src');
        if (nowSrc && nowSrc.startsWith('data:') && nowSrc !== submittedSrc) {
          silentWrong = true;
          pendingSrc = nowSrc;
          break;
        }
      }
      lastDialog = dlgTxt || lastDialog;

      if (silentWrong) {
        console.log(`  [${attempt}] 验证码错误(静默刷新)，复用新码重试`);
        continue;
      }
      if (dlgTxt && !isResultDialog(dlgTxt) && /验证码/.test(dlgTxt) && /错误|不正确|有误/.test(dlgTxt)) {
        console.log(`  [${attempt}] 验证码错误(弹窗)，重试`);
        await closeDialog(page);
        continue;
      }
      if (!dlgTxt) {
        console.log(`  [${attempt}] 无响应，视为验证码错误重试`);
        continue;
      }
      const shot = path.join(DIR, 'screenshots', `${String(inv.seq).padStart(3, '0')}_${inv.number}.png`);
      await page.screenshot({ path: shot, fullPage: false });
      rec.screenshot = shot;
      const bodyText = await page.evaluate(() => document.body.innerText);
      const full = bodyText + '\n' + dlgTxt;
      rec.dialogText = (full.match(/查验结果[:：][^,，|]{0,30}/)?.[0] || '').replace(/\s+/g, '') || dlgTxt.replace(/\s+/g, ' ').slice(0, 120);
      if (isResultDialog(dlgTxt)) {
        if (/不一致/.test(full)) rec.status = '不一致';
        else if (/查无此票/.test(full)) rec.status = '查无此票';
        else rec.status = '一致';
        await page.locator('.t-dialog button').filter({ hasText: /关闭/ }).first().click({ timeout: 3000 }).catch(() => {});
      } else if (/超过.{0,6}5次|查验次数/.test(dlgTxt)) {
        rec.status = '超过每日查验次数';
        await closeDialog(page);
      } else if (/访问过于频繁|频繁/.test(dlgTxt)) {
        rec.status = '被限流待重试';
        console.log('  !! 平台限流，等待60秒');
        await closeDialog(page);
        await sleep(60000);
      } else if (/不支持|无法查验/.test(dlgTxt)) {
        rec.status = '平台不支持查验:' + dlgTxt.replace(/\s+/g, ' ').slice(0, 50);
        await closeDialog(page);
      } else {
        rec.status = '提示:' + dlgTxt.replace(/\s+/g, ' ').replace(/^提示/, '').trim().slice(0, 60);
        await closeDialog(page);
      }
      verified = true;
    }
    if (!verified) {
      const shot = path.join(DIR, 'screenshots', `${String(inv.seq).padStart(3, '0')}_${inv.number}_fail.png`);
      await page.screenshot({ path: shot, fullPage: false }).catch(() => {});
      rec.status = `验证码识别失败(${MAX_ATTEMPTS}次)`;
      rec.dialogText = lastDialog;
      rec.screenshot = shot;
    }
  } catch (e) {
    rec.status = '异常:' + e.message.slice(0, 80);
    await page.screenshot({ path: path.join(DIR, 'screenshots', `${String(inv.seq).padStart(3, '0')}_error.png`) }).catch(() => {});
  }
  results[inv.seq] = rec;
  saveResults();
  console.log(`  >> 结果: ${rec.status}`);
  await page.close().catch(() => {});
  await sleep(6000 + Math.random() * 4000); // 票间隔6-10秒，避免限流
}

await browser.close();
console.log('\n批次完成');
