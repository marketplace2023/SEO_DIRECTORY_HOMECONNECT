import { test, expect } from "@playwright/test";
import { createSeed } from "../src/data/seed";
import {
  renderLocal,
  sitemap,
  profilePath,
  type SeoEntry,
} from "../server/seo/local";
test("SEO publicado: solo oferta real, escape HTML, canonical y esquema sin reputación inventada", () => {
  const state = createSeed(),
    person = {
      ...structuredClone(
        state.professionals.find((p) => p.region === "Georgia")!,
      ),
      id: "pro-real-business",
      name: "Georgia Roofing <script>alert(1)</script>",
      region: "Georgia",
      country: "United States",
      city: "Lawrenceville",
      coverage: ["Lawrenceville"],
      categoryId: "roofing",
    };
  state.professionals.push(person);
  const pages: SeoEntry[] = [
    {
      id: "lawrenceville:roofing",
      city: "lawrenceville",
      categoryId: "roofing",
      title: "Roofing services in Lawrenceville, Georgia",
      description:
        "Compare roofing services and declared coverage in Lawrenceville, Georgia.",
      content:
        "Compare proposals from professionals serving Lawrenceville. Request an on-site assessment before agreeing on the final scope and price.",
      published: true,
      indexable: true,
    },
  ];
  const contact = {
      [person.id]: {
        publish: true,
        telephone: "+1 555 0100",
        address: "123 Example Street",
      },
    },
    origin = "https://home-connect.example";
  const page = renderLocal(
    "/georgia/lawrenceville/roofing",
    state,
    pages,
    origin,
    true,
    contact,
  );
  expect(page.status).toBe(200);
  expect(page.indexable).toBe(true);
  expect(page.html).not.toContain("<script>alert(1)</script>");
  expect(page.canonical).toBe(origin + "/georgia/lawrenceville/roofing");
  expect(page.html).toContain("What this trade covers");
  expect(page.html).toContain(
    "Excludes structural engineering and solar electrical connections.",
  );
  expect(page.html).toContain("/category-art/roofing.svg");
  const profile = renderLocal(
    profilePath(person),
    state,
    pages,
    origin,
    true,
    contact,
  );
  const schema = JSON.parse(
    profile.html.match(
      /<script type="application\/ld\+json">([\s\S]+?)<\/script>/,
    )![1],
  );
  expect(
    schema.find((s: any) => s["@type"] === "HomeAndConstructionBusiness")
      .address.addressRegion,
  ).toBe("GA");
  expect(profile.html).not.toContain("aggregateRating");
  expect(profile.html).not.toContain("ratingValue");
  const xml = sitemap(state, pages, origin, true, contact);
  expect(xml).toContain("/georgia/lawrenceville/roofing");
  expect(xml).toContain(profilePath(person));
  expect(xml).not.toContain("/contractors/peachtree");
  expect(
    renderLocal("/georgia/unknown", state, pages, origin, true).status,
  ).toBe(404);
  expect(
    renderLocal(
      "/contractors/" + person.id + "/wrong-slug",
      state,
      pages,
      origin,
      true,
      contact,
    ).redirect,
  ).toBe(profilePath(person));
});
