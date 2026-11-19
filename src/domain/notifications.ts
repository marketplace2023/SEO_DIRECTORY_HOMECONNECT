import type { DemoState } from "./types";

export function consumerNotifications(state: DemoState, ownerId: string) {
  const requests = state.requests.filter(
    (request) => request.ownerId === ownerId,
  );
  return [
    ...state.proposals
      .filter((proposal) =>
        requests.some((request) => request.id === proposal.requestId),
      )
      .map((proposal) => ({
        id: proposal.id,
        at: proposal.createdAt,
        kind: "proposal" as const,
        professionalId: proposal.professionalId,
        text:
          requests.find((request) => request.id === proposal.requestId)
            ?.title ?? "",
        href: "#/workspace/owner/requests/" + proposal.requestId,
      })),
    ...state.messages
      .filter(
        (message) =>
          message.sender === "contractor" &&
          (message.ownerId || "demo-owner") === ownerId,
      )
      .map((message) => ({
        id: message.id,
        at: message.createdAt,
        kind: "message" as const,
        professionalId: message.professionalId,
        text: message.text,
        href:
          "#/workspace/owner/messages?professional=" +
          encodeURIComponent(message.professionalId),
      })),
  ].sort((a, b) => b.at.localeCompare(a.at));
}
