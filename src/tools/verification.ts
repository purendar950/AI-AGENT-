import type { AgentTool, ToolResult } from "../types.js";
import { spawn } from "node:child_process";

function run(cwd:string,command:string,timeout:number):Promise<ToolResult>{
  return new Promise(resolve=>{
    const child=spawn(process.platform==="win32"?"cmd":"sh",process.platform==="win32"?["/c",command]:["-lc",command],{cwd,env:process.env});
    let stdout="",stderr="",done=false;
    const finish=(result:ToolResult)=>{if(done)return;done=true;resolve(result)};
    const timer=setTimeout(()=>{child.kill("SIGTERM");finish({ok:false,output:stdout,error:"Verification timed out"})},timeout);
    child.stdout.on("data",d=>stdout+=d); child.stderr.on("data",d=>stderr+=d);
    child.on("error",e=>{clearTimeout(timer);finish({ok:false,output:stdout,error:String(e)})});
    child.on("close",code=>{clearTimeout(timer);finish({ok:code===0,output:(stdout+"\n"+stderr).trim(),error:code===0?undefined:"Command exited with code "+code})});
  });
}
export function createVerificationTools(workspace:string,timeout:number):AgentTool[]{
  const make=(name:string,description:string,command:string):AgentTool=>({name,description,parameters:{type:"object",properties:{}},execute:()=>run(workspace,command,timeout)});
  return [
    make("run_tests","Run the repository test suite.","npm test"),
    make("run_typecheck","Run the TypeScript type checker.","npm run typecheck"),
    make("run_build","Build the project.","npm run build"),
    make("run_ci_checks","Run typecheck, tests, and build sequentially.","npm run typecheck && npm test && npm run build")
  ];
}
