import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

const root=resolve("apps/web"),required=[["public/app-icon-192.png",192],["public/app-icon-512.png",512]];
for(const[file,size]of required){const data=await readFile(resolve(root,file));if(data.readUInt32BE(16)!==size||data.readUInt32BE(20)!==size)throw new Error(`${file} must be ${size}x${size}`);}
const manifest=await readFile(resolve(root,"src/app/manifest.ts"),"utf8"),worker=await readFile(resolve(root,"public/sw.js"),"utf8");
for(const value of ["standalone","/login","app-icon-192.png","app-icon-512.png"])if(!manifest.includes(value))throw new Error(`Manifest is missing ${value}`);
for(const event of ["install","activate"])if(!worker.includes(`\"${event}\"`))throw new Error(`Service worker is missing ${event}`);
if((await stat(resolve(root,"public/sw.js"))).size===0)throw new Error("Service worker is empty");
console.log("PWA verification: manifest, install route, service worker and PNG icon dimensions passed");
