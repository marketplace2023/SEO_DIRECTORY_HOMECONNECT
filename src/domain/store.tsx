import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createSeed } from "@/data/seed";
import { upgradeSeed } from "@/data/seed-migration";
import { services } from "@/data/catalog";
import { stateSchema, hasValidRelations } from "./schema";
import { demoPost, demoEndpoint } from "./demo-client";
import { socialLinksSchema, type SocialLinks } from "./social-links";
import { useAuth } from "@/auth/auth-provider";
import { readToken } from "@/auth/auth-client";
import { normalize } from "./types";
import { cityLocation } from "./geography";
import type {
  DemoState,
  Role,
  QuoteRequest,
  Proposal,
  EvidenceState,
  Material,
  TeamMember,
  Professional,
} from "./types";

export const STORAGE_KEY = "servinexo.ecosystem.v1";
type Command =
  | {
      type: "request";
      value: Omit<QuoteRequest, "id" | "createdAt" | "ownerId" | "status">;
    }
  | {
      type: "proposal";
      value: Pick<Proposal, "requestId" | "amount" | "days" | "description" | "contractorEstimateId">;
    }
  | { type: "accept"; proposalId: string }
  | { type: "cancel"; requestId: string }
  | { type: "milestone"; projectId: string; milestoneId: string }
  | { type: "favorite"; professionalId: string }
  | { type: "message"; professionalId: string; text: string; ownerId?: string }
  | { type: "credential"; credentialId: string; reference: string }
  | {
      type: "review";
      professionalId: string;
      credentialId: string;
      status: EvidenceState;
      note: string;
    }
  | { type: "publication"; professionalId: string }
  | {
      type: "profile";
      socialLinks?: SocialLinks;
      name: string;
      city: string;
      coverage: string[];
      bio: string;
      language: "es" | "en";
      location?: Professional["location"];
    }
  | { type: "material"; value: Omit<Material, "id">; materialId?: string }
  | { type: "member"; value: Omit<TeamMember, "id"> }
  | { type: "reset" };
type Action = Command & {
  actor: Role;
  actingProfessional: string;
  id: string;
  at: string;
  actorId?: string;
};
type StoreAction = Action | { type: "hydrate"; value: DemoState };
const allowedRequests = (state: DemoState, professionalId: string) =>
  state.requests.filter(
    (r) =>
      r.status === "open" &&
      state.professionals.some(
        (p) => p.id === professionalId && p.publication === "published",
      ) &&
      state.professionals
        .find((p) => p.id === professionalId)
        ?.coverage.some((area) =>
          normalize(r.location).includes(normalize(area)),
        ) &&
      (r.professionalId
        ? r.professionalId === professionalId
        : state.professionals
            .find((p) => p.id === professionalId)
            ?.serviceIds.includes(r.serviceId)),
  );
export { allowedRequests };

export function reducer(state: DemoState, action: StoreAction): DemoState {
  if (action.type === "hydrate") return action.value;
  const audit = (next: DemoState, entityId: string) => ({
    ...next,
    audit: [
      {
        id: action.id,
        at: action.at,
        actor: action.actor,
        action: action.type,
        entityId,
      },
      ...next.audit,
    ].slice(0, 500),
  });
  switch (action.type) {
    case "request": {
      if (
        action.actor !== "owner" ||
        !action.value.title.trim() ||
        !action.value.description.trim() ||
        !action.value.location.trim()
      )
        return state;
      const service = services.find(
        (s) =>
          s.id === action.value.serviceId &&
          s.categoryId === action.value.categoryId,
      );
      const recipient =
        action.value.professionalId &&
        state.professionals.find((p) => p.id === action.value.professionalId);
      if (
        !service ||
        (action.value.budget !== null &&
          (!Number.isFinite(action.value.budget) || action.value.budget < 0)) ||
        (action.value.professionalId &&
          (!recipient ||
            recipient.publication !== "published" ||
            !recipient.serviceIds.includes(service.id)))
      )
        return state;
      return audit(
        {
          ...state,
          requests: [
            {
              ...action.value,
              id: action.id,
              ownerId: action.actorId || "demo-owner",
              status: "open",
              createdAt: action.at,
            },
            ...state.requests,
          ],
        },
        action.id,
      );
    }
    case "proposal": {
      if (
        action.actor !== "contractor" ||
        !allowedRequests(state, action.actingProfessional).some(
          (r) => r.id === action.value.requestId,
        ) ||
        state.proposals.some(
          (p) =>
            p.requestId === action.value.requestId &&
            p.professionalId === action.actingProfessional,
        ) ||
        !Number.isFinite(action.value.amount) ||
        action.value.amount <= 0 ||
        !Number.isInteger(action.value.days) ||
        action.value.days < 1 ||
        !action.value.description.trim()
      )
        return state;
      return audit(
        {
          ...state,
          proposals: [
            {
              ...action.value,
              professionalId: action.actingProfessional,
              id: action.id,
              currency: "USD",
              createdAt: action.at,
              status: "submitted",
            },
            ...state.proposals,
          ],
        },
        action.id,
      );
    }
    case "accept": {
      const proposal = state.proposals.find(
        (p) => p.id === action.proposalId && p.status === "submitted",
      );
      const request =
        proposal &&
        state.requests.find(
          (r) =>
            r.id === proposal.requestId &&
            r.status === "open" &&
            r.ownerId === (action.actorId || "demo-owner"),
        );
      if (
        action.actor !== "owner" ||
        !proposal ||
        !request ||
        state.projects.some((p) => p.requestId === request.id)
      )
        return state;
      return audit(
        {
          ...state,
          requests: state.requests.map((r) =>
            r.id === request.id ? { ...r, status: "awarded" } : r,
          ),
          proposals: state.proposals.map((p) =>
            p.requestId === request.id
              ? { ...p, status: p.id === proposal.id ? "accepted" : "declined" }
              : p,
          ),
          projects: [
            {
              id: action.id,
              requestId: request.id,
              proposalId: proposal.id,
              title: request.title,
              professionalId: proposal.professionalId,
              amount: proposal.amount,
              status: "active",
              milestones: [
                {
                  id: "planning",
                  title: {
                    es: "Visita y planificación",
                    en: "Site visit and planning",
                  },
                  done: false,
                },
                {
                  id: "work",
                  title: {
                    es: "Ejecución del trabajo",
                    en: "Work in progress",
                  },
                  done: false,
                },
                {
                  id: "delivery",
                  title: {
                    es: "Entrega y revisión final",
                    en: "Delivery and final review",
                  },
                  done: false,
                },
              ],
            },
            ...state.projects,
          ],
        },
        action.id,
      );
    }
    case "cancel": {
      if (
        action.actor !== "owner" ||
        !state.requests.some(
          (r) =>
            r.id === action.requestId &&
            r.status === "open" &&
            r.ownerId === (action.actorId || "demo-owner"),
        )
      )
        return state;
      return audit(
        {
          ...state,
          requests: state.requests.map((r) =>
            r.id === action.requestId ? { ...r, status: "cancelled" } : r,
          ),
          proposals: state.proposals.map((p) =>
            p.requestId === action.requestId ? { ...p, status: "declined" } : p,
          ),
        },
        action.requestId,
      );
    }
    case "milestone": {
      const project = state.projects.find(
        (p) =>
          p.id === action.projectId &&
          p.professionalId === action.actingProfessional &&
          p.status === "active",
      );
      if (
        action.actor !== "contractor" ||
        !project ||
        !project.milestones.some((m) => m.id === action.milestoneId)
      )
        return state;
      const milestones = project.milestones.map((m) =>
        m.id === action.milestoneId ? { ...m, done: !m.done } : m,
      );
      return audit(
        {
          ...state,
          projects: state.projects.map((p) =>
            p.id === project.id
              ? {
                  ...p,
                  milestones,
                  status: milestones.every((m) => m.done)
                    ? "completed"
                    : "active",
                }
              : p,
          ),
        },
        project.id,
      );
    }
    case "favorite": {
      if (
        action.actor !== "owner" ||
        !state.professionals.some((p) => p.id === action.professionalId)
      )
        return state;
      const ownerId = action.actorId || "demo-owner";
      const favorites =
        ownerId === "demo-owner"
          ? state.favorites
          : state.favoritesByOwner?.[ownerId] || [];
      const next = favorites.includes(action.professionalId)
        ? favorites.filter((id) => id !== action.professionalId)
        : [...favorites, action.professionalId];
      return {
        ...state,
        ...(ownerId === "demo-owner"
          ? { favorites: next }
          : {
              favoritesByOwner: { ...state.favoritesByOwner, [ownerId]: next },
            }),
      };
    }
    case "message": {
      if (
        !["owner", "contractor"].includes(action.actor) ||
        !action.text.trim() ||
        !state.professionals.some((p) => p.id === action.professionalId) ||
        (action.actor === "contractor" &&
          action.professionalId !== action.actingProfessional)
      )
        return state;
      return {
        ...state,
        messages: [
          ...state.messages,
          {
            id: action.id,
            professionalId: action.professionalId,
            ownerId:
              action.actor === "owner"
                ? action.actorId || "demo-owner"
                : action.ownerId || "demo-owner",
            sender: action.actor as "owner" | "contractor",
            text: action.text.trim(),
            createdAt: action.at,
          },
        ],
      };
    }
    case "credential": {
      if (action.actor !== "contractor" || !action.reference.trim())
        return state;
      return audit(
        {
          ...state,
          professionals: state.professionals.map((p) =>
            p.id === action.actingProfessional
              ? {
                  ...p,
                  credentials: p.credentials.map((c) =>
                    c.id === action.credentialId
                      ? {
                          ...c,
                          reference: action.reference.trim(),
                          status: "pending",
                          note: "",
                        }
                      : c,
                  ),
                }
              : p,
          ),
        },
        action.credentialId,
      );
    }
    case "review": {
      if (
        !["admin", "ally"].includes(action.actor) ||
        !["verified", "rejected"].includes(action.status) ||
        (action.status === "rejected" && !action.note.trim())
      )
        return state;
      const target = state.professionals.find(
        (p) => p.id === action.professionalId,
      );
      if (
        !target?.credentials.some(
          (c) => c.id === action.credentialId && c.status === "pending",
        )
      )
        return state;
      return audit(
        {
          ...state,
          professionals: state.professionals.map((p) =>
            p.id === action.professionalId
              ? {
                  ...p,
                  credentials: p.credentials.map((c) =>
                    c.id === action.credentialId
                      ? { ...c, status: action.status, note: action.note }
                      : c,
                  ),
                }
              : p,
          ),
        },
        action.credentialId,
      );
    }
    case "publication": {
      if (action.actor !== "admin") return state;
      return audit(
        {
          ...state,
          professionals: state.professionals.map((p) =>
            p.id === action.professionalId
              ? {
                  ...p,
                  publication:
                    p.publication === "published" ? "draft" : "published",
                }
              : p,
          ),
        },
        action.professionalId,
      );
    }
    case "profile": {
      if (
        action.actor !== "contractor" ||
        !action.name.trim() ||
        !action.city.trim() ||
        !action.bio.trim() ||
        (action.socialLinks !== undefined &&
          !socialLinksSchema.safeParse(action.socialLinks).success) ||
        !action.coverage.length
      )
        return state;
      return audit(
        {
          ...state,
          professionals: state.professionals.map((p) =>
            p.id === action.actingProfessional
              ? {
                  ...p,
                  name: action.name.trim(),
                  city: action.city.trim(),
                  location:
                    action.location !== undefined
                      ? action.location
                      : p.city !== action.city.trim()
                        ? cityLocation(action.city.trim(), p.region, p.country)
                        : p.location,
                  coverage: action.coverage,
                  bio: { ...p.bio, [action.language]: action.bio.trim() },
                  socialLinks:
                    action.socialLinks === undefined
                      ? p.socialLinks
                      : socialLinksSchema.parse(action.socialLinks),
                }
              : p,
          ),
        },
        action.actingProfessional,
      );
    }
    case "material": {
      if (
        action.actor !== "supplier" ||
        !action.value.name.trim() ||
        !action.value.unit.trim() ||
        !Number.isInteger(action.value.stock) ||
        action.value.stock < 0 ||
        !Number.isFinite(action.value.price) ||
        action.value.price < 0
      )
        return state;
      const value = { ...action.value, id: action.materialId || action.id };
      return audit(
        {
          ...state,
          materials: action.materialId
            ? state.materials.map((m) =>
                m.id === action.materialId ? value : m,
              )
            : [...state.materials, value],
        },
        value.id,
      );
    }
    case "member": {
      if (
        action.actor !== "business" ||
        !action.value.name.trim() ||
        !action.value.specialty.trim()
      )
        return state;
      return audit(
        { ...state, team: [...state.team, { ...action.value, id: action.id }] },
        action.id,
      );
    }
    case "reset":
      return action.actor === "admin" ? createSeed() : state;
  }
}
function load(): DemoState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = stateSchema.safeParse(JSON.parse(raw));
      if (parsed.success && hasValidRelations(parsed.data))
        return upgradeSeed(parsed.data);
    }
  } catch {
    /* Browsers may disallow storage. */
  }
  return createSeed();
}
type Store = {
  state: DemoState;
  role: Role;
  setRole: (role: Role) => void;
  professionalId: string;
  setProfessionalId: (id: string) => void;
  send: (command: Command) => string;
  storageError: boolean;
  syncError: boolean;
};
const Context = createContext<Store | null>(null);
export function StoreProvider({
  children,
  initialRole = "owner",
}: {
  children: ReactNode;
  initialRole?: Role;
}) {
  const { user, checking } = useAuth();
  const [state, dispatch] = useReducer(reducer, undefined, load);
  const [role, setRole] = useState<Role>(initialRole);
  const [professionalId, setProfessionalId] = useState(
    state.professionals[0].id,
  );
  const [storageError, setStorageError] = useState(false);
  const [syncError, setSyncError] = useState(false);
  const transport = useRef({
    pending: 0,
    dirty: false,
    tail: Promise.resolve() as Promise<unknown>,
  });
  useEffect(() => {
    if (user?.professionalId) setProfessionalId(user.professionalId);
  }, [user?.professionalId]);
  useEffect(() => {
    if (checking) return;
    let active = true;
    sessionStorage.setItem("homeconnect.professional", professionalId);
    const initial = load();
    const boot = demoPost("/api/demo/bootstrap", initial).then((remote) => {
      if (active && transport.current.pending === 0)
        dispatch({ type: "hydrate", value: remote });
      if (active) setSyncError(false);
    });
    transport.current.tail = boot.catch(() => {
      if (active) setSyncError(true);
    });
    let stream: EventSource | undefined;
    let reconnect: number | undefined;
    const connect = async () => {
      let endpoint = demoEndpoint("/api/demo/events");
      if (user) {
        const response = await fetch(demoEndpoint("/api/demo/stream-ticket"), {
          method: "POST",
          headers: { Authorization: `Bearer ${readToken()}` },
        });
        if (!response.ok) throw Error("Session unavailable");
        const { ticket } = await response.json();
        endpoint += "&ticket=" + ticket;
      }
      if (!active) return;
      stream = new EventSource(endpoint);
      stream.onmessage = (event) => {
        if (!active || transport.current.pending || transport.current.dirty)
          return;
        try {
          const parsed = stateSchema.safeParse(JSON.parse(event.data));
          if (parsed.success && hasValidRelations(parsed.data)) {
            dispatch({ type: "hydrate", value: parsed.data });
            setSyncError(false);
          }
        } catch {
          /* Ignore incomplete events. */
        }
      };
      stream.onerror = () => {
        stream?.close();
        if (active) {
          setSyncError(true);
          reconnect = window.setTimeout(() => {
            void connect().catch(() => setSyncError(true));
          }, 2000);
        }
      };
    };
    void connect().catch(() => {
      if (active) setSyncError(true);
    });
    return () => {
      active = false;
      stream?.close();
      window.clearTimeout(reconnect);
    };
  }, [user?.id, professionalId, checking]);
  useEffect(() => {
    const receive = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      try {
        const parsed = stateSchema.safeParse(JSON.parse(event.newValue));
        if (parsed.success && hasValidRelations(parsed.data))
          dispatch({ type: "hydrate", value: upgradeSeed(parsed.data) });
      } catch {
        /* Ignore incomplete external updates. */
      }
    };
    window.addEventListener("storage", receive);
    return () => window.removeEventListener("storage", receive);
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [state]);
  return (
    <Context.Provider
      value={{
        state:
          role === "owner"
            ? {
                ...state,
                requests: state.requests.filter(
                  (r) => r.ownerId === (user?.id || "demo-owner"),
                ),
                projects: state.projects.filter((p) =>
                  state.requests.some(
                    (r) =>
                      r.id === p.requestId &&
                      r.ownerId === (user?.id || "demo-owner"),
                  ),
                ),
                favorites:
                  user?.id && user.id !== "demo-owner"
                    ? state.favoritesByOwner?.[user.id] || []
                    : state.favorites,
                messages: state.messages.filter(
                  (m) =>
                    (m.ownerId || "demo-owner") === (user?.id || "demo-owner"),
                ),
              }
            : state,
        role,
        setRole,
        professionalId,
        setProfessionalId: (id) => {
          sessionStorage.setItem("homeconnect.professional", id);
          setProfessionalId(id);
        },
        storageError,
        syncError,
        send: (command) => {
          if (!user) {
            window.location.hash =
              "/login?next=" +
              encodeURIComponent(window.location.hash.slice(1));
            return "";
          }
          const id = crypto.randomUUID();
          const action: Action = {
            ...command,
            actor: role,
            actingProfessional: professionalId,
            id,
            at: new Date().toISOString(),
            actorId: user.id,
          };
          dispatch(action);
          transport.current.pending++;
          transport.current.tail = transport.current.tail
            .then(() => demoPost("/api/demo/commands", action))
            .then((remote) => {
              transport.current.pending--;
              if (transport.current.pending === 0 && !transport.current.dirty)
                dispatch({ type: "hydrate", value: remote });
              setSyncError(false);
            })
            .catch(() => {
              transport.current.pending--;
              transport.current.dirty = true;
              setSyncError(true);
            });
          return id;
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useStore() {
  const store = useContext(Context);
  if (!store) throw new Error("StoreProvider is required");
  return store;
}
