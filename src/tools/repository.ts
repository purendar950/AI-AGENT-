import { promises as fs } from "node:fs";
import path from "node:path";
import type { AgentTool, ToolResult } from "../types.js";

const IGNORED = new Set([".git", "node_modules", "dist", "build", ".next", ".agent", "coverage"]);

export function createRepositoryTool(workspace: string): AgentTool {
  return {
    name: "inspect_repository",
    description: "Summarize the repository structure, package manifests, likely source directories, and test/build scripts.",
    parameters: { type: "object", properties: {} },
    execute: async (): Promise<ToolResult> => {
      try {
        const files: string[] = [];
        await walk(workspace, workspace, files, 2500);
        const manifests = files.filter(f => /(^|\/)(package\.json|pyproject\.toml|requirements\.txt|Cargo\.toml|go\.mod|pom\.xml|build\.gradle|settings\.gradle|README(?:\.md)?$)$/i.test(f));
        const source = files.filter(f => /\.(ts|tsx|js|jsx|py|java|kt|go|rs|cs|cpp|c|h|vue|svelte)$/i.test(f)).slice(0, 500);
        return { ok: true, output: JSON.stringify({ root: workspace, fileCount: files.length, manifests, sourceFiles: source, topLevel: await topLevel(workspace) }, null, 2) };
      } catch (error) {
        return { ok: false, output: "", error: String(error) };
      }
    },
  };
}

async function walk(root: string, dir: string, out: string[], limit: number) {
  if (out.length >= limit) return;
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (IGNORED.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    const rel = path.relative(root, full);
    if (entry.isDirectory()) await walk(root, full, out, limit);
    else out.push(rel);
    if (out.length >= limit) return;
  }
}
async function topLevel(root: string) {
  return (await fs.readdir(root, { withFileTypes: true })).filter(x => !IGNORED.has(x.name)).map(x => x.isDirectory() ? x.name + "/" : x.name);
}
