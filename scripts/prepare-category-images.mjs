import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

// Keep the supplied WebP files intact. Decode once with libvips/libwebp and
// serve sRGB JPEG derivatives, avoiding the lossless WebP rendering defects
// reproduced in Chrome even on a blank page without application styles.
const source = new URL("../public/CATEGORY_PICS/", import.meta.url);
const destination = new URL("compatible/", source);
const manifestPath = new URL("manifest.json", destination);
const recipe = `jpeg-srgb-quality90-444-v1-sharp${sharp.versions.sharp}`;
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
mkdirSync(destination, { recursive: true });
let previous;
try {
  previous = JSON.parse(readFileSync(manifestPath, "utf8"));
} catch {
  previous = {};
}
const images = [];
let generated = 0;
for (const name of readdirSync(source)
  .filter((name) => /^[a-z0-9-]+\.webp$/.test(name))
  .sort()) {
  const id = name.slice(0, -5),
    input = new URL(name, source),
    output = new URL(`${id}.jpg`, destination);
  const sourceHash = hash(readFileSync(input));
  const cached = previous.images?.find((image) => image.id === id);
  if (
    previous.recipe === recipe &&
    cached?.sourceHash === sourceHash &&
    existsSync(output) &&
    cached.outputHash === hash(readFileSync(output))
  ) {
    images.push(cached);
    continue;
  }
  const info = await sharp(fileURLToPath(input), { failOn: "error" })
    .rotate()
    .toColourspace("srgb")
    .jpeg({ quality: 90, mozjpeg: true, chromaSubsampling: "4:4:4" })
    .toFile(fileURLToPath(output));
  images.push({
    id,
    source: `/CATEGORY_PICS/${name}`,
    sourceHash,
    image: `/CATEGORY_PICS/compatible/${id}.jpg`,
    outputHash: hash(readFileSync(output)),
    width: info.width,
    height: info.height,
  });
  generated++;
}
if (!images.length) throw Error("No category source images were found.");
const manifest = JSON.stringify({ recipe, images }, null, 2) + "\n";
if (
  !existsSync(manifestPath) ||
  readFileSync(manifestPath, "utf8") !== manifest
)
  writeFileSync(manifestPath, manifest);
console.log(
  `Category images: ${images.length} available, ${generated} regenerated; original files preserved.`,
);
