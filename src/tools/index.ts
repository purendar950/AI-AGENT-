import type { AgentTool, ToolResult } from "../types.js";
import { indexRepository, searchSymbols } from "../indexer.js";

export function createIndexTools(workspace:string): AgentTool[] {
  return [
    {
      name:"build_repository_index",
      description:"Build a lightweight symbol index of the repository source tree.",
      parameters:{type:"object",properties:{}},
      async execute():Promise<ToolResult>{
        const hits=await indexRepository(workspace);
        return {ok:true,output:JSON.stringify({count:hits.length,symbols:hits.slice(0,250)},null,2),data:hits};
      }
    },
    {
      name:"search_symbols",
      description:"Search source declarations by symbol name or file path before editing unfamiliar code.",
      parameters:{type:"object",required:["query"],properties:{query:{type:"string"}}},
      async execute(args):Promise<ToolResult>{
        const query=String(args.query??"").trim();
        if(!query)return {ok:false,output:"",error:"query is required"};
        const hits=await searchSymbols(workspace,query);
        return {ok:true,output:JSON.stringify(hits,null,2),data:hits};
      }
    }
  ];
}
