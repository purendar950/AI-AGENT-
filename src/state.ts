import { promises as fs } from "node:fs";
import path from "node:path";
import type { AgentState } from "./types.js";

export class StateStore {
  private readonly file: string;
  constructor(workspace: string) { this.file = path.join(workspace, ".agent", "state.json"); }
  async save(state: AgentState) {
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    await fs.writeFile(this.file, JSON.stringify(state, null, 2), "utf8");
  }
  async load(): Promise<AgentState | null> {
    try { return JSON.parse(await fs.readFile(this.file, "utf8")) as AgentState; } catch { return null; }
  }
}
