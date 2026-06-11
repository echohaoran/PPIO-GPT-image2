#!/usr/bin/env python3
"""生成 logo 内联 base64 数据文件"""
import base64, io
from PIL import Image
from pathlib import Path

PROJECT = Path(__file__).parent.parent
ASSETS = PROJECT / 'assets'
OUTPUT = PROJECT / 'js' / 'logo_data.js'

logos = []
for i in range(1, 6):
    path = ASSETS / f'logo_{i}.png'
    img = Image.open(str(path))
    # resize to width 400 (keep aspect ratio)
    ratio = 400 / img.width
    new_h = int(img.height * ratio)
    small = img.resize((400, new_h), Image.LANCZOS)
    buf = io.BytesIO()
    small.save(buf, format='PNG', optimize=True)
    b64 = base64.b64encode(buf.getvalue()).decode('ascii')
    logos.append(f"  'assets/logo_{i}.png': 'data:image/png;base64,{b64}'")
    print(f"logo_{i}.png: {img.width}x{img.height} -> 400x{new_h}, b64={len(b64)} chars")

content = '// Auto-generated logo data URLs\nconst LOGO_DATA_URLS = {\n' + ',\n'.join(logos) + '\n};\n'
OUTPUT.write_text(content)
print(f"\nWritten to {OUTPUT} ({OUTPUT.stat().st_size} bytes)")
