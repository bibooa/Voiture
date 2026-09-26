"""
Génère toutes les icônes de l'appli à partir du logo source.

Source : assets/brand/logo-source.png (logo sur un faux damier gris/blanc).
Le damier est retiré par remplissage depuis les bords : seuls les pixels clairs
et peu saturés CONNECTÉS à l'extérieur deviennent transparents — le blanc à
l'intérieur de l'épingle (derrière la voiture, la route) est conservé.

Sorties :
  assets/brand/logo.png        logo détouré, carré, pour l'interface
  assets/icon.png              1024², fond sombre de l'appli (iOS, stores)
  assets/adaptive-icon.png     1024², logo dans la zone sûre (Android)
  assets/splash.png            logo seul, fond transparent (écran de démarrage)
  assets/favicon.png           48²

Relancer : python scripts/make-icons.py
"""
import os
from collections import deque

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = lambda *p: os.path.join(ROOT, 'assets', *p)
BG = (10, 14, 26, 255)  # #0A0E1A, fond de l'appli


def is_backdrop(px):
    r, g, b = px[:3]
    return min(r, g, b) > 200 and max(r, g, b) - min(r, g, b) < 18


def cut_out(img):
    img = img.convert('RGBA')
    w, h = img.size
    p = img.load()
    seen = bytearray(w * h)
    q = deque()
    for x in range(w):
        q.append((x, 0)); q.append((x, h - 1))
    for y in range(h):
        q.append((0, y)); q.append((w - 1, y))
    while q:
        x, y = q.popleft()
        i = y * w + x
        if seen[i] or not is_backdrop(p[x, y]):
            continue
        seen[i] = 1
        p[x, y] = (0, 0, 0, 0)
        if x > 0: q.append((x - 1, y))
        if x < w - 1: q.append((x + 1, y))
        if y > 0: q.append((x, y - 1))
        if y < h - 1: q.append((x, y + 1))
    for y in range(h):
        for x in range(w):
            if not p[x, y][3] or not is_backdrop(p[x, y]):
                continue
            if 0 < x < w - 1 and 0 < y < h - 1 and any(
                p[x + dx, y + dy][3] == 0 for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))
            ):
                # Liseré clair au contact du vide → semi-transparent.
                r, g, b, _ = p[x, y]
                p[x, y] = (r, g, b, 90)
            else:
                # Damier enfermé DANS l'épingle (derrière la voiture) → blanc uni.
                p[x, y] = (255, 255, 255, 255)
    return img.crop(img.getbbox())


def square(img, size, fill_ratio, bg=(0, 0, 0, 0)):
    out = Image.new('RGBA', (size, size), bg)
    s = fill_ratio * size / max(img.size)
    logo = img.resize((round(img.width * s), round(img.height * s)), Image.LANCZOS)
    out.alpha_composite(logo, ((size - logo.width) // 2, (size - logo.height) // 2))
    return out


def main():
    logo = cut_out(Image.open(A('brand', 'logo-source.png')))
    square(logo, 512, 1.0).save(A('brand', 'logo.png'), optimize=True)
    square(logo, 1024, 0.70, BG).save(A('icon.png'), optimize=True)
    # Android rogne l'icône adaptative en cercle/goutte : garder la zone sûre (~62 %).
    square(logo, 1024, 0.58).save(A('adaptive-icon.png'), optimize=True)
    square(logo, 1024, 0.9).save(A('splash.png'), optimize=True)
    square(logo, 48, 0.92).save(A('favicon.png'), optimize=True)
    print('ok')


if __name__ == '__main__':
    main()
