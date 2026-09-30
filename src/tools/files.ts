import { promises as fs } from "node:fs";
import path from "node:path";
import type { AgentTool, ToolResult } from "../types.js";

export function createFileTools(workspace: string): AgentTool[] {
  const safe = (p: string) => {
    const root = path.resolve(workspace);
    const target = path.resolve(root, p);
    if (target !== root && !target.startsWith(root + path.sep)) throw new Error("Path escapes workspace");
    return target;
  };

  const result = (promise: Promise<string>): Promise<ToolResult> =>
    promise.then(output => ({ ok: true, output })).catch(error => ({ ok: false, output: "", error: String(error) }));

  return [
    {
      name: "list_files",
      description: "List files and directories in the workspace.",
      execute: async ({ path: p = "." }) => result(fs.readdir(safe(String(p)), { withFileTypes: true }).then(xs => xs.map(x => x.isDirectory() ? `${x.name}/` : x.name).join("\n"))),
    },
    {
      name: "read_file",
      description: "Read a UTF-8 text file from the workspace.",
      execute: async ({ path: p }) => result(fs.readFile(safe(String(p)), "utf8")),
    },
    {
      name: "write_file",
      description: "Write or replace a UTF-8 text file in the workspace.",
      execute: async ({ path: p, content }) => result(fs.mkdir(path.dirname(safe(String(p))), { recursive: true }).then(() => fs.writeFile(safe(String(p)), String(content), "utf8")).then(() => "File written.")),
    },
    {
      name: "search_files",
      description: "Search text across files using a simple recursive scan.",
      execute: async ({ query }) => result(searchRecursive(workspace, String(query))),
    },
  ];
}

async function searchRecursive(root: string, query: string): Promise<string> {
  const hits: string[] = [];
  async function walk(dir: string) {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      if (["node_modules", ".git", "dist"].includes(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else {
        try {
          const text = await fs.readFile(full, "utf8");
          if (text.toLowerCase().includes(query.toLowerCase())) hits.push(path.relative(root, full));
        } catch {}
      }
    }
  }
  await walk(root);
  return hits.slice(0, 100).join("\n");
}