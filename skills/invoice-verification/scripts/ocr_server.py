# -*- coding: utf-8 -*-
"""发票查验验证码 OCR 服务：按指定颜色提取字符并识别
用法: python ocr_server.py [端口]   默认 8731
依赖: flask numpy opencv-python ddddocr（见 setup_env.mjs）
接口:
  POST /ocr    {image: base64或data:, color: "红色"|null} -> {ok, results:{color,count,raw}}
  GET  /health -> {ok: true}
"""
import sys
import base64
import numpy as np
import cv2
import ddddocr
from flask import Flask, request, jsonify

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8731

app = Flask(__name__)
ocr = ddddocr.DdddOcr(show_ad=False)


def masks_by_color(hsv):
    """平台验证码字符颜色 -> HSV 掩码。主色4种+备用3种。"""
    h, s, v = hsv[:, :, 0], hsv[:, :, 1], hsv[:, :, 2]
    return {
        '黑色': (v < 70).astype(np.uint8) * 255,
        '红色': (((h <= 10) | (h >= 170)) & (s > 120) & (v > 60)).astype(np.uint8) * 255,
        # Bright blue strokes can have V=255; a v<240 bound removes glyphs.
        '蓝色': (((h >= 95) & (h <= 140)) & (s > 70) & (v > 45)).astype(np.uint8) * 255,
        '绿色': (((h >= 35) & (h <= 90)) & (s > 140) & (v > 60)).astype(np.uint8) * 255,
        '紫色': (((h >= 136) & (h <= 165)) & (s > 100) & (v > 60)).astype(np.uint8) * 255,
        '橙色': (((h >= 11) & (h <= 25)) & (s > 150) & (v > 60)).astype(np.uint8) * 255,
        '黄色': (((h >= 26) & (h <= 34)) & (s > 150) & (v > 60)).astype(np.uint8) * 255,
    }


def solid_chars(mask):
    """掩码 -> 实心字符图(黑字白底)与字符个数。外轮廓填充+连通域形状过滤。"""
    k2 = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
    mask = cv2.dilate(mask, k2, iterations=1)
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    solid = np.zeros_like(mask)
    for c in contours:
        cv2.drawContours(solid, [c], -1, 255, thickness=cv2.FILLED)
    n, labels, stats, _ = cv2.connectedComponentsWithStats(solid, 8)
    out = np.zeros_like(solid)
    count = 0
    for i in range(1, n):
        area = stats[i, cv2.CC_STAT_AREA]
        w, hgt = stats[i, cv2.CC_STAT_WIDTH], stats[i, cv2.CC_STAT_HEIGHT]
        if area < 60 or w < 8 or hgt < 8:
            continue
        if (w > 45 or hgt > 40) and area / max(1, w * hgt) < 0.18:
            continue  # 过滤大面积低占比噪点
        out[labels == i] = 255
        count += 1
    return out, count


@app.route('/ocr', methods=['POST'])
def ocr_api():
    data = request.get_json(force=True, silent=True) or {}
    img_b64 = data.get('image', '')
    color = data.get('color')  # 页面要求的颜色，可能为 None
    if img_b64.startswith('data:'):
        img_b64 = img_b64.split(',', 1)[-1]
    try:
        raw = base64.b64decode(img_b64)
        nparr = np.frombuffer(raw, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        results = {}
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        masks = masks_by_color(hsv)
        if color and color in masks:
            solid, count = solid_chars(masks[color])
            ok, buf = cv2.imencode('.png', 255 - solid)
            candidates = [ocr.classification(buf.tobytes())]
            if not candidates[0] or (count > 0 and len(candidates[0]) != count):
                for source in (solid, masks[color]):
                    for scale in (2, 3):
                        enlarged = cv2.resize(255 - source, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
                        candidates.append(ocr.classification(cv2.imencode('.png', enlarged)[1].tobytes()))
            matching = [value for value in candidates if value and count > 0 and len(value) == count]
            results['color'] = matching[0] if matching else next((value for value in candidates if value), '')
            results['count'] = count
        # 原图全量识别（兜底/备用）
        results['raw'] = ocr.classification(raw)
        return jsonify({'ok': True, 'results': results})
    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)}), 500


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'ok': True})


if __name__ == '__main__':
    print(f'OCR 服务启动于 http://127.0.0.1:{PORT}')
    app.run(host='127.0.0.1', port=PORT, threaded=True)
