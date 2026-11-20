import { z } from "zod";

export const socialPlatforms = [
  ["website", "Página web", "Website"],
  ["whatsapp", "Número de WhatsApp", "WhatsApp number"],
  ["instagram", "Instagram", "Instagram"],
  ["facebook", "Facebook", "Facebook"],
  ["linkedin", "LinkedIn", "LinkedIn"],
  ["youtube", "YouTube", "YouTube"],
  ["tiktok", "TikTok", "TikTok"],
  ["x", "X", "X"],
  ["other", "Otro enlace", "Other link"],
] as const;

type SocialPlatform = (typeof socialPlatforms)[number][0];

function whatsappDigits(value: string) {
  if (!/^\+[0-9 .()-]+$/.test(value)) return;
  const digits = value.replace(/\D/g, "");
  if (/^[1-9]\d{6,14}$/.test(digits)) return digits;
}

export function socialContactUrl(platform: SocialPlatform, value?: string) {
  if (!value) return;
  if (platform === "whatsapp") {
    const digits = whatsappDigits(value);
    return digits ? `https://wa.me/${digits}` : undefined;
  }
  return isPublicWebUrl(value) ? value : undefined;
}

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
  whatsapp: z
    .string()
    .trim()
    .max(40)
    .refine((value) => !value || Boolean(whatsappDigits(value)))
    .transform((value) => (value ? "+" + whatsappDigits(value) : ""))
    .optional(),
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
