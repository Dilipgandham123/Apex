import{spawnSync}from"node:child_process";import{resolve}from"node:path";
if(process.env.ALLOW_DATABASE_RESTORE!=="true")throw new Error("Set ALLOW_DATABASE_RESTORE=true after confirming the target database");
const configuredUrl=process.env.RESTORE_DATABASE_URL,file=process.argv[2];if(!configuredUrl||!file)throw new Error("RESTORE_DATABASE_URL and a dump file argument are required");const parsedUrl=new URL(configuredUrl);parsedUrl.searchParams.delete("schema");const url=parsedUrl.toString();
const result=spawnSync("pg_restore",["--clean","--if-exists","--no-owner","--no-privileges","--exit-on-error","--dbname",url,resolve(file)],{stdio:"inherit"});if(result.error)throw result.error;if(result.status)process.exit(result.status);
console.log("Database restore completed; run migrations and acceptance tests before promotion");
