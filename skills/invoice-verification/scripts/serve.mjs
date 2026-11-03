// 静态预览服务（用于预览 HTML 报告及其内嵌截图）
// 用法: node serve.mjs <工作目录> [端口]   默认端口 8765
// 报告文件位于 <工作目录>/发票查验报告.html，截图相对路径 screenshots/xxx.png
import { createServer } from 'http';
import { readFileSync, existsSync, statSync } from 'fs';
import path from 'path';

const ROOT = path.resolve(process.argv[2] || '.');
const PORT = Number(process.argv[3] || 8765);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = createServer((req, res) => {
  try {
    let urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (urlPath === '/') urlPath = '/发票查验报告.html';
    const fp = path.resolve(ROOT, '.' + urlPath);
    // 防止目录穿越
    if (!fp.startsWith(ROOT)) { res.writeHead(403); res.end('Forbidden'); return; }
    if (!existsSync(fp) || statSync(fp).isDirectory()) { res.writeHead(404); res.end('Not Found: ' + urlPath); return; }
    const ext = path.extname(fp).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(readFileSync(fp));
  } catch (e) {
    res.writeHead(500); res.end('Error: ' + e.message);
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`静态服务已启动: http://127.0.0.1:${PORT}/`);
  console.log('报告地址: http://127.0.0.1:' + PORT + '/%E5%8F%91%E7%A5%A8%E6%9F%A5%E9%AA%8C%E6%8A%A5%E5%91%8A.html');
});
