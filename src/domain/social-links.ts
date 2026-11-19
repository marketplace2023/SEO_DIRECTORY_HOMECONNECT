import { z } from "zod";

export const socialPlatforms = [
  ["website", "Página web", "Website"],
  ["googleBusiness", "Perfil de Empresa en Google", "Google Business Profile"],
  ["instagram", "Instagram", "Instagram"],
  ["facebook", "Facebook", "Facebook"],
  ["linkedin", "LinkedIn", "LinkedIn"],
  ["youtube", "YouTube", "YouTube"],
  ["tiktok", "TikTok", "TikTok"],
  ["x", "X", "X"],
  ["other", "Otro enlace", "Other link"],
] as const;

export function isPublicWebUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      ["https:", "http:"].includes(url.protocol) &&
      Boolean(url.hostname) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

const webUrl = z
  .string()
  .trim()
  .max(2048)
  .refine(
    (value) => value === "" || isPublicWebUrl(value),
    "Introduce un enlace completo con https://",
  );
export const socialLinksSchema = z.object({
  website: webUrl.optional(),
  googleBusiness: webUrl
    .refine((value) => {
      if (!value) return true;
      if (!isPublicWebUrl(value)) return false;
      const url = new URL(value);
      return (
        url.protocol === "https:" &&
        !url.port &&
        (url.hostname === "maps.app.goo.gl" ||
          url.hostname === "g.page" ||
          url.hostname === "share.google" ||
          url.hostname === "maps.google.com" ||
          (["www.google.com", "google.com"].includes(url.hostname) &&
            /^\/maps(?:\/|$)/.test(url.pathname)))
      );
    }, "Introduce un enlace público de Google Maps o del Perfil de Empresa.")
    .optional(),
  instagram: webUrl.optional(),
  facebook: webUrl.optional(),
  linkedin: webUrl.optional(),
  youtube: webUrl.optional(),
  tiktok: webUrl.optional(),
  x: webUrl.optional(),
  other: webUrl.optional(),
});
export type SocialLinks = z.infer<typeof socialLinksSchema>;
