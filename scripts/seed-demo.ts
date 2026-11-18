import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createSeed } from "../src/data/seed";
import { stateSchema, hasValidRelations } from "../src/domain/schema";
import { demoAccounts } from "../src/data/demo-accounts";

const data = createSeed();
stateSchema.parse(data);
if (!hasValidRelations(data))
  throw new Error("Seed contains invalid references");
const output = resolve("public/demo-seed.json");
mkdirSync(resolve("public"), { recursive: true });
writeFileSync(
  output,
  JSON.stringify({ ...data, accounts: demoAccounts }, null, 2) + "\n",
);
console.log(`Seed exported: ${output}`);
console.log(
  `${data.professionals.length} professionals, ${data.requests.length} requests, ${data.proposals.length} proposals, ${data.projects.length} projects, ${data.messages.length} messages`,
);
