import { build } from 'esbuild';
import { createServer } from 'node:http';
import { chromium } from '@playwright/test';
import sharp from 'sharp';
const built = await build({stdin:{contents:'export { transparentPhoto } from "./src/lib/remove-background";',resolveDir:process.cwd()},bundle:true,format:'esm',write:false,platform:'browser'});
const input = await sharp(Buffer.from('<svg width="600" height="700" xmlns="http://www.w3.org/2000/svg"><rect width="600" height="700" fill="#baad92"/><path d="M220 100 L150 130 60 260 140 320 190 250 185 590 415 590 410 250 460 320 540 260 450 130 380 100 Q300 155 220 100" fill="#18335c"/></svg>')).png().toBuffer();
const server = createServer((req,res)=>{
 if(req.url==='/bundle.js'){res.setHeader('content-type','text/javascript');res.end(built.outputFiles[0].contents);}
 else if(req.url==='/shirt.png'){res.setHeader('content-type','image/png');res.end(input);}
 else {res.setHeader('content-type','text/html');res.end('<html><body>Local background removal verification</body></html>');}
}).listen(0,'127.0.0.1');
await new Promise(resolve=>server.once('listening',resolve));
const browser = await chromium.launch({headless:true, channel:'chrome'});
try {
 const page = await browser.newPage();
 page.on('console', msg=>{if(msg.text().startsWith('PROGRESS')) console.log(msg.text());});
 await page.route(/api\.(fashn|anthropic)\./, route=>route.abort());
 await page.goto(`http://127.0.0.1:${server.address().port}`);
 const result = await page.evaluate(async()=>{
   const {transparentPhoto}=await import('/bundle.js');
   const file=await transparentPhoto('/shirt.png', text=>console.log('PROGRESS '+text));
   const image=await createImageBitmap(file);
   const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
   const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
   const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;
   let transparent=0,opaque=0; for(let i=3;i<pixels.length;i+=4){if(pixels[i]<10)transparent++;if(pixels[i]>245)opaque++;}
   return {type:file.type,bytes:file.size,transparent,opaque};
 });
 console.log(JSON.stringify(result));
 if(!result.transparent||!result.opaque)throw Error('Missing meaningful alpha mask');
} finally {await browser.close();server.close();}
