import { expect, type Page } from "@playwright/test";

const palette = (page: Page) =>
  page.getByRole("complementary", { name: "Palette" });

/**
 * Die Palette ist eine Schiene und klappt erst bei Hover auf (T-711): vor dem
 * Bedienen aufklappen. Der Mauszeiger wird gesetzt statt angeklickt, denn das
 * offene Panel liegt über der Schiene.
 */
export async function öffnePalette(page: Page) {
  const schiene = await page.locator(".tiv-side--left .tiv-rail").boundingBox();
  if (!schiene) throw new Error("Schiene fehlt");
  await page.mouse.move(schiene.x + 28, schiene.y + schiene.height / 2);
  await expect(palette(page)).toBeVisible();
}

/** Mauszeiger auf die Fläche: das offene Panel liegt sonst über Geräten am linken Rand. */
export async function schliessePalette(page: Page) {
  const fläche = await page.locator(".tiv-canvas").boundingBox();
  if (!fläche) throw new Error("Fläche fehlt");
  await page.mouse.move(
    fläche.x + fläche.width / 2,
    fläche.y + fläche.height - 10,
  );
  await expect(palette(page)).toBeHidden();
}
