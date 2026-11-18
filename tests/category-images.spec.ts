import { test, expect, origins } from "./fixtures";
import { readFileSync } from "node:fs";
import { categories, subcategories } from "../src/data/catalog";
import sharp from "sharp";
import { createHash } from "node:crypto";

test("las 144 imágenes usan derivados JPEG válidos y conservan sus originales WebP", () => {
  const records = [...categories, ...subcategories];
  const manifest = JSON.parse(
    readFileSync(
      new URL(
        "../public/CATEGORY_PICS/compatible/manifest.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  expect(records).toHaveLength(144);
  expect(new Set(records.map((record) => record.image)).size).toBe(144);
  for (const record of records) {
    expect(record.image).toBe(`/CATEGORY_PICS/compatible/${record.id}.jpg`);
    const bytes = readFileSync(
      new URL(`../public${record.image}`, import.meta.url),
    );
    expect(bytes.subarray(0, 2).toString("hex")).toBe("ffd8");
    const original = readFileSync(
      new URL(`../public/CATEGORY_PICS/${record.id}.webp`, import.meta.url),
    );
    expect(
      manifest.images.find((image: { id: string }) => image.id === record.id)
        .sourceHash,
    ).toBe(createHash("sha256").update(original).digest("hex"));
  }
});

test("home: fotografías de categoría y subcategorías conectadas con la búsqueda", async ({
  page,
}) => {
  await page.goto("/");
  const firstCategory = page.locator(".category-swiper img").first();
  await expect(firstCategory).toHaveAttribute(
    "src",
    "/CATEGORY_PICS/compatible/roofing.jpg",
  );
  await page
    .getByRole("combobox", { name: "Categoría para ver subcategorías" })
    .selectOption("hvac");
  const area = page.locator('[data-subcategory="hvac-installation"]');
  await expect(area.getByRole("img")).toHaveAttribute(
    "src",
    "/CATEGORY_PICS/compatible/hvac-installation.jpg",
  );
  await area.scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      area
        .getByRole("img")
        .evaluate((img: HTMLImageElement) => img.naturalWidth),
    )
    .toBeGreaterThan(0);
  await area
    .getByRole("button", {
      name: "Ver profesionales de esta área",
      exact: true,
    })
    .click();
  await expect(page).toHaveURL(/category=hvac&subcategory=hvac-installation/);
});

test("administración: categorías y subcategorías visibles con sus fotografías, también en móvil", async ({
  page,
  request,
}) => {
  await page.goto(origins.admin + "/#/workspace/admin/catalog");
  await page
    .getByRole("navigation", { name: "Categorías del catálogo" })
    .getByRole("button", { name: /Climatización/ })
    .click();
  const selected = page.locator('[data-catalog-category="hvac"]');
  const photo = selected.getByRole("img", {
    name: "Climatización",
    exact: true,
  });
  await expect(photo).toHaveAttribute(
    "src",
    "/CATEGORY_PICS/compatible/hvac.jpg",
  );
  await expect
    .poll(() => photo.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBeGreaterThan(0);
  // naturalWidth and a 200 response did not detect the white bands. Compare
  // browser-decoded pixels with the original decoded independently by libvips.
  await photo.evaluate((img: HTMLImageElement) => img.decode());
  const pixels = await photo.evaluate((img: HTMLImageElement) => {
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const context = canvas.getContext("2d")!;
    context.drawImage(img, 0, 0);
    return Array.from(
      context.getImageData(0, 0, canvas.width, canvas.height).data,
    );
  });
  const originalPixels = await sharp(
    readFileSync(new URL("../public/CATEGORY_PICS/hvac.webp", import.meta.url)),
  )
    .removeAlpha()
    .raw()
    .toBuffer();
  expect(pixels.length / 4).toBe(originalPixels.length / 3);
  let difference = 0;
  for (let i = 0; i < originalPixels.length; i++)
    difference += Math.abs(
      originalPixels[i] - pixels[Math.floor(i / 3) * 4 + (i % 3)],
    );
  expect(difference / originalPixels.length).toBeLessThan(8);
  await expect(selected.locator("[data-catalog-subcategory]")).toHaveCount(2);
  for (const sub of subcategories.filter((sub) => sub.categoryId === "hvac")) {
    const img = selected.locator(`[data-catalog-subcategory="${sub.id}"] img`);
    await img.scrollIntoViewIfNeeded();
    await expect
      .poll(() => img.evaluate((node: HTMLImageElement) => node.naturalWidth))
      .toBeGreaterThan(0);
  }
  const response = await request.get(
    origins.admin + "/CATEGORY_PICS/compatible/hvac-care.jpg",
  );
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toBe("image/jpeg");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.evaluate(async () => {
    await Promise.all(
      Array.from(document.images)
        .filter((img) => img.complete && img.naturalWidth)
        .map((img) => img.decode().catch(() => {})),
    );
    await document.fonts.ready;
    window.scrollTo({ top: 0, behavior: "instant" });
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );
  });
  await page.screenshot({
    path: ".artifacts/admin-category-pics-mobile.png",
    fullPage: true,
  });
});
