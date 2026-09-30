import { promises as fs } from "node:fs";
import path from "node:path";
import type { AgentTool, ToolResult } from "../types.js";

export function createPatchTool(workspace: string): AgentTool {
  const safe = (p: string) => {
    const root = path.resolve(workspace);
    const target = path.resolve(root, p);
    if (target !== root && !target.startsWith(root + path.sep)) throw new Error("Path escapes workspace");
    return target;
  };

  return {
    name: "apply_patch",
    description: "Apply a precise search-and-replace patch to a UTF-8 text file. The old text must match exactly once.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Relative file path." },
        oldText: { type: "string", description: "Exact existing text to replace." },
        newText: { type: "string", description: "Replacement text." },
      },
      required: ["path", "oldText", "newText"],
    },
    execute: async ({ path: p, oldText, newText }): Promise<ToolResult> => {
      try {
        const target = safe(String(p));
        const current = await fs.readFile(target, "utf8");
        const old = String(oldText);
        const matches = current.split(old).length - 1;
        if (matches !== 1) return { ok: false, output: "", error: `Expected exactly one match, found ${matches}.` };
        await fs.writeFile(target, current.replace(old, String(newText)), "utf8");
        return { ok: true, output: `Patched ${p}.` };
      } catch (error) {
        return { ok: false, output: "", error: String(error) };
      }
    },
  };
}
