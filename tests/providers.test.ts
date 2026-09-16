import {test} from 'node:test';
import assert from 'node:assert/strict';
import {analyzeWithClaude,submitFashn,pollFashn} from '../src/lib/studio-providers';
import {cacheKey,seal,unseal,requestCache} from '../src/lib/studio-cache';
import {StudioError} from '../src/lib/studio-contract';
import type {SupabaseClient} from '@supabase/supabase-js';

test('Claude uses compact Haiku vision requests and validates categories',async()=>{
 let body:Record<string,unknown>={};
 const transport:typeof fetch=async(_url,init)=>{body=JSON.parse(init!.body as string);return Response.json({stop_reason:'end_turn',content:[{type:'text',text:'{"garments":[{"name":"Camisa","category":"Tops","color":"Azul"}]}'}],usage:{input_tokens:100,output_tokens:50}});};
 const output=await analyzeWithClaude(Buffer.from('test'),'fake-test-key',transport);
 assert.equal(body.model,'claude-haiku-4-5-20251001');assert.equal(body.max_tokens,4500);assert.equal(output.garments[0].category,'Tops');
});
test('paid submissions always request a single fast 1K image with no network retries',async()=>{
 let calls=0;
 await assert.rejects(()=>submitFashn('tryon-max',{num_images:4},'fake-test-key',async(_url,init)=>{calls++;const payload=JSON.parse(init!.body as string);assert.equal(payload.inputs.num_images,1);assert.equal(payload.inputs.generation_mode,'fast');assert.equal(payload.inputs.resolution,'1k');assert.equal(payload.inputs.return_base64,true);return new Response('',{status:429});}),/límite/);
 assert.equal(calls,1);
});
test('polling uses GET and refuses external output URLs',async()=>{
 await assert.rejects(()=>pollFashn('prediction','fake-test-key',async(url,init)=>{assert.ok(String(url).endsWith('/status/prediction'));assert.equal(init?.method,undefined);return Response.json({status:'completed',output:['https://untrusted.invalid/image.png']});}),/formato inesperado/);
});
test('base64 output decodes without fetching an external URL',async()=>{const output=await pollFashn('prediction','fake-test-key',async()=>Response.json({status:'completed',output:['data:image/png;base64,aGVsbG8=']}));assert.equal(output?.bytes.toString(),'hello');});
test('signed checkpoints reject tampering and another request identity',()=>{
 const signed=seal({prediction:'safe'},'request-a','fake-test-key');assert.deepEqual(unseal(signed,'request-a','fake-test-key'),{prediction:'safe'});
 assert.equal(unseal({...signed,data:'{"prediction":"another-user"}'},'request-a','fake-test-key'),null);assert.equal(unseal(signed,'request-b','fake-test-key'),null);
 assert.notEqual(cacheKey('a','same','key'),cacheKey('b','same','key'));
});
function cacheDb(){const rows=new Map<string,Record<string,unknown>>();let current='';const db={from:()=>({insert:async(value:Record<string,unknown>)=>{current=String(value.request_key);if(rows.has(current))return {error:{code:'23505'}};rows.set(current,{...value});return {error:null};},select:()=>({eq:()=>({eq:()=>({single:async()=>({data:rows.get(current),error:null})})})}),update:(value:Record<string,unknown>)=>({eq:()=>({eq:async()=>{rows.set(current,{...rows.get(current),...value});return {error:null};}})}),delete:()=>({eq:()=>({eq:async()=>{rows.delete(current);return {error:null};}})})})};return db as unknown as SupabaseClient;}
test('completed requests return cached result without another paid operation',async()=>{const cached=requestCache(cacheDb(),'user','key');let calls=0;const work=async()=>{calls++;return {path:'user/photo.png'};};await cached('same',work);await cached('same',work);assert.equal(calls,1);});
test('uncertain submissions remain locked against accidental duplicates',async()=>{const cached=requestCache(cacheDb(),'user','key');let calls=0;const work=async()=>{calls++;throw new Error('connection dropped');};await assert.rejects(()=>cached('same',work));await assert.rejects(()=>cached('same',work),/pendiente/);assert.equal(calls,1);});
test('a checkpoint resumes polling without resubmitting',async()=>{const cached=requestCache(cacheDb(),'user','key');let submissions=0;await assert.rejects(()=>cached('same',async(checkpoint)=>{submissions++;await checkpoint({prediction:'one'});throw new Error('poll timeout');},true));const result=await cached('same',async(_checkpoint,resume)=>{assert.equal(resume?.prediction,'one');return {path:'user/result.png'};},true);assert.equal(submissions,1);assert.equal(result.path,'user/result.png');});
test('definitively rejected submissions can be retried after fixing settings',async()=>{const cached=requestCache(cacheDb(),'user','key');await assert.rejects(()=>cached('same',async()=>{throw new StudioError('missing access',502,true);}));assert.deepEqual(await cached('same',async()=>({ok:true})),{ok:true});});
