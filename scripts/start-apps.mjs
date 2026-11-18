import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { acquireInstance, releaseInstance, portInUse } from "./dev-runtime.mjs";

const root = process.cwd();
const vite = resolve(root, "node_modules/vite/bin/vite.js");
const force = process.argv.includes("--force") ? ["--force"] : [];
const children = [];
const marker = resolve(root, ".local/dev-instance.json");
const ports = [
  ["web", 5175],
  ["contractor", 5180],
  ["admin", 5181],
  ["demo-api", Number(process.env.SERVINEXO_API_PORT || 5190)],
];
const printUrls = () => {
  for (const [name, port] of ports)
    console.log(
      `[${name}] http://127.0.0.1:${port}${name === "demo-api" ? "/health" : "/"}`,
    );
};
const lock = acquireInstance(marker);
if (!lock.owned) {
  console.log(
    `HOME CONNECT ya tiene una instancia de desarrollo${lock.instance?.pid ? ` (PID ${lock.instance.pid})` : ""}. No se iniciarán procesos duplicados.`,
  );
  printUrls();
  if (force.length)
    console.log(
      "Para regenerar la caché, detén primero la instancia existente y ejecuta npm run dev:refresh.",
    );
} else await start();

async function start() {
  const occupied = (
    await Promise.all(
      ports.map(async ([name, port]) =>
        (await portInUse(port)) ? `${name}: ${port}` : null,
      ),
    )
  ).filter(Boolean);
  if (occupied.length) {
    console.error(
      `No se inició el entorno: puertos ocupados (${occupied.join(", ")}). Detén la instancia anterior desde su terminal y vuelve a ejecutar npm run dev.`,
    );
    releaseInstance(marker, lock.instance);
    process.exitCode = 1;
    return;
  }
  let stopping = false;
  function stop(code = 0) {
    if (stopping) return;
    stopping = true;
    for (const child of children) child.kill();
    process.exitCode = code;
  }
  process.on("exit", () => releaseInstance(marker, lock.instance));
  process.on("SIGINT", () => stop());
  process.on("SIGTERM", () => stop());
  for (const [name, args, cwd] of [
    [
      "demo-api",
      ["--import", "tsx", resolve(root, "scripts/demo-api.ts")],
      root,
    ],
    ["web", [vite, "--host", "127.0.0.1", ...force], root],
    [
      "contractor",
      [vite, "--host", "127.0.0.1", ...force],
      resolve(root, "apps/contractor"),
    ],
    [
      "admin",
      [vite, "--host", "127.0.0.1", ...force],
      resolve(root, "apps/admin"),
    ],
  ]) {
    const child = spawn(process.execPath, args, {
      cwd,
      env: process.env,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    children.push(child);
    child.stdout.on("data", (data) =>
      process.stdout.write(`[${name}] ${data}`),
    );
    child.stderr.on("data", (data) =>
      process.stderr.write(`[${name}] ${data}`),
    );
    child.on("exit", (code) => {
      if (!stopping) {
        console.error(
          `[${name}] El proceso terminó; se cerrarán los procesos de esta instancia.`,
        );
        stop(code || 1);
      }
    });
    child.on("error", (error) => {
      console.error(`[${name}] ${error.message}`);
      stop(1);
    });
  }
}
