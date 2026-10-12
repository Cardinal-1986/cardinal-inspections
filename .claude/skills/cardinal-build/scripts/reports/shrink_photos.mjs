import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs'; import path from 'path';
const [src,dst]=process.argv.slice(2); fs.mkdirSync(dst,{recursive:true});
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage();
for(const f of fs.readdirSync(src).filter(x=>/\.(jpe?g|png)$/i.test(x))){
  const data='data:image/jpeg;base64,'+fs.readFileSync(path.join(src,f)).toString('base64');
  const out=await p.evaluate(async(d)=>{const i=new Image();i.src=d;await i.decode();
    const k=Math.min(1,1600/Math.max(i.naturalWidth,i.naturalHeight));
    const c=document.createElement('canvas');c.width=Math.round(i.naturalWidth*k);c.height=Math.round(i.naturalHeight*k);
    c.getContext('2d').drawImage(i,0,0,c.width,c.height);return c.toDataURL('image/jpeg',0.8);},data);
  fs.writeFileSync(path.join(dst,f),Buffer.from(out.split(',')[1],'base64'));
}
await b.close();
