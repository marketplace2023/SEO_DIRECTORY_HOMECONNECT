import { z } from "zod";
import { socialLinksSchema } from "./social-links";
import { guestContactSchema } from "./quote-input";
import type { DemoState } from "./types";
import { categories, services } from "@/data/catalog";
const text = z.string();
const localized = z.object({ es: text, en: text });
const credential = z.object({
  id: text,
  name: localized,
  status: z.enum(["declared", "pending", "verified", "rejected"]),
  reference: text,
  note: text,
});

/** Validate references as well as shape when restoring local demo data. */
export function hasValidRelations(state: DemoState): boolean {
  const unique = (items: { id: string }[]) =>
    items.every((item) => item.id.length > 0) &&
    new Set(items.map((item) => item.id)).size === items.length;
  const people = new Map(
    state.professionals.map((person) => [person.id, person]),
  );
  const requests = new Map(
    state.requests.map((request) => [request.id, request]),
  );
  const proposals = new Map(
    state.proposals.map((proposal) => [proposal.id, proposal]),
  );
  return (
    state.professionals.length > 0 &&
    [
      state.professionals,
      state.requests,
      state.proposals,
      state.projects,
      state.messages,
      state.materials,
      state.team,
    ].every(unique) &&
    state.professionals.every(
      (person) =>
        categories.some((category) => category.id === person.categoryId) &&
        person.serviceIds.every((id) =>
          services.some(
            (service) =>
              service.id === id && service.categoryId === person.categoryId,
          ),
        ) &&
        unique(person.credentials) &&
        unique(person.portfolio),
    ) &&
    state.requests.every(
      (request) =>
        services.some(
          (service) =>
            service.id === request.serviceId &&
            service.categoryId === request.categoryId,
        ) &&
        (!request.professionalId || people.has(request.professionalId)),
    ) &&
    state.proposals.every(
      (proposal) =>
        people.has(proposal.professionalId) && requests.has(proposal.requestId),
    ) &&
    state.projects.every((project) => {
      const proposal = proposals.get(project.proposalId);
      return (
        requests.has(project.requestId) &&
        people.has(project.professionalId) &&
        proposal?.requestId === project.requestId &&
        proposal.professionalId === project.professionalId &&
        proposal.status === "accepted" &&
        project.milestones.length > 0 &&
        unique(project.milestones)
      );
    }) &&
    new Set(state.projects.map((project) => project.requestId)).size ===
      state.projects.length &&
    state.favorites.every((id) => people.has(id)) &&
    Object.values(state.favoritesByOwner || {}).every((ids) =>
      ids.every((id) => people.has(id)),
    ) &&
    state.messages.every((message) => people.has(message.professionalId))
  );
}
export const stateSchema: z.ZodType<DemoState> = z.object({
  version: z.literal(1),
  seedRevision: z.number().optional(),
  professionals: z.array(
    z.object({
      id: text,
      fur: text,
      name: text,
      address: text.optional(),
      phone: text.optional(),
      postalCode: text.optional(),
      serviceAreaBusiness: z.boolean().optional(),
      categoryId: text,
      socialLinks: socialLinksSchema.optional(),
      serviceIds: z.array(text),
      city: text,
      region: text,
      country: text,
      coverage: z.array(text),
      location: z
        .object({
          latitude: z.number().min(-90).max(90),
          longitude: z.number().min(-180).max(180),
          precision: z.enum(["city", "public"]),
        })
        .nullable()
        .optional(),
      years: z.number().nonnegative(),
      rating: z.number().min(0).max(5),
      img: text,
      bio: localized,
      publication: z.enum(["published", "draft"]),
      credentials: z.array(credential),
      portfolio: z.array(z.object({ id: text, title: localized, image: text })),
    }),
  ),
  requests: z.array(
    z.object({
      id: text,
      ownerId: text,
      guestContact: guestContactSchema.optional(),
      title: text,
      categoryId: text,
      serviceId: text,
      professionalId: text.optional(),
      location: text,
      description: text,
      budget: z.number().nonnegative().nullable(),
      date: text,
      createdAt: text,
      status: z.enum(["open", "awarded", "cancelled"]),
    }),
  ),
  proposals: z.array(
    z.object({
      id: text,
      requestId: text,
      professionalId: text,
      amount: z.number().positive(),
      currency: z.literal("USD"),
      days: z.number().int().positive(),
      description: text,
      createdAt: text,
      status: z.enum(["submitted", "accepted", "declined"]),
    }),
  ),
  projects: z.array(
    z.object({
      id: text,
      requestId: text,
      proposalId: text,
      title: text,
      professionalId: text,
      amount: z.number().positive(),
      status: z.enum(["active", "completed"]),
      milestones: z.array(
        z.object({ id: text, title: localized, done: z.boolean() }),
      ),
    }),
  ),
  favorites: z.array(text),
  favoritesByOwner: z.record(z.string(), z.array(text)).optional(),
  messages: z.array(
    z.object({
      id: text,
      professionalId: text,
      sender: z.enum(["owner", "contractor"]),
      ownerId: text.optional(),
      text,
      createdAt: text,
    }),
  ),
  materials: z.array(
    z.object({
      id: text,
      name: text,
      unit: text,
      stock: z.number().int().nonnegative(),
      price: z.number().nonnegative(),
    }),
  ),
  team: z.array(z.object({ id: text, name: text, specialty: text })),
  audit: z.array(
    z.object({
      id: text,
      at: text,
      actor: z.enum([
        "visitor",
        "owner",
        "contractor",
        "supplier",
        "business",
        "ally",
        "admin",
      ]),
      action: text,
      entityId: text,
    }),
  ),
});
