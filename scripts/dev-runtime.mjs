import { createConnection } from "node:net";
import {
  openSync,
  writeFileSync,
  readFileSync,
  closeSync,
  unlinkSync,
  mkdirSync,
} from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";

export function portInUse(port) {
  return new Promise((resolve) => {
    const socket = createConnection({ host: "127.0.0.1", port });
    const done = (value) => {
      socket.destroy();
      resolve(value);
    };
    socket.once("connect", () => done(true));
    socket.once("error", () => done(false));
    socket.setTimeout(1000, () => done(true));
  });
}
export function acquireInstance(path) {
  mkdirSync(dirname(path), { recursive: true });
  const instance = { pid: process.pid, token: randomUUID() };
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const fd = openSync(path, "wx");
      try {
        writeFileSync(fd, JSON.stringify(instance));
      } finally {
        closeSync(fd);
      }
      return { owned: true, instance };
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      let previous;
      try {
        previous = JSON.parse(readFileSync(path, "utf8"));
      } catch {
        return { owned: false, instance: null };
      }
      if (!Number.isSafeInteger(previous.pid) || previous.pid <= 0)
        return { owned: false, instance: previous };
      try {
        process.kill(previous.pid, 0);
        return { owned: false, instance: previous };
      } catch (error) {
        if (error.code !== "ESRCH") return { owned: false, instance: previous };
      }
      // Remove only the stale marker we just inspected, never another process.
      try {
        if (JSON.parse(readFileSync(path, "utf8")).token === previous.token)
          unlinkSync(path);
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
    }
  }
  throw Error("No se pudo reservar la instancia de desarrollo.");
}
export function releaseInstance(path, instance) {
  try {
    const current = JSON.parse(readFileSync(path, "utf8"));
    if (current.token === instance.token && current.pid === instance.pid)
      unlinkSync(path);
  } catch (error) {
    if (error.code !== "ENOENT")
      console.error(
        "No se pudo liberar el marcador de desarrollo:",
        error.message,
      );
  }
}
