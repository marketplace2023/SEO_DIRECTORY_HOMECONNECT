import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
// Explicit shell variables take precedence over the optional local file.
const path = fileURLToPath(new URL("../../.env", import.meta.url));
if (existsSync(path)) process.loadEnvFile(path);
