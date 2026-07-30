"""Generate DevHub PWA icons from the canonical brand geometry."""

from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
TOP_LEFT = (99, 102, 241)
BOTTOM_RIGHT = (55, 48, 163)
WHITE = (255, 255, 255)
CYAN = (103, 232, 249)
SUPERSAMPLING = 4


def interpolate(start: int, end: int, progress: float) -> int:
    return round(start + (end - start) * progress)


def create_icon(size: int) -> Image.Image:
    canvas_size = size * SUPERSAMPLING
    image = Image.new("RGB", (canvas_size, canvas_size))
    pixels = image.load()

    for y in range(canvas_size):
        for x in range(canvas_size):
            progress = (x + y) / (2 * (canvas_size - 1))
            pixels[x, y] = tuple(
                interpolate(start, end, progress)
                for start, end in zip(TOP_LEFT, BOTTOM_RIGHT)
            )

    draw = ImageDraw.Draw(image)
    scale = canvas_size / 512

    def rounded_line(x1: int, y: int, x2: int, width: int) -> None:
        draw.line(
            tuple(round(value * scale) for value in (x1, y, x2, y)),
            fill=WHITE,
            width=round(width * scale),
        )
        radius = width * scale / 2
        for x in (x1 * scale, x2 * scale):
            draw.ellipse(
                (x - radius, y * scale - radius, x + radius, y * scale + radius),
                fill=WHITE,
            )

    rounded_line(112, 174, 288, 34)
    rounded_line(112, 256, 390, 34)
    rounded_line(112, 338, 326, 34)

    dot_x, dot_y, dot_radius = (370 * scale, 174 * scale, 29 * scale)
    draw.ellipse(
        (
            dot_x - dot_radius,
            dot_y - dot_radius,
            dot_x + dot_radius,
            dot_y + dot_radius,
        ),
        fill=CYAN,
    )

    return image.resize((size, size), Image.Resampling.LANCZOS)


def main() -> None:
    icon_192 = create_icon(192)
    icon_512 = create_icon(512)
    icon_192.save(ASSETS / "icon-192.png", optimize=True)
    icon_512.save(ASSETS / "icon-512.png", optimize=True)
    icon_512.save(ASSETS / "icon-maskable-512.png", optimize=True)


if __name__ == "__main__":
    main()
