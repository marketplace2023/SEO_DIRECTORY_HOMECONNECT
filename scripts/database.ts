import { resolve } from "node:path";
import { Database } from "../server/database/database";
import { tables, nativeTables } from "../server/database/tables";
const origin = process.env.SERVINEXO_API_ORIGIN || "http://127.0.0.1:5190";
let running = false;
try {
  const health = await fetch(origin + "/health", {
    signal: AbortSignal.timeout(1500),
  });
  running = (await health.json()).database === "postgresql-pglite";
} catch {
  /* Offline migration. */
}
if (running) {
  console.log("Database is already migrated by the running API.");
  console.table(
    (await (await fetch(origin + "/api/meta/tables")).json()).tables.map(
      (name: string) => ({
        table: name,
        origin: (nativeTables as readonly string[]).includes(name)
          ? "Odoo"
          : "Custom",
      }),
    ),
  );
} else {
  const file = resolve(
    process.env.SERVINEXO_STATE_FILE || ".local/demo-state.json",
  );
  const database = new Database(
    resolve(process.env.DATABASE_DIR || file.replace(/\.json$/, ".pgdata")),
  );
  try {
    await database.initialize();
    await database.importLegacy(file);
    console.log("Database migrated. Legacy JSON files preserved.");
    console.table(
      Object.values(tables).map((name) => ({
        table: name,
        origin: (nativeTables as readonly string[]).includes(name)
          ? "Odoo"
          : "Custom",
      })),
    );
  } finally {
    await database.close();
  }
}
