import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { AuthUser } from "../../src/auth/types";
import type { Professional } from "../../src/domain/types";
import type { SeoProject, SeoDirectory } from "../../src/domain/local-seo";
export const normalizeKeyword = (value: string) =>
  value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
export const safeUrl = z
  .string()
  .trim()
  .max(2000)
  .refine((value) => {
    if (!value) return true;
    try {
      const url = new URL(value);
      return url.protocol === "https:" && !url.username && !url.password;
    } catch {
      return false;
    }
  }, "Usa una URL https sin credenciales.");
const text = z.string().trim().max(300);
const date = z.string().datetime({ offset: true });
export const directorySchema = z.object({
  id: z.string().uuid().optional(),
  name: text.min(2),
  url: safeUrl.refine(Boolean),
  description: z.string().trim().max(2000),
  active: z.boolean(),
});
export function managementAction(
  project: SeoProject,
  path: string,
  body: unknown,
  user: AuthUser,
  person: Professional,
  directories: SeoDirectory[],
) {
  const now = new Date().toISOString();
  const keywords = project.keywords!;
  if (
    path === "/api/local-seo/keyword-preview" ||
    path === "/api/local-seo/keywords"
  ) {
    const input = z.object({ lines: z.string().max(15000) }).parse(body);
    const seen = new Set(keywords.map((k) => k.normalized));
    let available = 25 - keywords.filter((k) => k.active).length;
    const preview = input.lines.split(/\r?\n/).map((line) => {
      const keyword = line.trim().replace(/\s+/g, " ");
      const normalized = normalizeKeyword(keyword);
      const reason = !keyword
        ? "vacía"
        : keyword.length > 300
          ? "demasiado larga"
          : seen.has(normalized)
            ? "duplicada"
            : available <= 0
              ? "excede las 25 activas"
              : "agregar";
      if (reason === "agregar") {
        seen.add(normalized);
        available--;
      }
      return { keyword, normalized, reason };
    });
    if (path.endsWith("keyword-preview")) return { preview };
    if (preview.some((row) => row.reason.includes("excede")))
      throw Error(
        "La carga supera 25 keywords activas. Revisa la previsualización; no se guardó ninguna.",
      );
    for (const row of preview.filter((row) => row.reason === "agregar"))
      keywords.push({
        id: randomUUID(),
        keyword: row.keyword,
        normalized: row.normalized,
        active: true,
        createdAt: now,
        updatedAt: now,
        createdBy: user.id,
      });
    return {
      detail: `Keywords agregadas: ${preview.filter((row) => row.reason === "agregar").length}; omitidas: ${preview.filter((row) => row.reason !== "agregar").length}`,
      preview,
    };
  }
  if (path === "/api/local-seo/keyword") {
    const input = z
      .object({
        id: z.string().uuid(),
        keyword: text.min(1),
        active: z.boolean(),
      })
      .parse(body);
    const record = keywords.find((k) => k.id === input.id);
    if (!record) throw Error("Keyword no disponible.");
    const normalized = normalizeKeyword(input.keyword);
    if (keywords.some((k) => k.id !== input.id && k.normalized === normalized))
      throw Error("Keyword duplicada.");
    if (
      input.active &&
      !record.active &&
      keywords.filter((k) => k.active).length >= 25
    )
      throw Error("Máximo 25 keywords activas.");
    // Campaigns preserve the text used for earlier observations.
    Object.assign(record, input, { normalized, updatedAt: now });
    return {
      detail:
        "Keyword actualizada; las campañas históricas conservan su consulta original.",
    };
  }
  if (path === "/api/local-seo/keyword-remove") {
    const { id } = z.object({ id: z.string().uuid() }).parse(body);
    const index = keywords.findIndex((k) => k.id === id);
    if (index < 0) throw Error("Keyword no disponible.");
    if (
      project.campaigns.some((c) => c.keywordId === id) ||
      project.contents!.some((c) => c.keywordIds.includes(id))
    )
      throw Error(
        "La keyword tiene referencias históricas; desactívala para conservarlas.",
      );
    keywords.splice(index, 1);
    return { detail: "Keyword eliminada" };
  }
  if (path === "/api/local-seo/master") {
    if (user.role !== "admin")
      throw Error("Solo administración puede corregir el registro maestro.");
    const input = z
      .object({
        name: text.min(2),
        address: z.string().trim().max(600),
        phone: text,
        website: safeUrl,
        postalCode: text,
        serviceAreaBusiness: z.boolean(),
      })
      .parse(body);
    return {
      detail: "Registro maestro del contratista corregido",
      master: {
        ...person,
        name: input.name,
        address: input.address,
        phone: input.phone,
        postalCode: input.postalCode,
        serviceAreaBusiness: input.serviceAreaBusiness,
        socialLinks: { ...person.socialLinks, website: input.website },
      } as Professional,
    };
  }
  if (path === "/api/local-seo/settings") {
    const input = z
      .object({
        status: z.enum(["configured", "inactive"]),
        exportAllowed: z.boolean(),
        reviewUrl: safeUrl,
      })
      .parse(body);
    if (user.role !== "admin" && input.exportAllowed !== project.exportAllowed)
      throw Error("Solo administración autoriza exportaciones al contratista.");
    Object.assign(project, input);
    return { detail: "Configuración del perfil SEO actualizada" };
  }
  if (path === "/api/local-seo/content") {
    const input = z
      .object({
        id: z.string().uuid().optional(),
        type: z.enum(["post", "review", "news"]),
        title: text,
        body: z.string().trim().min(1).max(15000),
        image: safeUrl,
        sourceUrl: safeUrl,
        targetUrl: safeUrl,
        keywordIds: z.array(z.string().uuid()).max(25),
        status: z.enum([
          "draft",
          "pending",
          "published",
          "archived",
          "rejected",
        ]),
        publishedAt: z.union([date, z.literal("")]),
        author: text,
        rating: z.number().int().min(1).max(5).nullable(),
        reply: z.string().trim().max(5000),
        evidence: z.string().trim().max(2000),
      })
      .parse(body);
    if (input.keywordIds.some((id) => !keywords.some((k) => k.id === id)))
      throw Error("Hay keywords ajenas al perfil.");
    if (input.type !== "review" && !input.title)
      throw Error("Indica el título.");
    if (
      input.type === "review" &&
      (!input.sourceUrl || !input.author || !input.evidence)
    )
      throw Error(
        "Una reseña requiere autor, fuente y evidencia de autenticidad.",
      );
    if (
      input.status === "published" &&
      (!input.sourceUrl ||
        !input.evidence ||
        !input.publishedAt ||
        Date.parse(input.publishedAt) > Date.now())
    )
      throw Error(
        "Confirma URL, fecha y evidencia de publicación antes de marcar como publicado.",
      );
    const existing = project.contents!.find((c) => c.id === input.id);
    if (input.id && !existing) throw Error("Contenido no disponible.");
    if (
      existing?.type === "review" &&
      ["body", "author", "sourceUrl", "rating", "type"].some(
        (key) => (existing as any)[key] !== (input as any)[key],
      )
    )
      throw Error(
        "El testimonio original se conserva. Solo puedes moderar o actualizar su respuesta.",
      );
    const record = {
      ...input,
      id: input.id || randomUUID(),
      createdAt: existing?.createdAt || now,
      createdBy: existing?.createdBy || user.id,
      updatedAt: now,
      updatedBy: user.id,
    };
    if (existing) Object.assign(existing, record);
    else project.contents!.push(record);
    return {
      detail: `${input.type}: ${input.status}. Registro interno; no se publica automáticamente.`,
    };
  }
  if (path === "/api/local-seo/content-remove") {
    const { id } = z.object({ id: z.string().uuid() }).parse(body);
    const record = project.contents!.find((c) => c.id === id);
    if (!record || record.type === "review" || record.status !== "draft")
      throw Error(
        "Solo se eliminan borradores editoriales; archiva los registros con evidencia histórica.",
      );
    project.contents = project.contents!.filter((c) => c.id !== id);
    return { detail: "Borrador editorial eliminado" };
  }
  if (path === "/api/local-seo/listing") {
    const input = z
      .object({
        directoryId: z.string().uuid(),
        url: safeUrl,
        status: z.enum([
          "pending",
          "in_progress",
          "published",
          "correction",
          "not_applicable",
          "unverified",
        ]),
        verifiedAt: z.union([date, z.literal("")]),
        notes: z.string().trim().max(3000),
        evidence: z.string().trim().max(2000),
      })
      .parse(body);
    const directory = directories.find((d) => d.id === input.directoryId);
    if (!directory) throw Error("Directorio no disponible.");
    const existing = project.listings!.find(
      (l) => l.directoryId === input.directoryId,
    );
    if (!directory.active && !existing)
      throw Error("El directorio está inactivo.");
    if (
      input.status === "published" &&
      (!input.url ||
        input.url.replace(/\/$/, "") === directory.url.replace(/\/$/, "") ||
        !input.verifiedAt ||
        !input.evidence)
    )
      throw Error(
        "Indica la URL específica del negocio, fecha y evidencia de verificación.",
      );
    if (input.verifiedAt && Date.parse(input.verifiedAt) > Date.now())
      throw Error("La verificación no puede ser futura.");
    const record = {
      ...input,
      id: existing?.id || randomUUID(),
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      updatedBy: user.id,
    };
    if (existing) Object.assign(existing, record);
    else project.listings!.push(record);
    return {
      detail:
        "Listado del contratista actualizado; verificación declarada por el equipo SEO.",
    };
  }
  return undefined;
}
