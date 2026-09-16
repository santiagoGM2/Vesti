export function cropRectangle(
  bounds: readonly number[],
  width: number,
  height: number,
) {
  const [x1, y1, x2, y2] = bounds;
  if (
    bounds.length !== 4 ||
    bounds.some((n) => !Number.isFinite(n) || n < 0 || n > 1) ||
    x2 <= x1 ||
    y2 <= y1
  )
    return null;
  const left = Math.max(0, Math.floor(x1 * width));
  const top = Math.max(0, Math.floor(y1 * height));
  const w = Math.min(width - left, Math.ceil(x2 * width) - left);
  const h = Math.min(height - top, Math.ceil(y2 * height) - top);
  return w >= 8 && h >= 8 ? { left, top, width: w, height: h } : null;
}
