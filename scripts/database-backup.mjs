import{mkdir}from"node:fs/promises";import{spawnSync}from"node:child_process";import{dirname,resolve}from"node:path";
const configuredUrl=process.env.DATABASE_URL;if(!configuredUrl)throw new Error("DATABASE_URL is required");const parsedUrl=new URL(configuredUrl);parsedUrl.searchParams.delete("schema");const url=parsedUrl.toString();
const directory=resolve(process.env.BACKUP_DIRECTORY??"backups"),file=process.argv[2]?resolve(process.argv[2]):resolve(directory,`driving-school-${new Date().toISOString().replaceAll(":","-")}.dump`);await mkdir(dirname(file),{recursive:true});
const result=spawnSync("pg_dump",["--format=custom","--compress=9","--no-owner","--no-privileges","--file",file,url],{stdio:"inherit"});if(result.error)throw result.error;if(result.status)process.exit(result.status);
console.log(`Database backup created: ${file}`);
