import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readdir, lstat, readFile, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { stagePages } from "../scripts/stage_pages.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const expected = [
  ".nojekyll", "index.html", "examples/playground.html",
  "examples/playground.mjs", "src/flow.mjs", "src/equal_json.mjs",
  "src/replay.mjs", "src/record.mjs",
].sort();

test("pages bundle contains only the 7 synthetic public files and .nojekyll", async () => {
  const temp = await mkdtemp(join(tmpdir(), "flow-pages-test-"));
  try {
    const path = join(temp, "site");
    const report = await stagePages(path);
    assert.equal(report.schema, "flow-pages-artifact.v1");
    assert.equal(report.status, "STAGED");
    assert.equal(report.publicSyntheticOnly, true);
    assert.deepEqual(report.files, expected);
    assert.equal((await readdir(path)).length, 4); // .nojekyll, index, examples, src
    for (const name of expected) {
      const stat = await lstat(join(path, name));
      assert.equal(stat.isFile(), true);
      assert.equal(stat.isSymbolicLink(), false);
    }
    assert.equal((await readFile(join(path, ".nojekyll"))).length, 0);
    for (const [source, destination] of [
      ["site/index.html", "index.html"], ["examples/playground.html", "examples/playground.html"],
      ["src/flow.mjs", "src/flow.mjs"], ["src/record.mjs", "src/record.mjs"]
    ]) {
      assert.deepEqual(await readFile(join(root, source)), await readFile(join(path, destination)));
    }
    const home = await readFile(join(path, "index.html"), "utf8");
    const playground = await readFile(join(path, "examples/playground.html"), "utf8");
    assert.match(home, /href="\.\/examples\/playground\.html"/);
    assert.match(home, /not authenticate|not authenticate its author|does not authenticate/i);
    assert.match(playground, /src="\.\/playground\.mjs"/);
    assert.doesNotMatch(home, /<script\b/);
    assert.doesNotMatch(home, /<script\b|<iframe\b|<img\b|googletagmanager\.com|src="https?:/i);
    assert.doesNotMatch(playground, /https?:\/\/.+\.js/);
  } finally { await rm(temp, { recursive: true, force: true }); }
});

test("staging cannot silently include stale files or replace an existing output directory", async () => {
  const temp = await mkdtemp(join(tmpdir(), "flow-pages-test-"));
  try {
    const path = join(temp, "site");
    await mkdir(path);
    await assert.rejects(stagePages(path), /EEXIST/);
    await rm(path, { recursive: true, force: true });
    await stagePages(path);
    await assert.rejects(stagePages(path), /EEXIST/);
    await assert.rejects(stagePages(""), /PAGES_STAGE_INVALID_OUTPUT/);
    await assert.rejects(stagePages(join(root, "README.md")), /PAGES_STAGE_OUTSIDE_ALLOWED_OUTPUT/);
  } finally { await rm(temp, { recursive: true, force: true }); }
});
