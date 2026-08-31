"""Build the wordsus favicon from the frozen-letter tile treatment."""

from __future__ import annotations

import os
import re

from PIL import Image, ImageDraw, ImageFont
from fontTools.misc.transform import Transform
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT_PATH = os.path.join(ROOT, "tools", ".cache", "latin-700-normal.ttf")
ASSETS = os.path.join(ROOT, "assets")

CREAM = "#fbefd8"
AMBER = "#fbab20"
INK = "#141414"
CREAM_RGB = (251, 239, 216)
AMBER_RGB = (251, 171, 32)
INK_RGB = (20, 20, 20)


def round_path(d: str) -> str:
    def repl(match: re.Match[str]) -> str:
        value = f"{float(match.group()):.3f}"
        return value.rstrip("0").rstrip(".")

    return re.sub(r"-?\d+\.\d+", repl, d)


def glyph_path(view: float, letter_ratio: float) -> str:
    font = TTFont(FONT_PATH)
    glyphs = font.getGlyphSet()
    glyph = glyphs["W"]
    bounds_pen = BoundsPen(glyphs)
    glyph.draw(bounds_pen)
    x0, y0, x1, y1 = bounds_pen.bounds
    gw = x1 - x0
    gh = y1 - y0
    scale = (view * letter_ratio) / max(gw, gh)
    cx = (x0 + x1) / 2
    cy = (y0 + y1) / 2
    transform = Transform()
    transform = transform.translate(view / 2, view / 2)
    transform = transform.scale(scale, -scale)
    transform = transform.translate(-cx, -cy)
    path_pen = SVGPathPen(glyphs)
    glyph.draw(TransformPen(path_pen, transform))
    font.close()
    return round_path(path_pen.getCommands())


def write_svg() -> str:
    view = 32.0
    border = 2.5
    path = glyph_path(view, 0.6)
    inset = border / 2
    size = view - border
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"'
        ' role="img" aria-label="wordsus">\n'
        f'  <rect width="32" height="32" fill="{CREAM}"/>\n'
        f'  <rect x="{inset:.2f}" y="{inset:.2f}" width="{size:.2f}"'
        f' height="{size:.2f}" fill="none" stroke="{AMBER}"'
        f' stroke-width="{border:.2f}"/>\n'
        f'  <path fill="{INK}" d="{path}"/>\n'
        "</svg>\n"
    )
    out = os.path.join(ASSETS, "favicon.svg")
    with open(out, "w", encoding="utf-8", newline="\n") as handle:
        handle.write(svg)
    return out


def border_width(size: int) -> int:
    return max(2, round(size * 0.075))


def render_png(size: int, scale: int = 4) -> Image.Image:
    canvas = size * scale
    img = Image.new("RGB", (canvas, canvas), AMBER_RGB)
    draw = ImageDraw.Draw(img)
    border = border_width(size) * scale
    draw.rectangle(
        [border, border, canvas - 1 - border, canvas - 1 - border],
        fill=CREAM_RGB,
    )
    font = ImageFont.truetype(FONT_PATH, int(size * 0.6 * scale))
    bbox = font.getbbox("W")
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    x = (canvas - tw) / 2 - bbox[0]
    y = (canvas - th) / 2 - bbox[1] + scale * 0.15
    draw.text((x, y), "W", font=font, fill=INK_RGB)
    if scale == 1:
        return img
    return img.resize((size, size), Image.Resampling.LANCZOS)


def main() -> None:
    os.makedirs(ASSETS, exist_ok=True)
    svg_path = write_svg()

    apple = render_png(180, scale=2)
    apple_path = os.path.join(ASSETS, "apple-touch-icon.png")
    apple.save(apple_path, "PNG")

    png32 = render_png(32)
    png32_path = os.path.join(ASSETS, "favicon-32.png")
    png32.save(png32_path, "PNG")

    ico_path = os.path.join(ROOT, "favicon.ico")
    render_png(256, scale=2).save(
        ico_path, format="ICO", sizes=[(16, 16), (32, 32), (48, 48)]
    )
    print("wrote", svg_path)
    print("wrote", apple_path)
    print("wrote", png32_path)
    print("wrote", ico_path)


if __name__ == "__main__":
    main()
