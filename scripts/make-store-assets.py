"""
Visuels de la fiche Google Play, générés depuis le logo.

  store/icon-512.png        icône haute résolution (512×512, 32 bits, fond plein)
  store/feature-graphic.png bannière (1024×500)

Relancer : python scripts/make-store-assets.py
"""
import os

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOGO = Image.open(os.path.join(ROOT, 'assets', 'brand', 'logo.png')).convert('RGBA')
OUT = os.path.join(ROOT, 'store')
BG_TOP, BG_BOTTOM = (13, 19, 38), (7, 10, 20)


def font(size, bold=True):
    for name in (('seguisb.ttf', 'arialbd.ttf') if bold else ('segoeui.ttf', 'arial.ttf')):
        p = os.path.join(os.environ.get('WINDIR', 'C:/Windows'), 'Fonts', name)
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def gradient(w, h):
    img = Image.new('RGBA', (w, h))
    d = ImageDraw.Draw(img)
    for y in range(h):
        k = y / (h - 1)
        d.line([(0, y), (w, y)], fill=tuple(round(a + (b - a) * k) for a, b in zip(BG_TOP, BG_BOTTOM)) + (255,))
    return img


def glow(img, cx, cy, r, color):
    layer = Image.new('RGBA', img.size, (0, 0, 0, 0))
    ImageDraw.Draw(layer).ellipse([cx - r, cy - r, cx + r, cy + r], fill=color)
    img.alpha_composite(layer.filter(ImageFilter.GaussianBlur(r * 0.55)))


def fit(img, box):
    s = box / max(img.size)
    return img.resize((round(img.width * s), round(img.height * s)), Image.LANCZOS)


def icon():
    img = gradient(512, 512)
    glow(img, 256, 240, 170, (91, 140, 255, 70))
    logo = fit(LOGO, 380)
    img.alpha_composite(logo, ((512 - logo.width) // 2, (512 - logo.height) // 2))
    img.convert('RGB').save(os.path.join(OUT, 'icon-512.png'), optimize=True)


def feature():
    W, H = 1024, 500
    img = gradient(W, H)
    glow(img, 250, 250, 230, (91, 140, 255, 60))
    glow(img, 820, 120, 160, (124, 58, 237, 40))
    logo = fit(LOGO, 300)
    img.alpha_composite(logo, (250 - logo.width // 2, 250 - logo.height // 2))
    d = ImageDraw.Draw(img)
    x = 470
    d.text((x, 150), 'VéhiTrack', font=font(76), fill=(240, 244, 255))
    d.text((x, 248), 'Retrouvez votre voiture,', font=font(34, False), fill=(190, 200, 228))
    d.text((x, 292), 'en un geste.', font=font(34, False), fill=(190, 200, 228))
    d.text((x, 360), 'Photo · repère · ticket · sans compte, sans pub', font=font(21, False), fill=(130, 146, 190))
    img.convert('RGB').save(os.path.join(OUT, 'feature-graphic.png'), optimize=True)


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    icon()
    feature()
    print('ok')
