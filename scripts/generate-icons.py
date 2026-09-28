#!/usr/bin/env python3
"""
Генерация иконок приложения из icon-v12-bubbles-comics-indigo.png (1024×1024).
Создаёт: icon-192.png, icon-512.png, icon-maskable-512.png, apple-touch-icon.png, favicon.ico.
"""
from PIL import Image, ImageDraw
import os

SRC = '/home/z/my-project/download/icon-variants/icon-v12-bubbles-comics-indigo.png'
OUT_DIR = '/home/z/my-project/repos/random-coffee/public'

print(f'Источник: {SRC}')
img = Image.open(SRC).convert('RGBA')
print(f'Размер источника: {img.size}')

# 1. icon-192.png — обычная, 192×192, без модификаций
img_192 = img.resize((192, 192), Image.LANCZOS)
img_192.save(os.path.join(OUT_DIR, 'icon-192.png'), optimize=True)
print(f'✓ icon-192.png ({os.path.getsize(os.path.join(OUT_DIR, "icon-192.png"))} bytes)')

# 2. icon-512.png — обычная, 512×512
img_512 = img.resize((512, 512), Image.LANCZOS)
img_512.save(os.path.join(OUT_DIR, 'icon-512.png'), optimize=True)
print(f'✓ icon-512.png ({os.path.getsize(os.path.join(OUT_DIR, "icon-512.png"))} bytes)')

# 3. icon-maskable-512.png — maskable: контент в центре 80% (safe zone для Android)
# Android может обрезать иконку по кругу/скруглённому квадрату, поэтому
# вставляем оригинал в центре с отступом 10% с каждой стороны на фон в цвет приложения.
MASKABLE_SIZE = 512
SAFE_RATIO = 0.80  # safe zone — 80% центра
BG_COLOR = (99, 102, 241, 255)  # indigo-500 #6366f1 (близко к фону иконки)

# Создаём фон (заполняем всю площадь) — нужно для корректной обрезки на Android
maskable = Image.new('RGBA', (MASKABLE_SIZE, MASKABLE_SIZE), BG_COLOR)
# Уменьшаем оригинал до 80% и вставляем по центру
inner_size = int(MASKABLE_SIZE * SAFE_RATIO)
img_inner = img.resize((inner_size, inner_size), Image.LANCZOS)
offset = (MASKABLE_SIZE - inner_size) // 2
maskable.paste(img_inner, (offset, offset), img_inner)
maskable.save(os.path.join(OUT_DIR, 'icon-maskable-512.png'), optimize=True)
print(f'✓ icon-maskable-512.png ({os.path.getsize(os.path.join(OUT_DIR, "icon-maskable-512.png"))} bytes)')

# 4. apple-touch-icon.png — 180×180, без прозрачности (iOS не любит alpha)
# iOS показывает иконку на скруглённом квадрате, без обрезки.
# Ставим на непрозрачный фон indigo-500.
APPLE_SIZE = 180
apple = Image.new('RGBA', (APPLE_SIZE, APPLE_SIZE), BG_COLOR)
img_apple = img.resize((APPLE_SIZE, APPLE_SIZE), Image.LANCZOS)
apple.paste(img_apple, (0, 0), img_apple)
# Flatten to RGB (без alpha канала — iOS не любит)
apple_rgb = Image.new('RGB', (APPLE_SIZE, APPLE_SIZE), (99, 102, 241))
apple_rgb.paste(apple, (0, 0), apple)
apple_rgb.save(os.path.join(OUT_DIR, 'apple-touch-icon.png'), optimize=True)
print(f'✓ apple-touch-icon.png ({os.path.getsize(os.path.join(OUT_DIR, "apple-touch-icon.png"))} bytes)')

# 5. favicon.ico — несколько размеров в одном .ico файле (16, 32, 48)
ICO_SIZES = [(16, 16), (32, 32), (48, 48)]
favicon_path = os.path.join(OUT_DIR, 'favicon.ico')
img.save(favicon_path, format='ICO', sizes=ICO_SIZES)
print(f'✓ favicon.ico ({os.path.getsize(favicon_path)} bytes)')

print()
print('Все иконки сгенерированы в', OUT_DIR)
