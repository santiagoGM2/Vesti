import sharp from "sharp";
import { mkdir } from "node:fs/promises";

// Run only when the supplied brand source changes. No runtime image API cost.
const source = process.argv[2];
if (!source) throw new Error("Pass the original Vesti PNG path.");
await mkdir("public/brand", { recursive: true });
for (const size of [192, 512]) {
  await sharp(source).resize(size, size).png().toFile(`public/brand/icon-${size}.png`);
}
await sharp(source).resize(180, 180).png().toFile("src/app/apple-icon.png");
await sharp(source).resize(48, 48).png().toFile("src/app/icon.png");
await sharp(source).resize(256, 256).webp({ quality: 90 }).toFile("public/brand/logo.webp");
