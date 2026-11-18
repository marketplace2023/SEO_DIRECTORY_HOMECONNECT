import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:net";
import { mkdtempSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import {
  acquireInstance,
  releaseInstance,
  portInUse,
} from "../scripts/dev-runtime.mjs";
test("detects an occupied port without stopping its owner", async () => {
  const server = createServer((socket) => socket.end());
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  try {
    assert.equal(await portInUse(port), true);
    assert.equal(server.listening, true);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
  assert.equal(await portInUse(port), false);
});
test("one launcher owns the marker; another cannot replace or release it", () => {
  const marker = join(
    mkdtempSync(join(tmpdir(), "dev-instance-")),
    "instance.json",
  );
  const first = acquireInstance(marker);
  assert.equal(first.owned, true);
  const second = acquireInstance(marker);
  assert.equal(second.owned, false);
  assert.equal(second.instance.pid, process.pid);
  releaseInstance(marker, { pid: process.pid, token: "not-the-owner" });
  assert.equal(existsSync(marker), true);
  releaseInstance(marker, first.instance);
  assert.equal(existsSync(marker), false);
});
test("recovers a stale marker only after its process has exited", () => {
  const previous = spawnSync(process.execPath, ["-e", "process.exit(0)"]);
  assert.equal(previous.status, 0);
  const marker = join(
    mkdtempSync(join(tmpdir(), "dev-stale-")),
    "instance.json",
  );
  writeFileSync(marker, JSON.stringify({ pid: previous.pid, token: "stale" }));
  const current = acquireInstance(marker);
  assert.equal(current.owned, true);
  assert.equal(current.instance.pid, process.pid);
  releaseInstance(marker, current.instance);
});
