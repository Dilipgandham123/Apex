const assert=require("node:assert/strict");
const{randomBytes}=require("node:crypto");
const{PrismaClient}=require("@hyd/database");
const{hashPassword}=require("../dist/auth/password.js");

async function main(){
  const db=new PrismaClient(),base=process.env.API_INTEGRATION_URL??"http://localhost:4400/api/v1",suffix=randomBytes(5).toString("hex"),password=`Stage12-${suffix}-Password!`;
  try{
    const school=await db.drivingSchool.create({data:{slug:`stage12-${suffix}`,name:"Stage 12 School"}}),other=await db.drivingSchool.create({data:{slug:`stage12-other-${suffix}`,name:"Other School"}});
    const adminRole=await db.role.findUniqueOrThrow({where:{key:"SCHOOL_ADMIN"}}),customerRole=await db.role.findUniqueOrThrow({where:{key:"CUSTOMER"}});
    const admin=await db.user.create({data:{email:`stage12-admin-${suffix}@example.test`,displayName:"Stage 12 Admin",passwordHash:await hashPassword(password)}});
    await db.schoolMembership.create({data:{userId:admin.id,schoolId:school.id,roleId:adminRole.id}});
    const phone=`9${Date.now().toString().slice(-9)}`,customer=await db.user.create({data:{phone,email:`stage12-customer-${suffix}@example.test`,displayName:"Notification Customer"}});
    await db.schoolMembership.create({data:{userId:customer.id,schoolId:school.id,roleId:customerRole.id}});
    const profile=await db.customerProfile.create({data:{userId:customer.id,schoolId:school.id,customerCode:`S12-${suffix}`}}),course=await db.course.create({data:{schoolId:school.id,code:`S12-${suffix}`,name:"Manual Course",transmission:"MANUAL",price:10000,classCount:28,targetKmPerClass:6,durationDays:60}});
    const deadline=new Date();deadline.setHours(0,0,0,0);deadline.setDate(deadline.getDate()+7);
    const enrollment=await db.courseEnrollment.create({data:{customerId:profile.id,courseId:course.id,status:"ACTIVE",courseNameSnapshot:course.name,priceSnapshot:10000,classCountSnapshot:28,targetKmPerClassSnapshot:6,durationDaysSnapshot:60,totalPayable:10000,firstLessonAt:new Date(),deadlineAt:deadline}});

    let response=await fetch(`${base}/auth/customer/request-otp`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({phone})});assert.equal(response.status,200);const otp=await response.json();
    const otpRow=await db.notification.findFirstOrThrow({where:{schoolId:school.id,eventType:"OTP"}});assert.equal(otpRow.channel,"WHATSAPP");assert.equal(otpRow.payloadEncrypted.includes(otp.developmentCode),false);
    response=await fetch(`${base}/auth/password/login`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({identifier:admin.email,password})});assert.equal(response.status,200);const token=(await response.json()).accessToken,headers={authorization:`Bearer ${token}`};
    response=await fetch(`${base}/notifications/sweep`,{method:"POST",headers});assert.equal(response.status,201);assert.equal((await response.json()).queued,4);
    response=await fetch(`${base}/notifications/sweep`,{method:"POST",headers});assert.equal(response.status,201);assert.equal((await response.json()).queued,0);
    response=await fetch(`${base}/payments/manual`,{method:"POST",headers:{...headers,"content-type":"application/json"},body:JSON.stringify({enrollmentId:enrollment.id,amount:1000,method:"UPI",reference:"S12-INTEGRATION"})});assert.equal(response.status,201);
    assert.equal(await db.notification.count({where:{schoolId:school.id,eventType:"PAYMENT_CONFIRMED"}}),2);
    response=await fetch(`${base}/notifications/process`,{method:"POST",headers});assert.equal(response.status,201);
    assert.equal(await db.notification.count({where:{schoolId:school.id,status:"SENT"}}),7);assert.equal(await db.notificationAttempt.count({where:{notification:{schoolId:school.id},success:true}}),7);
    await db.notification.create({data:{schoolId:other.id,eventType:"OTP",channel:"EMAIL",recipient:"other@example.test",payloadEncrypted:"not-due",idempotencyKey:`other:${suffix}`,nextAttemptAt:new Date(Date.now()+86400000)}});
    response=await fetch(`${base}/notifications`,{headers});assert.equal(response.status,200);const rows=await response.json();assert.equal(rows.length,7);assert.ok(rows.every(row=>row.schoolId===school.id&&row.attempts.length===1));
    await db.notification.update({where:{id:otpRow.id},data:{status:"FAILED",lastError:"test failure"}});response=await fetch(`${base}/notifications/${otpRow.id}/retry`,{method:"POST",headers});assert.equal(response.status,201);const retried=await response.json();assert.equal(retried.status,"PENDING");assert.equal(retried.lastError,null);
    console.log("integration: encrypted OTP, idempotent reminders, payment events, delivery logs, tenant isolation and retry passed");
  }finally{await db.$disconnect();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
