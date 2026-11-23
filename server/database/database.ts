import { PGlite } from "@electric-sql/pglite";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { tables, stateTables } from "./tables";
import { categories, subcategories, services } from "../../src/data/catalog";
import { cityLocation } from "../../src/domain/geography";
import { stateSchema, hasValidRelations } from "../../src/domain/schema";
import type { DemoState } from "../../src/domain/types";
import type { AuthUser } from "../../src/auth/types";
export type StoredAccount = AuthUser & {
  namespace: string;
  salt: string;
  hash: string;
};
type Row = { id: string; parent_id: string; kind: string; data: any };
export class Database {
  readonly sql: PGlite;
  constructor(directory?: string) {
    this.sql = new PGlite(directory);
  }
  async initialize() {
    await this.sql.exec(
      readFileSync(
        new URL("./migrations/001_initial.sql", import.meta.url),
        "utf8",
      ),
    );
    await this.sql.exec(
      readFileSync(
        new URL("./migrations/002_ecosystem.sql", import.meta.url),
        "utf8",
      ),
    );
    await this.sql.exec(
      readFileSync(
        new URL("./migrations/003_local_seo.sql", import.meta.url),
        "utf8",
      ),
    );
    await this.sql.exec(readFileSync(new URL("./migrations/004_seo_management.sql", import.meta.url), "utf8"));
    await this.sql.transaction(async (tx) => {
      await tx.query(
        `INSERT INTO prototype_dataset(namespace,data) VALUES('__catalog__','{}') ON CONFLICT DO NOTHING`,
      );
      for (const [kind, table, rows] of [
        ["category", tables.categories, categories],
        ["subcategory", tables.categories, subcategories],
        ["service", tables.services, services],
      ] as const) {
        await tx.query(
          `DELETE FROM ${table} WHERE namespace='__catalog__' AND kind=$1`,
          [kind],
        );
        await tx.query(
          `INSERT INTO ${table}(namespace,id,position,kind,data) SELECT '__catalog__',value->>'id',ordinality::int,$1,value FROM jsonb_array_elements($2::jsonb) WITH ORDINALITY`,
          [kind, JSON.stringify(rows)],
        );
      }
    });
  }
  async saveState(namespace: string, state: DemoState) {
    const parsed = stateSchema.parse(state);
    if (!hasValidRelations(parsed)) throw Error("Invalid database state");
    await this.sql.transaction(async (tx) => {
      const { professionals, projects, favorites, favoritesByOwner, ...rest } =
        parsed;
      const metadata = {
        version: parsed.version,
        seedRevision: parsed.seedRevision,
        favoriteOwners: Object.keys(favoritesByOwner || {}),
      };
      await tx.query(
        `INSERT INTO prototype_dataset(namespace,data) VALUES($1,$2) ON CONFLICT(namespace) DO UPDATE SET data=excluded.data`,
        [namespace, JSON.stringify(metadata)],
      );
      for (const table of stateTables)
        await tx.query(`DELETE FROM ${table} WHERE namespace=$1`, [namespace]);
      const insert = async (table: string, rows: any[], kind = "") => {
        if (!rows.length) return;
        await tx.query(
          `INSERT INTO ${table}(namespace,id,position,parent_id,kind,data) SELECT $1,COALESCE(value->>'_key',value->>'id'),ordinality::int,COALESCE(value->>'_parent',''),$2,value-'_key'-'_parent' FROM jsonb_array_elements($3::jsonb) WITH ORDINALITY`,
          [namespace, kind, JSON.stringify(rows)],
        );
      };
      await insert(
        tables.professionals,
        professionals.map(({ credentials, portfolio, ...p }) => p),
        "contractor",
      );
      await insert(tables.professionals, rest.team, "team");
      await insert(
        tables.credentials,
        professionals.flatMap((p) =>
          p.credentials.map((c) => ({
            ...c,
            _key: JSON.stringify([p.id, c.id]),
            _parent: p.id,
          })),
        ),
      );
      await insert(
        tables.portfolio,
        professionals.flatMap((p) =>
          p.portfolio.map((c) => ({
            ...c,
            _key: JSON.stringify([p.id, c.id]),
            _parent: p.id,
          })),
        ),
      );
      await insert(
        tables.projects,
        projects.map(({ milestones, ...p }) => p),
      );
      await insert(
        tables.milestones,
        projects.flatMap((p) =>
          p.milestones.map((m) => ({
            ...m,
            _key: JSON.stringify([p.id, m.id]),
            _parent: p.id,
          })),
        ),
      );
      await insert(
        tables.favorites,
        Object.entries({
          "demo-owner": favorites,
          ...favoritesByOwner,
        }).flatMap(([owner, ids]) =>
          ids.map((id) => ({
            id,
            _key: JSON.stringify([owner, id]),
            _parent: owner,
          })),
        ),
      );
      await insert(tables.requests, rest.requests);
      await insert(tables.proposals, rest.proposals);
      await insert(tables.messages, rest.messages);
      await insert(tables.materials, rest.materials);
      await insert(
        tables.audit,
        rest.audit.map((event, index) => ({ ...event, _key: String(index) })),
      );
    });
  }
  async loadStates(): Promise<Map<string, DemoState>> {
    const result = new Map<string, DemoState>();
    for (const dataset of (
      await this.sql.query<{ namespace: string; data: any }>(
        `SELECT namespace,data FROM prototype_dataset WHERE namespace<>'__catalog__' AND data->>'version'='1'`,
      )
    ).rows) {
      const read = async (table: string, kind?: string): Promise<Row[]> =>
        (
          await this.sql.query<Row>(
            `SELECT id,parent_id,kind,data FROM ${table} WHERE namespace=$1 ${kind ? "AND kind=$2" : ""} ORDER BY position`,
            kind ? [dataset.namespace, kind] : [dataset.namespace],
          )
        ).rows;
      const people = await read(tables.professionals, "contractor"),
        credentials = await read(tables.credentials),
        portfolio = await read(tables.portfolio),
        milestones = await read(tables.milestones),
        favoriteRows = await read(tables.favorites);
      const favoritesByOwner: Record<string, string[]> = Object.fromEntries(
        (dataset.data.favoriteOwners || []).map((id: string) => [id, []]),
      );
      for (const row of favoriteRows)
        if (row.parent_id !== "demo-owner")
          (favoritesByOwner[row.parent_id] ||= []).push(row.data.id);
      const state = {
        version: 1,
        seedRevision: dataset.data.seedRevision,
        professionals: people.map((p) => ({
          ...p.data,
          credentials: credentials
            .filter((c) => c.parent_id === p.id)
            .map((c) => c.data),
          portfolio: portfolio
            .filter((c) => c.parent_id === p.id)
            .map((c) => c.data),
        })),
        requests: (await read(tables.requests)).map((r) => r.data),
        proposals: (await read(tables.proposals)).map((r) => r.data),
        projects: (await read(tables.projects)).map((p) => ({
          ...p.data,
          milestones: milestones
            .filter((m) => m.parent_id === p.id)
            .map((m) => m.data),
        })),
        favorites: favoriteRows
          .filter((r) => r.parent_id === "demo-owner")
          .map((r) => r.data.id),
        ...(Object.keys(favoritesByOwner).length ? { favoritesByOwner } : {}),
        messages: (await read(tables.messages)).map((r) => r.data),
        materials: (await read(tables.materials)).map((r) => r.data),
        team: (await read(tables.professionals, "team")).map((r) => r.data),
        audit: (await read(tables.audit)).map((r) => r.data),
      };
      const parsed = stateSchema.parse(state);
      let locationsAdded = false;
      for (const person of parsed.professionals) {
        if (person.location === undefined) {
          person.location = cityLocation(
            person.city,
            person.region,
            person.country,
          );
          locationsAdded = true;
        }
      }
      if (!hasValidRelations(parsed))
        throw Error("Invalid persisted relations");
      result.set(dataset.namespace, parsed);
      if (locationsAdded) await this.saveState(dataset.namespace, parsed);
    }
    return result;
  }
  async saveAccounts(accounts: StoredAccount[]) {
    await this.sql.transaction(async (tx) => {
      for (const account of accounts) {
        await tx.query(
          `INSERT INTO prototype_dataset(namespace,data) VALUES($1,'{}') ON CONFLICT DO NOTHING`,
          [account.namespace],
        );
        await tx.query(
          `INSERT INTO res_users(namespace,id,position,data) VALUES($1,$2,0,$3) ON CONFLICT(namespace,kind,id) DO UPDATE SET data=excluded.data`,
          [account.namespace, account.id, JSON.stringify(account)],
        );
      }
    });
  }
  async loadAccounts(): Promise<StoredAccount[]> {
    return (
      await this.sql.query<{ data: StoredAccount }>(
        `SELECT data FROM res_users ORDER BY namespace,id`,
      )
    ).rows.map((row) => row.data);
  }
  async importLegacy(file: string) {
    const key = "legacy-json:" + resolve(file);
    if (
      (
        await this.sql.query("SELECT id FROM schema_migration WHERE id=$1", [
          key,
        ])
      ).rows.length
    )
      return;
    if (existsSync(file)) {
      for (const [namespace, state] of Object.entries(
        JSON.parse(readFileSync(file, "utf8")),
      )) {
        const parsed = stateSchema.parse(state);
        if (!hasValidRelations(parsed)) throw Error("Invalid legacy relations");
        await this.saveState(namespace, parsed);
      }
    }
    const accountsFile = file.replace(/\.json$/, ".accounts.json");
    if (existsSync(accountsFile))
      await this.saveAccounts(JSON.parse(readFileSync(accountsFile, "utf8")));
    await this.sql.query("INSERT INTO schema_migration(id) VALUES($1)", [key]);
  }
  async close() {
    await this.sql.close();
  }
}
