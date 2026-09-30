import { promises as fs } from "node:fs";
import path from "node:path";
const ignored=new Set([".git","node_modules","dist","build",".next",".agent","coverage"]);
const extensions=/\.(ts|tsx|js|jsx|py|java|kt|go|rs|cs|cpp|c|h|vue|svelte)$/i;
export interface SymbolHit{file:string;line:number;kind:string;name:string}
export async function indexRepository(root:string):Promise<SymbolHit[]>{const hits:SymbolHit[]=[];async function walk(dir:string){for(const entry of await fs.readdir(dir,{withFileTypes:true})){if(ignored.has(entry.name))continue;const full=path.join(dir,entry.name);if(entry.isDirectory()){await walk(full);continue}if(!extensions.test(entry.name))continue;let text:string;try{text=await fs.readFile(full,"utf8")}catch{continue}text.split(/\r?\n/).forEach((line,i)=>{const m=line.match(/^\s*(?:export\s+)?(?:async\s+)?(?:class|function|interface|type|enum|def|func|struct)\s+([A-Za-z_$][\w$]*)/);if(m)hits.push({file:path.relative(root,full),line:i+1,kind:"declaration",name:m[1]})})}}await walk(root);return hits.slice(0,10000)}
export async function searchSymbols(root:string,query:string){const q=query.toLowerCase();return (await indexRepository(root)).filter(x=>x.name.toLowerCase().includes(q)||x.file.toLowerCase().includes(q)).slice(0,100)}
