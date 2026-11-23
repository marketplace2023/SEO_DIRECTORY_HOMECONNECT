import type { DemoState, Professional } from "../../src/domain/types";
import type { AuthUser } from "../../src/auth/types";
import { allowedRequests } from "../../src/domain/store";
import { isUsProfessional } from "../../src/domain/us-area";
export function visibleState(
  state: DemoState,
  user: AuthUser | null,
  ownerName?: (id: string) => string | undefined,
): DemoState {
  if (user?.role === "admin") return structuredClone(state);
  const professionalId = user?.professionalId;
  const requests =
    user?.role === "owner"
      ? state.requests.filter((r) => r.ownerId === user.id)
      : user?.role === "contractor"
        ? state.requests.filter(
            (r) =>
              allowedRequests(state, professionalId || "").some(
                (a) => a.id === r.id,
              ) ||
              state.proposals.some(
                (p) =>
                  p.requestId === r.id && p.professionalId === professionalId,
              ),
          )
        : [];
  const proposals =
    user?.role === "owner"
      ? state.proposals.filter((p) =>
          requests.some((r) => r.id === p.requestId),
        )
      : user?.role === "contractor"
        ? state.proposals.filter((p) => p.professionalId === professionalId)
        : [];
  const projects = state.projects.filter((p) =>
    proposals.some((q) => q.id === p.proposalId),
  );
  const ownedFavorites =
    user?.role === "owner"
      ? user.id === "demo-owner"
        ? state.favorites
        : state.favoritesByOwner?.[user.id] || []
      : [];
  const messages = state.messages.filter((m) =>
    user?.role === "owner"
      ? (m.ownerId || "demo-owner") === user.id
      : user?.role === "contractor"
        ? m.professionalId === professionalId
        : false,
  );
  const required = new Set([
    ...ownedFavorites,
    ...proposals.map((p) => p.professionalId),
    ...requests.map((r) => r.professionalId).filter(Boolean),
    ...messages.map((message) => message.professionalId),
  ]);
  const professionals = state.professionals
    .filter(
      (p) =>
        (p.publication === "published" && isUsProfessional(p)) ||
        p.id === professionalId ||
        required.has(p.id),
    )
    .map((p) =>
      p.id === professionalId
        ? structuredClone(p)
        : ({
            ...p,
            vipRequested: undefined,
            credentials: p.credentials.map((c) => ({
              ...c,
              reference: "",
              note: "",
            })),
          } as Professional),
    );
  const favorites =
    user?.role === "owner"
      ? user.id === "demo-owner"
        ? state.favorites
        : state.favoritesByOwner?.[user.id] || []
      : [];
  return {
    ...state,
    professionals,
    requests,
    proposals,
    projects,
    estimating:
      user?.role === "contractor" && state.estimating
        ? {
            parts: state.estimating.parts.filter(
              (row) => row.professionalId === professionalId,
            ),
            measurements: state.estimating.measurements.filter(
              (row) =>
                row.professionalId === professionalId &&
                requests.some((request) => request.id === row.requestId),
            ),
            valuations: state.estimating.valuations.filter((row) =>
              proposals.some((proposal) => proposal.id === row.proposalId),
            ),
          }
        : undefined,
    messages:
      user?.role === "contractor" && ownerName
        ? messages.map((m) => ({
            ...m,
            ownerName: ownerName(m.ownerId || "demo-owner"),
          }))
        : messages,
    favorites,
    favoritesByOwner:
      user?.role === "owner" && user.id !== "demo-owner"
        ? { [user.id]: favorites }
        : {},
    materials: [],
    team: [],
    audit: [],
  };
}
