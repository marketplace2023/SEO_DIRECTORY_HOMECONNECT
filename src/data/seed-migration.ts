import { createSeed } from "./seed";
import type { DemoState } from "@/domain/types";

export function upgradeSeed(current: DemoState): DemoState {
  if ((current.seedRevision || 0) >= 4) return current;
  const sample = createSeed();
  const merge = <T extends { id: string }>(existing: T[], added: T[]) => [
    ...existing,
    ...added.filter((row) => !existing.some((item) => item.id === row.id)),
  ];
  if (current.seedRevision === 3) {
    const gwinnett = sample.professionals.find(
      (person) => person.id === "demo-gwinnett",
    )!;
    return {
      ...current,
      seedRevision: 4,
      professionals: current.professionals.map((person) =>
        person.id === gwinnett.id &&
        person.city === "Lawrenceville" &&
        person.location?.precision === "city" &&
        person.coverage.join("|") === "Lawrenceville|Gwinnett County"
          ? {
              ...person,
              city: gwinnett.city,
              coverage: gwinnett.coverage,
              location: gwinnett.location,
              bio: {
                es:
                  person.bio.es ===
                  gwinnett.bio.es.replace("Dacula", "Lawrenceville")
                    ? gwinnett.bio.es
                    : person.bio.es,
                en:
                  person.bio.en ===
                  gwinnett.bio.en.replace("Dacula", "Lawrenceville")
                    ? gwinnett.bio.en
                    : person.bio.en,
              },
            }
          : person,
      ),
    };
  }
  if (current.seedRevision === 2)
    return {
      ...current,
      seedRevision: 4,
      professionals: merge(
        current.professionals,
        sample.professionals.filter((person) => person.id.startsWith("demo-")),
      ),
    };
  return {
    ...current,
    seedRevision: 4,
    professionals: merge(current.professionals, sample.professionals),
    requests: merge(current.requests, sample.requests),
    proposals: merge(current.proposals, sample.proposals),
    projects: merge(current.projects, sample.projects),
    messages: merge(current.messages, sample.messages),
    audit: merge(current.audit, sample.audit),
    favorites: [...new Set([...current.favorites, ...sample.favorites])],
  };
}
