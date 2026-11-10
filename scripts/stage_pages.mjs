// Allowlisted static artifact builder for the original public browser demo.
// No npm install, remote fetch, code generation, secrets or private files.
import { lstat, mkdir, copyFile, writeFile, readFile, realpath, readdir } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const files = Object.freeze([
  ["site/index.html", "index.html"],
  ["site/journey.html", "journey.html"],
  ["site/blueprint.html", "blueprint.html"],
  ["src/service-blueprint.mjs", "src/service-blueprint.mjs"],
  ["src/service-blueprint-ui.mjs", "src/service-blueprint-ui.mjs"],
  ["src/journey-map.mjs", "src/journey-map.mjs"],
  ["src/journey-map-ui.mjs", "src/journey-map-ui.mjs"],
  ["examples/playground.html", "examples/playground.html"],
  ["examples/playground.mjs", "examples/playground.mjs"],
  ["src/flow.mjs", "src/flow.mjs"],
  ["src/equal_json.mjs", "src/equal_json.mjs"],
  ["src/replay.mjs", "src/replay.mjs"],
  ["src/record.mjs", "src/record.mjs"],
]);

function fail(message) { throw Error("PAGES_STAGE_" + message); }

export async function stagePages(outputPath) {
  if (typeof outputPath !== "string" || !outputPath.trim())
    fail("INVALID_OUTPUT");
  const out = resolve(outputPath);
  const project = await realpath(ROOT);
  // Do not stage into this repository's source tree, including symlink aliases.
  if (out === project || out.startsWith(project + "/")) {
    // Only a known generated-output path under the repo is supported; all
    // other paths must be outside it, such as a fresh tmp directory for tests.
    const expected = join(project, "dist", "pages");
    if (out !== expected) fail("OUTSIDE_ALLOWED_OUTPUT");
  }
  for (const [relative] of files) {
    const source = join(project, relative);
    const metadata = await lstat(source);
    if (!metadata.isFile() || metadata.isSymbolicLink())
      fail("NONREGULAR_PUBLIC_SOURCE");
  }
  // Existing destination is refused to prevent stale/broader files being
  // silently included. Caller must select a fresh output directory.
  await mkdir(dirname(out), { recursive: true });
  await mkdir(out);
  for (const [relative, target] of files) {
    await mkdir(dirname(join(out, target)), { recursive: true });
    await copyFile(join(project, relative), join(out, target));
  }
  await writeFile(join(out, ".nojekyll"), "", { flag: "wx" });

  // Check that every staged file is from this explicit allowlist.
  async function walk(folder, prefix = "") {
    const result = [];
    for (const item of await readdir(folder, { withFileTypes: true })) {
      if (item.isSymbolicLink()) fail("SYMLINK_IN_OUTPUT");
      if (item.isDirectory())
        result.push(...await walk(join(folder, item.name), prefix + item.name + "/"));
      else if (item.isFile()) result.push(prefix + item.name);
      else fail("NONREGULAR_OUTPUT");
    }
    return result;
  }
  const actual = (await walk(out)).sort();
  const expected = [".nojekyll", ...files.map(([, target]) => target)].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) fail("UNEXPECTED_FILE");
  const html = await readFile(join(out, "index.html"), "utf8");
  if (!html.includes('href="./examples/playground.html"'))
    fail("LANDING_LINK_BROKEN");
  const mapPage=await readFile(join(out, "journey.html"), "utf8");
  const mapUI=await readFile(join(out, "src/journey-map-ui.mjs"), "utf8");
  if(!html.includes('href="./journey.html"')||!mapPage.includes('src="./src/journey-map-ui.mjs"')||
     !mapUI.includes('"./journey-map.mjs"')||!mapPage.includes("connect-src 'none'"))
    fail("JOURNEY_MAP_LINK_OR_CSP");
  const blueprint=await readFile(join(out, "blueprint.html"), "utf8");
  const blueprintUI=await readFile(join(out, "src/service-blueprint-ui.mjs"), "utf8");
  if(!html.includes('href="./blueprint.html"')||!blueprint.includes('src="./src/service-blueprint-ui.mjs"')||
     !blueprintUI.includes('"./service-blueprint.mjs"')||!blueprint.includes("connect-src 'none'"))
    fail("BLUEPRINT_LINK_OR_CSP");
  const app = await readFile(join(out, "examples/playground.mjs"), "utf8");
  if (!app.includes('../src/record.mjs') || !app.includes('../src/replay.mjs'))
    fail("MODULE_IMPORTS_MISSING");

  return { schema: "flow-pages-artifact.v1", files: actual, status: "STAGED",
           publicSyntheticOnly: true, sourceOfTruth: "checked-out-exact-commit" };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const report = await stagePages(process.argv[2] || "dist/pages");
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    console.error(JSON.stringify({ state: "REJECTED", error: String(error.message).slice(0,90) }));
    process.exitCode = 1;
  }
}
