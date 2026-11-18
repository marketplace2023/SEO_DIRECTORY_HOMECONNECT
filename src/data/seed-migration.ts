import { createSeed } from "./seed";
import type { DemoState } from "@/domain/types";

export function upgradeSeed(current: DemoState): DemoState {
  if ((current.seedRevision || 0) >= 2) return current;
  const sample = createSeed();
  const merge = <T extends { id: string }>(existing: T[], added: T[]) => [
    ...existing,
    ...added.filter((row) => !existing.some((item) => item.id === row.id)),
  ];
  return {
    ...current,
    seedRevision: 2,
    professionals: merge(current.professionals, sample.professionals),
    requests: merge(current.requests, sample.requests),
    proposals: merge(current.proposals, sample.proposals),
    projects: merge(current.projects, sample.projects),
    messages: merge(current.messages, sample.messages),
    audit: merge(current.audit, sample.audit),
    favorites: [...new Set([...current.favorites, ...sample.favorites])],
  };
}
