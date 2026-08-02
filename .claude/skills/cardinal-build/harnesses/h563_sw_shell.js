/* Does opening the book overwrite the cached offline shell?
   Registers the REAL sw.js against a real origin and does the two navigations
   in order, then reads back what cache key '/' holds. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT='/home/user/cardinal-inspections';
const srv=http.createServer((req,res)=>{
  const u=req.url.split('?')[0];
  const map={'/':'/index_stub.html'};
  if(u==='/'){res.writeHead(200,{'content-type':'text/html'});return res.end('<!doctype html><title>CARDINAL APP SHELL</title><body>app');}
  if(u==='/sw.js'){res.writeHead(200,{'content-type':'text/javascript'});return res.end(fs.readFileSync(ROOT+'/sw.js'));}
  const f=path.join(ROOT,u);
  if(fs.existsSync(f)&&fs.statSync(f).isFile()){res.writeHead(200,{'content-type':'text/html'});return res.end(fs.readFileSync(f));}
  res.writeHead(404);res.end('no');
});
await new Promise(r=>srv.listen(0,'127.0.0.1',r)); const port=srv.address().port;
const O=`http://127.0.0.1:${port}`;
const b=await chromium.launch(); const ctx=await b.newContext(); const p=await ctx.newPage();
await p.goto(O+'/',{waitUntil:'load'});
await p.evaluate(()=>navigator.serviceWorker.register('/sw.js'));
await p.waitForFunction(()=>navigator.serviceWorker.controller!==null,{timeout:15000}).catch(()=>{});
await p.reload({waitUntil:'load'}); await p.waitForTimeout(600);
const before=await p.evaluate(async()=>{const c=await caches.open('cardinal-shell-v1');const r=await c.match('/');return r?(await r.text()).slice(0,60):'(empty)';});
console.log('cache["/"] after loading the app :', JSON.stringify(before));
/* now open the book the way the app does — an iframe navigation */
await p.evaluate(()=>new Promise(res=>{const f=document.createElement('iframe');f.onload=res;f.src='/ai-field-manual.html';document.body.appendChild(f);}));
await p.waitForTimeout(900);
const after=await p.evaluate(async()=>{const c=await caches.open('cardinal-shell-v1');const r=await c.match('/');return r?(await r.text()).slice(0,60):'(empty)';});
console.log('cache["/"] after opening the book:', JSON.stringify(after));
console.log(before===after ? '\nOK — the shell survived' : '\nBUG CONFIRMED — the book replaced the offline app shell');
await b.close(); srv.close();
