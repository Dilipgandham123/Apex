const assert=require("node:assert/strict");
const{randomBytes}=require("node:crypto");
const{PrismaClient}=require("@hyd/database");
const{hashPassword}=require("../dist/auth/password.js");

async function main(){
  const db=new PrismaClient(),base=process.env.API_INTEGRATION_URL??"http://localhost:4400/api/v1",suffix=randomBytes(5).toString("hex"),password=`Stage11-${suffix}-Password!`;
  try{
    const school=await db.drivingSchool.create({data:{slug:`stage11-${suffix}`,name:"Stage 11 School"}}),other=await db.drivingSchool.create({data:{slug:`stage11-other-${suffix}`,name:"Other School"}});
    const role=await db.role.findUniqueOrThrow({where:{key:"SCHOOL_ADMIN"}}),admin=await db.user.create({data:{email:`stage11-${suffix}@example.test`,displayName:"Stage 11 Admin",passwordHash:await hashPassword(password)}});
    await db.schoolMembership.create({data:{userId:admin.id,schoolId:school.id,roleId:role.id}});
    let response=await fetch(`${base}/enquiries`,{method:"POST",headers:{"content-type":"application/json","user-agent":"stage11-integration"},body:JSON.stringify({schoolSlug:school.slug,name:"Website Customer",phone:"9876543210",course:"Manual driving",preferredSlot:"Morning (6-9 AM)",notes:"First class enquiry"})});
    assert.equal(response.status,201);const created=await response.json();assert.ok(created.id);
    response=await fetch(`${base}/enquiries`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({schoolSlug:school.slug,name:"Spam",phone:"9876543210",course:"Manual",preferredSlot:"Morning",website:"bot"})});assert.equal(response.status,400);
    await db.publicEnquiry.create({data:{schoolId:other.id,name:"Other Customer",phone:"9123456780",course:"Automatic",preferredSlot:"Evening"}});
    response=await fetch(`${base}/auth/password/login`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({identifier:admin.email,password})});assert.equal(response.status,200);const token=(await response.json()).accessToken;
    response=await fetch(`${base}/enquiries`,{headers:{authorization:`Bearer ${token}`}});assert.equal(response.status,200);const rows=await response.json();assert.equal(rows.length,1);assert.equal(rows[0].id,created.id);
    response=await fetch(`${base}/enquiries/${created.id}`,{method:"PATCH",headers:{authorization:`Bearer ${token}`,"content-type":"application/json"},body:JSON.stringify({status:"CONTACTED"})});assert.equal(response.status,200);assert.equal((await response.json()).status,"CONTACTED");
    assert.equal(await db.auditLog.count({where:{schoolId:school.id,entityId:created.id}}),2);
    console.log("integration: persisted public enquiries, spam trap, tenant queue, status and audit trail passed");
  }finally{await db.$disconnect();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
