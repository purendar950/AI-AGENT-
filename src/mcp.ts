import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import type { AgentTool, ToolResult } from "./types.js";

export interface MCPServerConfig { name:string; command:string; args?:string[]; env?:Record<string,string>; }

export class MCPRegistry {
  private readonly tools=new Map<string,AgentTool>();
  register(tools:AgentTool[]){for(const tool of tools)this.tools.set(tool.name,tool)}
  list(){return [...this.tools.values()]}
  get(name:string){return this.tools.get(name)}
}

export class MCPStdioClient {
  private buffer="";
  private nextId=1;
  private readonly pending=new Map<number,{resolve:(v:any)=>void;reject:(e:Error)=>void}>();
  private readonly child:ChildProcessWithoutNullStreams;
  constructor(config:MCPServerConfig){
    this.child=spawn(config.command,config.args??[],{stdio:["pipe","pipe","inherit"],env:{...process.env,...config.env}});
    this.child.stdout.on("data",(chunk:Buffer)=>this.onData(chunk.toString()));
    this.child.on("error",(error)=>this.rejectAll(error));
    this.child.on("exit",()=>this.rejectAll(new Error("MCP server exited")));
  }
  private onData(chunk:string){
    this.buffer+=chunk;
    let newline=this.buffer.indexOf("\n");
    while(newline>=0){
      const line=this.buffer.slice(0,newline).trim(); this.buffer=this.buffer.slice(newline+1);
      if(line){try{this.handle(JSON.parse(line));}catch{}}
      newline=this.buffer.indexOf("\n");
    }
  }
  private handle(message:any){
    if(message?.id===undefined)return;
    const pending=this.pending.get(Number(message.id)); if(!pending)return;
    this.pending.delete(Number(message.id));
    if(message.error)pending.reject(new Error(message.error.message||"MCP error")); else pending.resolve(message.result);
  }
  request(method:string,params:Record<string,unknown>={}):Promise<any>{
    const id=this.nextId++;
    return new Promise((resolve,reject)=>{
      this.pending.set(id,{resolve,reject});
      this.child.stdin.write(JSON.stringify({jsonrpc:"2.0",id,method,params})+"\n");
    });
  }
  async initialize(){
    await this.request("initialize",{protocolVersion:"2024-11-05",capabilities:{},clientInfo:{name:"ai-agent",version:"0.2.0"}});
    this.child.stdin.write(JSON.stringify({jsonrpc:"2.0",method:"notifications/initialized",params:{}})+"\n");
  }
  async close(){this.child.kill();this.rejectAll(new Error("MCP client closed"))}
  private rejectAll(error:Error){for(const {reject} of this.pending.values())reject(error);this.pending.clear()}
  async listTools():Promise<AgentTool[]>{
    await this.initialize();
    const result=await this.request("tools/list");
    return (result?.tools??[]).map((spec:any)=>({
      name:"mcp_"+String(spec.name),
      description:String(spec.description??"MCP tool"),
      parameters:spec.inputSchema??{type:"object",properties:{}},
      execute:async(args:Record<string,unknown>):Promise<ToolResult>=>{
        try{
          const result=await this.request("tools/call",{name:spec.name,arguments:args});
          const content=Array.isArray(result?.content)?result.content.map((x:any)=>x?.text??JSON.stringify(x)).join("\n"):JSON.stringify(result);
          return {ok:!result?.isError,output:content};
        }catch(error){return {ok:false,output:"",error:String(error)}}
      }
    }));
  }
}
