import { execFile } from "node:child_process";
import type { AgentTool, ToolResult } from "../types.js";

export function createBrowserTool(workspace:string, timeout:number):AgentTool {
  return {
    name:"browser_check",
    description:"Open an HTTP(S) URL with Playwright when installed and return status, title, URL and visible text.",
    parameters:{type:"object",properties:{url:{type:"string"}},required:["url"]},
    execute:async({url})=>{
      const target=String(url);
      if(!/^https?:\/\//i.test(target)) return {ok:false,output:"",error:"Only http(s) URLs are allowed."};
      return new Promise<ToolResult>(resolve=>{
        const script="const {chromium}=require('playwright');(async()=>{const b=await chromium.launch({headless:true});const p=await b.newPage();const r=await p.goto(process.argv[1],{waitUntil:'domcontentloaded',timeout:30000});console.log(JSON.stringify({status:r&&r.status(),title:await p.title(),url:p.url(),text:(await p.locator('body').innerText()).slice(0,12000)}));await b.close()})().catch(e=>{console.error(e.message);process.exit(1)})";
        execFile(process.execPath,["-e",script,target],{cwd:workspace,timeout,maxBuffer:2*1024*1024},(error,stdout,stderr)=>{
          const output=[stdout,stderr].filter(Boolean).join("\n");
          resolve(error?{ok:false,output,error:error.message}:{ok:true,output});
        });
      });
    }
  };
}
