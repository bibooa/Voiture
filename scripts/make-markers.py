"""
Génère les marqueurs de carte en PNG (@1x/@2x/@3x) dans assets/markers/.

Pourquoi des PNG : sur Android, react-native-maps rastérise les marqueurs en
vues React et les coupe (la voiture n'apparaissait que comme un « V »). Une
image native s'affiche toujours entière, à la bonne densité.

Relancer : python scripts/make-markers.py
"""
import json
import math
import os

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'markers')
ICONS = os.path.join(ROOT, 'node_modules', '@expo', 'vector-icons', 'build', 'vendor', 'react-native-vector-icons')

CAR = (22, 163, 74)        # vert voiture (lisible en clair ET en sombre)
USER = (74, 124, 255)      # bleu « moi »
WHITE = (255, 255, 255)
SS = 4                     # sur-échantillonnage pour l'anticrénelage


def car_glyph():
    with open(os.path.join(ICONS, 'glyphmaps', 'MaterialCommunityIcons.json'), encoding='utf-8') as f:
        return chr(json.load(f)['car-sports'])


def shadow(img, radius, alpha=90, dy=0.0):
    """Ombre portée douce sous la forme opaque de img."""
    a = img.split()[3].point(lambda v: v * alpha // 255)
    sh = Image.new('RGBA', img.size, (0, 0, 0, 0))
    sh.putalpha(a)
    sh = sh.filter(ImageFilter.GaussianBlur(radius))
    out = Image.new('RGBA', img.size, (0, 0, 0, 0))
    out.alpha_composite(sh, (0, int(dy)))
    out.alpha_composite(img)
    return out


def label_font(size):
    for name in ('arialbd.ttf', 'seguisb.ttf', 'DejaVuSans-Bold.ttf'):
        for folder in (os.path.join(os.environ.get('WINDIR', 'C:/Windows'), 'Fonts'), '/usr/share/fonts/truetype/dejavu'):
            p = os.path.join(folder, name)
            if os.path.exists(p):
                return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def draw_label(img, text, cx, cy, scale):
    """Étiquette blanche détourée de sombre : lisible sur toute carte."""
    d = ImageDraw.Draw(img)
    font = label_font(int(9.5 * scale * SS))
    d.text((cx, cy), text, font=font, fill=WHITE + (255,), anchor='mm',
           stroke_width=int(2.2 * scale * SS), stroke_fill=(8, 12, 24, 235))


# Les images sont SYMÉTRIQUES verticalement : le centre du disque est au centre
# de l'image, donc anchor {x: 0.5, y: 0.5} reste exact malgré l'étiquette.

def car_marker(scale):
    W, H = 76, 84
    w, h = W * scale * SS, H * scale * SS
    cx, cy = w / 2, h / 2
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # halo discret
    r = 24 * scale * SS
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=CAR + (46,))
    shape = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    ds = ImageDraw.Draw(shape)
    r = 17 * scale * SS
    ds.ellipse([cx - r, cy - r, cx + r, cy + r], fill=WHITE + (255,))
    r = 14.5 * scale * SS
    ds.ellipse([cx - r, cy - r, cx + r, cy + r], fill=CAR + (255,))
    font = ImageFont.truetype(os.path.join(ICONS, 'Fonts', 'MaterialCommunityIcons.ttf'), int(19 * scale * SS))
    ds.text((cx, cy), car_glyph(), font=font, fill=WHITE + (255,), anchor='mm')
    img.alpha_composite(shadow(shape, 2 * scale * SS, 110, 1 * scale * SS))
    # « VOITURE » AU-DESSUS (celui de « VOUS » est dessous : pas de collision)
    draw_label(img, 'VOITURE', cx, cy - 33 * scale * SS, scale)
    return img.resize((W * scale, H * scale), Image.LANCZOS)


def user_marker(scale):
    W, H = 48, 64
    w, h = W * scale * SS, H * scale * SS
    cx, cy = w / 2, h / 2
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r = 13 * scale * SS
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=USER + (51,))
    shape = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    ds = ImageDraw.Draw(shape)
    r = 8.5 * scale * SS
    ds.ellipse([cx - r, cy - r, cx + r, cy + r], fill=WHITE + (255,))
    r = 6 * scale * SS
    ds.ellipse([cx - r, cy - r, cx + r, cy + r], fill=USER + (255,))
    img.alpha_composite(shadow(shape, 1.5 * scale * SS, 100, 0.5 * scale * SS))
    draw_label(img, 'VOUS', cx, cy + 22 * scale * SS, scale)
    return img.resize((W * scale, H * scale), Image.LANCZOS)


def heading_cone(scale):
    """Cône de vue vers le haut, pointe au centre exact (pivot de rotation)."""
    size = 96
    box = size * scale * SS
    c = box / 2
    cone = Image.new('RGBA', (box, box), (0, 0, 0, 0))
    length = 44 * scale * SS
    half = math.radians(28)
    # dégradé radial : opaque près du point, transparent au bout
    for i in range(60, 0, -1):
        rr = length * i / 60
        alpha = int(110 * (1 - i / 60) ** 0.8)
        layer = Image.new('RGBA', (box, box), (0, 0, 0, 0))
        ImageDraw.Draw(layer).pieslice(
            [c - rr, c - rr, c + rr, c + rr],
            start=-90 - math.degrees(half), end=-90 + math.degrees(half),
            fill=USER + (alpha,),
        )
        cone = Image.alpha_composite(cone, layer) if i == 60 else _over(cone, layer)
    return cone.resize((size * scale, size * scale), Image.LANCZOS)


def _over(base, layer):
    # remplace (et non cumule) : l'anneau intérieur a sa propre opacité
    mask = layer.split()[3].point(lambda v: 255 if v else 0)
    base.paste(layer, (0, 0), mask)
    return base


def main():
    os.makedirs(OUT, exist_ok=True)
    for name, fn in (('car', car_marker), ('user', user_marker), ('heading', heading_cone)):
        for s in (1, 2, 3):
            suffix = '' if s == 1 else f'@{s}x'
            fn(s).save(os.path.join(OUT, f'{name}{suffix}.png'), optimize=True)
    print('ok ->', OUT)


if __name__ == '__main__':
    main()
