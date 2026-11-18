import type { DemoState, Professional } from "../../src/domain/types";
import { categories, services } from "../../src/data/catalog";
export const georgiaCities = [
  { slug: "atlanta", name: "Atlanta" },
  { slug: "lawrenceville", name: "Lawrenceville" },
  { slug: "duluth", name: "Duluth" },
  { slug: "suwanee", name: "Suwanee" },
  { slug: "roswell", name: "Roswell" },
];
export type SeoEntry = {
  id: string;
  city: string;
  categoryId: string;
  title: string;
  description: string;
  content: string;
  published: boolean;
  indexable: boolean;
};
export const slugify = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
export const escapeHtml = (text: unknown) =>
  String(text ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
export const profilePath = (person: Professional) =>
  `/contractors/${encodeURIComponent(person.id)}/${slugify(person.name)}`;
function categoryScope(id: string) {
  const category = categories.find((c) => c.id === id);
  if (!category) return "";
  return `<section><img src="${escapeHtml(category.illustration)}" width="480" height="320" alt="${escapeHtml(category.name.en)} illustration" style="max-width:100%;height:auto"/><h2>What this trade covers</h2><p>${escapeHtml(category.description.en)}</p><ul>${services
    .filter((s) => s.categoryId === id)
    .map((s) => `<li>${escapeHtml(s.name.en)}</li>`)
    .join(
      "",
    )}</ul><h3>Service boundaries</h3><p>${escapeHtml(category.excluded.en)}</p><a href="/#/coverage?region=Georgia&amp;category=${encodeURIComponent(id)}">Explore this trade on the map</a></section>`;
}
export function georgiaPeople(state: DemoState) {
  return state.professionals.filter(
    (p) =>
      p.publication === "published" &&
      /georgia/i.test(p.region) &&
      /estados unidos|united states|usa|us/i.test(p.country),
  );
}
export function cityPeople(state: DemoState, city: string, category?: string) {
  return georgiaPeople(state).filter(
    (p) =>
      (slugify(p.city) === city ||
        p.coverage.some((area) => slugify(area) === city)) &&
      (!category || p.categoryId === category),
  );
}
export function renderLocal(
  path: string,
  state: DemoState,
  entries: SeoEntry[],
  origin: string,
  enabled: boolean,
  contacts: Record<string, any> = {},
) {
  const base = origin.replace(/\/$/, ""),
    parts = path.split("/").filter(Boolean),
    people = georgiaPeople(state);
  let title = "Home services and contractors in Georgia | HOME CONNECT",
    description =
      "Find home service professionals in Georgia. Compare specialties, service areas and project proposals.",
    body = "",
    status = 200,
    redirect: string | undefined,
    indexable = enabled;
  let schema: any[] = [];
  const listing = (people: Professional[]) =>
    people
      .map(
        (person) =>
          `<article><h2><a href="${profilePath(person)}">${escapeHtml(person.name)}</a></h2><p>${escapeHtml(categories.find((c) => c.id === person.categoryId)?.name.en)} · ${escapeHtml(person.city)}, Georgia</p><p>${escapeHtml(person.bio.en)}</p><p>${person.id.startsWith("pro-") ? "Business information supplied by its representative." : "Fictional demonstration profile. Not available for hiring."}</p></article>`,
      )
      .join("");
  if (path === "/georgia" || path === "/georgia/") {
    body = `<h1>Find home service professionals in Georgia</h1><p>Browse by service area, compare professional information and describe your project before requesting a proposal.</p><nav aria-label="Cities">${georgiaCities
      .filter((city) => cityPeople(state, city.slug).length)
      .map((city) => `<a href="/georgia/${city.slug}">${city.name}</a>`)
      .join(" ")}</nav>${listing(people)}`;
    indexable = enabled && people.some((p) => p.id.startsWith("pro-"));
  } else if (
    parts[0] === "georgia" &&
    (parts.length === 2 || parts.length === 3)
  ) {
    const city = georgiaCities.find((c) => c.slug === parts[1]),
      entry = entries.find(
        (e) =>
          e.city === parts[1] &&
          e.categoryId === (parts[2] || "") &&
          e.published,
      );
    const candidates = cityPeople(state, parts[1], parts[2]);
    if (!city || !candidates.length || (parts[2] && !entry)) {
      status = 404;
      indexable = false;
      body =
        "<h1>This service area is not available</h1><p>Return to the Georgia directory to explore current listings.</p>";
    } else {
      title =
        entry?.title || `Contractors in ${city.name}, Georgia | HOME CONNECT`;
      description =
        entry?.description ||
        `Explore home services in ${city.name}, Georgia. Check declared service areas and request a project proposal.`;
      body = `<h1>${escapeHtml(title.replace(" | HOME CONNECT", ""))}</h1><p>${escapeHtml(entry?.content || description)}</p><nav>${entries
        .filter((e) => e.published && e.city === city.slug && e.categoryId)
        .map(
          (e) =>
            `<a href="/georgia/${city.slug}/${e.categoryId}">${escapeHtml(categories.find((c) => c.id === e.categoryId)?.name.en)}</a>`,
        )
        .join(" ")}</nav>${listing(candidates)}`;
      indexable =
        enabled &&
        !!entry?.indexable &&
        candidates.some((p) => p.id.startsWith("pro-"));
      if (parts[2]) body += categoryScope(parts[2]);
    }
  } else if (parts[0] === "contractors" && parts.length === 3) {
    const person = people.find((p) => p.id === decodeURIComponent(parts[1]));
    if (!person) {
      status = 404;
      indexable = false;
      body = "<h1>Profile not available</h1>";
    } else {
      if (path !== profilePath(person)) redirect = profilePath(person);
      const contact = contacts[person.id];
      title = `${person.name} in ${person.city}, Georgia | HOME CONNECT`;
      description = person.bio.en;
      indexable =
        enabled && person.id.startsWith("pro-") && contact?.publish === true;
      body = `<h1>${escapeHtml(person.name)}</h1><p>${escapeHtml(person.city)}, Georgia · ${escapeHtml(categories.find((c) => c.id === person.categoryId)?.name.en)}</p><p>${escapeHtml(person.bio.en)}</p><h2>Service areas</h2><p>${escapeHtml(person.coverage.join(", "))}</p>${contact?.publish ? `<h2>Contact information</h2><p>${escapeHtml(contact.telephone || "")}</p><p>${escapeHtml(contact.address || "")}</p>` : ""}<h2>Services</h2><ul>${person.serviceIds.map((id) => `<li>${escapeHtml(services.find((s) => s.id === id)?.name.en || id)}</li>`).join("")}</ul><a class="button" href="/#/quote?professional=${encodeURIComponent(person.id)}">Request a proposal</a><p>A request is not a confirmed appointment or signed work agreement.</p>`;
      if (indexable && contact.telephone && contact.address)
        schema.push({
          "@context": "https://schema.org",
          "@type": "HomeAndConstructionBusiness",
          "@id": base + path + "#business",
          name: person.name,
          url: base + path,
          telephone: contact.telephone,
          address: {
            "@type": "PostalAddress",
            streetAddress: contact.address,
            addressLocality: person.city,
            addressRegion: "GA",
            addressCountry: "US",
          },
          areaServed: person.coverage.map((name) => ({
            "@type": "Place",
            name,
          })),
        });
    }
  } else {
    status = 404;
    indexable = false;
    body = "<h1>Page not found</h1>";
  }
  const canonical = base + (path === "/georgia/" ? "/georgia" : path);
  schema.push({
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    url: canonical,
    description,
    inLanguage: "en-US",
    isPartOf: { "@type": "WebSite", name: "HOME CONNECT", url: base },
  });
  schema.push({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { name: "Home", item: base + "/" },
      { name: "Georgia", item: base + "/georgia" },
      ...(path.startsWith("/georgia/")
        ? [{ name: parts.slice(1).join(" / "), item: canonical }]
        : []),
    ].map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      ...crumb,
    })),
  });
  const html = `<!doctype html><html lang="en-US"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}"><meta name="robots" content="${indexable ? "index,follow" : "noindex,follow"}"><link rel="canonical" href="${escapeHtml(canonical)}"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${escapeHtml(canonical)}"><meta property="og:type" content="website"><link rel="icon" href="/favicon.svg"><script type="application/ld+json">${JSON.stringify(schema).replace(/</g, "\\u003c")}</script><style>body{margin:0;background:#fafafa;color:#2d2e2f;font:16px/1.7 Arial,sans-serif}header,main,footer{max-width:1120px;margin:auto;padding:28px}header{display:flex;justify-content:space-between;gap:24px;align-items:center;border-bottom:1px solid #ddd}a{color:#b90000}nav{display:flex;flex-wrap:wrap;gap:18px}h1{font-size:clamp(28px,5vw,46px);line-height:1.2}article{background:#fff;border:1px solid #ddd;border-radius:10px;padding:24px;margin:24px 0}article h2{margin-top:0}.notice{padding:16px;background:#fff1f1;border-left:4px solid #e00707}.brand{font-size:23px;font-weight:800;text-decoration:none;color:#2d2e2f}.button{display:inline-block;background:#e00707;color:white;padding:12px 18px;border-radius:6px;text-decoration:none}footer{border-top:1px solid #ddd;font-size:13px}@media(max-width:600px){header{flex-wrap:wrap}header,main,footer{padding:20px}}</style></head><body><header><a class="brand" href="/">HOME CONNECT</a><nav><a href="/georgia">Georgia directory</a><a href="/#/register">Create account</a><a href="/#/login">Sign in</a></nav></header><main>${!enabled ? '<p class="notice">Demonstration directory. Sample businesses are fictional. These pages are not submitted for indexing.</p>' : ""}${body}</main><footer>HOME CONNECT · Georgia · <a href="/georgia">Local services</a><p>Business information and declared coverage do not constitute a workmanship guarantee.</p></footer></body></html>`;
  return { html, status, redirect, indexable, canonical };
}
export function sitemap(
  state: DemoState,
  entries: SeoEntry[],
  origin: string,
  enabled: boolean,
  contacts: Record<string, any>,
) {
  const paths = enabled
    ? [
        "/georgia",
        ...entries
          .filter(
            (e) =>
              e.published &&
              e.indexable &&
              cityPeople(state, e.city, e.categoryId || undefined).some((p) =>
                p.id.startsWith("pro-"),
              ),
          )
          .map(
            (e) =>
              `/georgia/${e.city}${e.categoryId ? "/" + e.categoryId : ""}`,
          ),
        ...georgiaPeople(state)
          .filter((p) => p.id.startsWith("pro-") && contacts[p.id]?.publish)
          .map(profilePath),
      ]
    : [];
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...new Set(paths)].map((path) => `<url><loc>${escapeHtml(origin.replace(/\/$/, "") + path)}</loc></url>`).join("")}</urlset>`;
}
