// Generates the favicon set from the pixel portrait. Output is committed, so builds never run this.
// Run: npm run icons
import { mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const SOURCE = "art-source/portrait.png";
const NATIVE = 64; // the portrait is ~62 big pixels wide; sampling at 64 recovers them exactly
// Face-centred square, in native pixels. Edit these to re-frame the icon.
const CROP = { left: 14, top: 3, size: 36 };

const native = await sharp(SOURCE)
  .resize(NATIVE, NATIVE, { kernel: "nearest" })
  .extract({ left: CROP.left, top: CROP.top, width: CROP.size, height: CROP.size })
  .png()
  .toBuffer();

/** Nearest-neighbour scaling keeps the pixel art crisp at every size. */
const render = (size) =>
  sharp(native).resize(size, size, { kernel: "nearest" }).png({ compressionLevel: 9 }).toBuffer();

mkdirSync("public", { recursive: true });
const files = {
  "favicon-16x16.png": 16,
  "favicon-32x32.png": 32,
  "apple-touch-icon.png": 180,
  "icon-192.png": 192,
  "icon-512.png": 512,
};
for (const [name, size] of Object.entries(files))
  writeFileSync(`public/${name}`, await render(size));

// favicon.ico with PNG-compressed 16, 32 and 48 pixel images.
const sizes = [16, 32, 48];
const images = await Promise.all(sizes.map(render));
const header = Buffer.alloc(6);
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(sizes.length, 4);
let offset = 6 + sizes.length * 16;
const entries = sizes.map((size, i) => {
  const e = Buffer.alloc(16);
  e[0] = size;
  e[1] = size;
  e.writeUInt16LE(1, 4); // colour planes
  e.writeUInt16LE(32, 6); // bits per pixel
  e.writeUInt32LE(images[i].length, 8);
  e.writeUInt32LE(offset, 12);
  offset += images[i].length;
  return e;
});
writeFileSync("public/favicon.ico", Buffer.concat([header, ...entries, ...images]));

writeFileSync(
  "public/site.webmanifest",
  JSON.stringify(
    {
      name: "Momen Shili",
      short_name: "Momen Shili",
      start_url: "/",
      display: "standalone",
      theme_color: "#1b1423",
      background_color: "#1b1423",
      icons: [
        { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
    },
    null,
    2,
  ) + "\n",
);
console.warn("Icons written to public/");
