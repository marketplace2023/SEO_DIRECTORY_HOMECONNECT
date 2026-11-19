import "../server/config/env";
import { randomBytes, scryptSync } from "node:crypto";
import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { z } from "zod";
import { Database } from "../server/database/database";
import { createSeed } from "../src/data/seed";

// One-time provisioning from a private mounted file, never public seed passwords.
const filename = process.env.HOME_CONNECT_BOOTSTRAP_FILE;
if (filename && existsSync(filename)) {
  const inputs = z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(2),
        email: z.string().email(),
        password: z.string().min(20),
        role: z.enum(["owner", "contractor", "admin"]),
        professionalId: z.string().optional(),
      }),
    )
    .parse(JSON.parse(readFileSync(filename, "utf8")));
  const database = new Database(process.env.DATABASE_DIR);
  try {
    await database.initialize();
    if (!(await database.loadStates()).has("default"))
      await database.saveState("default", createSeed());
    const existing = await database.loadAccounts();
    for (const { password, ...input } of inputs) {
      if (
        existing.some(
          (account) =>
            account.namespace === "default" &&
            (account.id === input.id || account.email === input.email),
        )
      )
        continue;
      const salt = randomBytes(16).toString("hex");
      await database.saveAccounts([
        {
          ...input,
          namespace: "default",
          salt,
          hash: scryptSync(password, salt, 64).toString("hex"),
          demo: false,
          emailVerified: true,
        },
      ]);
    }
    console.log(
      "Private initial accounts provisioned; existing accounts preserved.",
    );
    unlinkSync(filename);
  } finally {
    await database.close();
  }
}
