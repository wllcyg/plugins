import os
import struct
import zlib
import math

def create_png(width, height, rgba_data):
    # PNG 头部签名
    png = b'\x89PNG\r\n\x1a\n'
    
    # IHDR
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    ihdr_crc = zlib.crc32(b'IHDR' + ihdr_data)
    png += struct.pack('>I', len(ihdr_data)) + b'IHDR' + ihdr_data + struct.pack('>I', ihdr_crc)
    
    # 扫描线数据 (每行以 0x00 Filter byte 开头)
    raw_data = bytearray()
    for y in range(height):
        raw_data.append(0)  # Filter type None
        row_start = y * width * 4
        raw_data.extend(rgba_data[row_start : row_start + width * 4])
        
    compressed = zlib.compress(bytes(raw_data), 9)
    idat_crc = zlib.crc32(b'IDAT' + compressed)
    png += struct.pack('>I', len(compressed)) + b'IDAT' + compressed + struct.pack('>I', idat_crc)
    
    # IEND
    iend_crc = zlib.crc32(b'IEND')
    png += struct.pack('>I', 0) + b'IEND' + struct.pack('>I', iend_crc)
    return png

def render_table_icon(size):
    buf = bytearray(size * size * 4)
    radius = max(2, int(size * 0.22))
    pad = max(1, int(size * 0.06))
    
    # 绿色渐变颜色
    c_top = (16, 185, 129, 255)     # #10b981
    c_bottom = (4, 120, 87, 255)    # #047857
    
    def set_pixel(x, y, r, g, b, a):
        if 0 <= x < size and 0 <= y < size:
            idx = (y * size + x) * 4
            # 简单 Alpha 混合
            src_a = a / 255.0
            dst_a = buf[idx + 3] / 255.0
            out_a = src_a + dst_a * (1 - src_a)
            if out_a > 0:
                out_r = (r * src_a + buf[idx] * dst_a * (1 - src_a)) / out_a
                out_g = (g * src_a + buf[idx + 1] * dst_a * (1 - src_a)) / out_a
                out_b = (b * src_a + buf[idx + 2] * dst_a * (1 - src_a)) / out_a
                buf[idx] = int(out_r)
                buf[idx + 1] = int(out_g)
                buf[idx + 2] = int(out_b)
                buf[idx + 3] = int(out_a * 255)

    # 1. 渲染圆角矩形背景
    for y in range(size):
        ratio = y / size
        curr_r = int(c_top[0] * (1 - ratio) + c_bottom[0] * ratio)
        curr_g = int(c_top[1] * (1 - ratio) + c_bottom[1] * ratio)
        curr_b = int(c_top[2] * (1 - ratio) + c_bottom[2] * ratio)
        
        for x in range(size):
            # 判断是否在圆角矩形内 (带抗锯齿距离计算)
            dx = max(pad + radius - x, 0, x - (size - 1 - pad - radius))
            dy = max(pad + radius - y, 0, y - (size - 1 - pad - radius))
            dist = math.sqrt(dx * dx + dy * dy)
            if dist <= radius:
                # 边缘抗锯齿
                alpha = min(1.0, max(0.0, radius - dist + 0.5))
                set_pixel(x, y, curr_r, curr_g, curr_b, int(255 * alpha))
                
    # 2. 渲染内部表格线
    inner_pad = int(size * 0.22)
    inner_w = size - 2 * inner_pad
    inner_h = size - 2 * inner_pad
    border_th = max(1, int(size * 0.065))
    
    # 外部网格边框
    for y in range(inner_pad, inner_pad + inner_h):
        for x in range(inner_pad, inner_pad + inner_w):
            is_border = (x < inner_pad + border_th or 
                         x >= inner_pad + inner_w - border_th or 
                         y < inner_pad + border_th or 
                         y >= inner_pad + inner_h - border_th)
            
            # 横向分割线 (表头)
            row_y = inner_pad + int(inner_h * 0.38)
            is_row = (row_y <= y < row_y + border_th)
            
            # 纵向分割线 (列)
            col_x = inner_pad + int(inner_w * 0.44)
            is_col = (col_x <= x < col_x + border_th)
            
            if is_border or is_row or is_col:
                set_pixel(x, y, 255, 255, 255, 240)
            elif size >= 32 and x > col_x + border_th and y > row_y + border_th:
                # 右下角单元格微高亮
                set_pixel(x, y, 255, 255, 255, 70)

    # 3. 如果尺寸较大 (>= 48)，在右下角绘制精致的导出下载箭头
    if size >= 48:
        arrow_cx = inner_pad + int(inner_w * 0.72)
        arrow_cy = inner_pad + int(inner_h * 0.70)
        arrow_h = int(size * 0.14)
        
        # 竖杆
        th = max(1, int(size * 0.04))
        for dy in range(-arrow_h // 2, arrow_h // 2):
            for dx in range(-th // 2, th // 2 + 1):
                set_pixel(arrow_cx + dx, arrow_cy + dy, 255, 255, 255, 255)
        # 箭头头部
        head_s = int(size * 0.07)
        for d in range(head_s):
            for t in range(th):
                set_pixel(arrow_cx - d + t, arrow_cy + arrow_h // 2 - d, 255, 255, 255, 255)
                set_pixel(arrow_cx + d - t, arrow_cy + arrow_h // 2 - d, 255, 255, 255, 255)

    return create_png(size, size, buf)

def main():
    out_dir = r"d:\self\plugins\apps\ext-table-export\public\icons"
    os.makedirs(out_dir, exist_ok=True)
    for s in [16, 32, 48, 128]:
        png_data = render_table_icon(s)
        path = os.path.join(out_dir, f"icon-{s}.png")
        with open(path, "wb") as f:
            f.write(png_data)
        print(f"Generated {path} ({len(png_data)} bytes)")

if __name__ == "__main__":
    main()

