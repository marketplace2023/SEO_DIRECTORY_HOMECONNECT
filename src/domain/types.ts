import type { SocialLinks } from "./social-links";

export type Language = "es" | "en";
export type Localized = { es: string; en: string };
export type Role =
  | "visitor"
  | "owner"
  | "contractor"
  | "supplier"
  | "business"
  | "ally"
  | "admin";
export type EvidenceState = "declared" | "pending" | "verified" | "rejected";
export type PublicationState = "published" | "draft";
export type Category = {
  id: string;
  name: Localized;
  reference: number;
  description: Localized;
  excluded: Localized;
  illustration: string;
  image: string;
  included: Localized[];
  concept?: Localized;
  when?: Localized;
};
export type Subcategory = {
  id: string;
  categoryId: string;
  name: Localized;
  image: string;
  concept?: Localized;
  when?: Localized;
};
export type Service = {
  id: string;
  categoryId: string;
  subcategoryId: string;
  name: Localized;
  additionalSubcategoryIds?: string[];
  scope?: Localized;
  requirements?: Localized;
  completion?: Localized;
  separate?: Localized;
  mode:
    | "installation"
    | "repair"
    | "maintenance"
    | "assessment"
    | "design"
    | "cleaning";
};
export type Professional = {
  id: string;
  fur: string;
  name: string;
  address?: string;
  phone?: string;
  postalCode?: string;
  serviceAreaBusiness?: boolean;
  categoryId: string;
  serviceIds: string[];
  city: string;
  region: string;
  country: string;
  coverage: string[];
  location?: {
    latitude: number;
    longitude: number;
    precision: "city" | "public";
  } | null;
  years: number;
  rating: number;
  img: string;
  bio: Localized;
  socialLinks?: SocialLinks;
  publication: PublicationState;
  credentials: {
    id: string;
    name: Localized;
    status: EvidenceState;
    reference: string;
    note: string;
  }[];
  portfolio: { id: string; title: Localized; image: string }[];
};
export type QuoteRequest = {
  id: string;
  ownerId: string;
  guestContact?: { name: string; email: string; phone?: string };
  title: string;
  categoryId: string;
  serviceId: string;
  professionalId?: string;
  location: string;
  description: string;
  budget: number | null;
  date: string;
  createdAt: string;
  status: "open" | "awarded" | "cancelled";
};
export type Proposal = {
  id: string;
  requestId: string;
  contractorEstimateId?: string;
  professionalId: string;
  amount: number;
  currency: "USD";
  days: number;
  description: string;
  createdAt: string;
  status: "submitted" | "accepted" | "declined";
};
export type Project = {
  id: string;
  requestId: string;
  proposalId: string;
  title: string;
  professionalId: string;
  amount: number;
  status: "active" | "completed";
  milestones: { id: string; title: Localized; done: boolean }[];
};
export type Message = {
  id: string;
  professionalId: string;
  ownerId?: string;
  sender: "owner" | "contractor";
  text: string;
  createdAt: string;
};
export type Material = {
  id: string;
  name: string;
  unit: string;
  stock: number;
  price: number;
};
export type TeamMember = { id: string; name: string; specialty: string };
export type AuditEvent = {
  id: string;
  at: string;
  actor: Role;
  action: string;
  entityId: string;
};
export type DemoState = {
  version: 1;
  seedRevision?: number;
  professionals: Professional[];
  requests: QuoteRequest[];
  proposals: Proposal[];
  projects: Project[];
  favorites: string[];
  favoritesByOwner?: Record<string, string[]>;
  messages: Message[];
  materials: Material[];
  team: TeamMember[];
  audit: AuditEvent[];
};
export const roleNames: Record<Role, Localized> = {
  visitor: { es: "Visitante", en: "Visitor" },
  owner: { es: "Consumidor / propietario", en: "Consumer / homeowner" },
  contractor: { es: "Contratista", en: "Contractor" },
  supplier: { es: "Proveedor", en: "Supplier" },
  business: { es: "Empresa", en: "Business" },
  ally: { es: "Institución / aliado", en: "Institution / partner" },
  admin: { es: "Administración", en: "Administration" },
};
export const evidenceNames: Record<EvidenceState, Localized> = {
  declared: { es: "Declarado", en: "Declared" },
  pending: { es: "En revisión", en: "In review" },
  verified: { es: "Verificado · demo", en: "Verified · demo" },
  rejected: { es: "Requiere cambios", en: "Changes needed" },
};
export const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
export const money = (value: number, lang: Language) =>
  new Intl.NumberFormat(lang === "es" ? "es-VE" : "en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
