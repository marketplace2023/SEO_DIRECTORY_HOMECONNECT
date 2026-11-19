import { test, expect } from "@playwright/test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Database } from "../server/database/database";
import { tables } from "../server/database/tables";
import { createSeed } from "../src/data/seed";
import { cityLocation } from "../src/domain/geography";
test("SQL: nombres Odoo, migración conservadora, relaciones y persistencia tras reinicio", async () => {
  test.setTimeout(60000);
  const directory = mkdtempSync(join(tmpdir(), "directory-db-")),
    legacy = join(directory, "state.json"),
    dbPath = join(directory, "pgdata");
  const seed = createSeed();
  seed.favoritesByOwner = { "another-owner": ["ruiz"], empty: [] };
  writeFileSync(legacy, JSON.stringify({ default: seed }));
  const account = {
    id: "existing",
    namespace: "default",
    name: "Existing account",
    email: "existing@example.test",
    role: "owner" as const,
    demo: false,
    salt: "original-salt",
    hash: "original-hash",
  };
  writeFileSync(
    join(directory, "state.accounts.json"),
    JSON.stringify([account]),
  );
  let db = new Database(dbPath);
  try {
    await db.initialize();
    await db.importLegacy(legacy);
    const names = (
      await db.sql.query<{ table_name: string }>(
        "SELECT table_name FROM information_schema.tables WHERE table_schema='public'",
      )
    ).rows.map((r) => r.table_name);
    expect(names.sort()).toEqual(Object.values(tables).sort());
    expect(
      names.some((n) => n.startsWith("servinexo_") || n.startsWith("yelp_")),
    ).toBe(false);
    expect((await db.loadStates()).get("default")).toEqual(seed);
    expect(await db.loadAccounts()).toEqual([account]);
    expect(
      (await db.sql.query("SELECT * FROM contractor_credential")).rows.length,
    ).toBe(
      seed.professionals.reduce((count, p) => count + p.credentials.length, 0),
    );
    await expect(
      db.sql.transaction(async (tx) => {
        await tx.query("DELETE FROM res_partner WHERE namespace='default'");
        throw Error("rollback-test");
      }),
    ).rejects.toThrow("rollback-test");
    expect((await db.loadStates()).get("default")).toEqual(seed);
    const changed = structuredClone(seed);
    changed.professionals[0].name = "Persisted modification";
    changed.professionals[0].location = {
      latitude: 25.8,
      longitude: -80.2,
      precision: "public",
    };
    await db.saveState("default", changed);
    await db.saveState("isolated", seed);
    const oldGeography = structuredClone(seed);
    delete oldGeography.professionals[0].location;
    await db.saveState("old-geography", oldGeography);
    await db.close();
    writeFileSync(legacy, JSON.stringify({ default: seed }));
    db = new Database(dbPath);
    await db.initialize();
    await db.importLegacy(legacy);
    expect((await db.loadStates()).get("default")?.professionals[0].name).toBe(
      "Persisted modification",
    );
    expect((await db.loadStates()).get("isolated")).toEqual(seed);
    expect(
      (await db.loadStates()).get("default")?.professionals[0].location,
    ).toEqual(changed.professionals[0].location);
    expect(
      (await db.loadStates()).get("old-geography")?.professionals[0].location,
    ).toEqual(
      cityLocation(
        seed.professionals[0].city,
        seed.professionals[0].region,
        seed.professionals[0].country,
      ),
    );
    expect(await db.loadAccounts()).toEqual([account]);
  } finally {
    await db.close();
  }
});
