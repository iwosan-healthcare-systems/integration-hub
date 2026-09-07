import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import pg from 'pg';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { validateSubmission, buildFilters, csvCell } from '../server/launchpad.js';
// Integration tests create and remove their own fixtures on localhost only.
for (const file of ['.env','.env.local']) {
  try { for (const line of readFileSync(file,'utf8').split('\n')) { const m=line.trim().match(/^([A-Z_]+)=(.*)$/); if(m&&!process.env[m[1]]) process.env[m[1]]=m[2].replace(/^["']|["']$/g,''); } } catch {}
}
const host=process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).hostname : process.env.DB_HOST||'localhost';
if(!['localhost','127.0.0.1','[::1]'].includes(host)) throw new Error('LaunchPad integration tests must run against localhost.');
const pool=new pg.Pool(process.env.DATABASE_URL ? {connectionString:process.env.DATABASE_URL} : {host,port:Number(process.env.DB_PORT||5432),database:process.env.DB_NAME,user:process.env.DB_USER,password:process.env.DB_PASSWORD});
const tag=randomUUID(); const users=[]; let server; let first; let second; let logs='';
const base='http://127.0.0.1:3197/api';
const answers={department:'Quality',managerName:'Test Manager',managerEmail:'manager@example.invalid',problem:'Patients miss appointments.',idea:'SMS appointment reminders.',values:['Innovative'],testPlan:'One clinic, with the reception team.',funding:95000,startDate:'2027-01-01',endDate:'2027-02-26',measurement:'No-show rate down 20%.',risks:'',owner:'Test Employee',managerSupported:false};
async function api(path,user=users[0],options={}) {
 const response=await fetch(base+path,{...options,headers:{'Content-Type':'application/json',...(user?{Authorization:`Bearer ${user.token}`}:{})}});
 const data=(response.headers.get('content-type')||'').includes('application/json')?await response.json():await response.text();
 return {status:response.status,data};
}
before(async()=>{
  await pool.query(readFileSync('server/launchpad-schema.sql','utf8').replace(/^\uFEFF/,''));
  const hash=await bcrypt.hash('Launchpad-test-password-42!',4);
  for(const [role,reviewer,entity] of [['user',false,'iwosan-lagoon'],['user',true,'euracare'],['manager',false,'paelon-memorial'],['admin',false,null],['user',false,'paelon-memorial']]) {
    const {rows:[u]}=await pool.query('INSERT INTO users (email,name,password_hash,role,is_first_login,is_active,entity,can_review_launchpad) VALUES ($1,$2,$3,$4,false,true,$5,$6) RETURNING id,email,name,role',[`lp-test-${tag}-${users.length}@example.invalid`,'LaunchPad Test '+users.length,hash,role,entity,reviewer]);
    u.token=jwt.sign({userId:u.id,email:u.email,role:u.role},process.env.JWT_SECRET,{expiresIn:'10m'});users.push(u);
  }
  server=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3197'},windowsHide:true,stdio:['ignore','pipe','pipe']});
  server.stdout.on('data',d=>{logs+=d;}); server.stderr.on('data',d=>{logs+=d;});
  for(let i=0;i<60;i++){try{const r=await api('/auth/me');if(r.status===200)return;}catch{}await new Promise(r=>setTimeout(r,200));}
  throw new Error('Test API did not start: '+logs);
});
after(async()=>{
  if(server&&!server.killed){const exited=once(server,'exit');server.kill();await exited;}
  if(users.length){await pool.query('DELETE FROM launchpad_submissions WHERE user_id = ANY($1::int[])',[users.map(u=>u.id)]);await pool.query('DELETE FROM users WHERE id = ANY($1::int[])',[users.map(u=>u.id)]);}
  await pool.end();
});
test('validates cap, malformed dates, required text, values and explicit support',()=>{
 assert.equal(validateSubmission(answers).managerSupported,false);
 for(const patch of [{funding:100000.01},{funding:-1},{funding:'95000'},{funding:1.001},{startDate:'2027-02-30'},{endDate:'2026-01-01'},{values:[]},{values:['Unknown']},{managerSupported:'yes'},{managerEmail:'bad'},{problem:' '},{risks:'x'.repeat(5001)}]) assert.throws(()=>validateSubmission({...answers,...patch}));
 assert.equal(validateSubmission({...answers,funding:100000}).funding,100000);
});
test('uses safe filters and spreadsheet-safe CSV',()=>{
 const f=buildFilters({from:'2027-01-01',to:'2027-01-31',entity:'unassigned',search:"%_' OR 1=1"},{});
 assert.match(f.where,/Africa\/Lagos/); assert.match(f.where,/user_entity IS NULL/);assert.ok(!f.where.includes('OR 1=1'));
 assert.throws(()=>buildFilters({status:'toString'},{}));assert.throws(()=>buildFilters({from:'2027-02-02',to:'2027-01-01'},{}));
 assert.equal(csvCell('=HYPERLINK("bad")'),'"\'=HYPERLINK(""bad"")"');
 assert.equal(csvCell('hello,\nworld'),'"hello,\nworld"');
});
test('login and session expose the new permission',async()=>{
 const r=await api('/auth/login',null,{method:'POST',body:JSON.stringify({email:users[1].email,password:'Launchpad-test-password-42!'})});assert.equal(r.status,200);assert.equal(r.data.user.canReviewLaunchpad,true);
 assert.equal((await api('/auth/me',users[0])).data.user.canReviewLaunchpad,false);
});
test('requires authentication and prevents ordinary users from review and export',async()=>{
 assert.equal((await api('/launchpad/submissions/mine',null)).status,401);
 for(const u of [users[0],users[4]]) for(const path of ['/launchpad/review','/launchpad/review/export']) assert.equal((await api(path,u)).status,403);
});
test('admins and managers can review and export without individual permission',async()=>{
 for(const u of [users[2],users[3]]) for(const path of ['/launchpad/review','/launchpad/review/export']) assert.equal((await api(path,u)).status,200);
});
test('submits multiple ideas and ignores spoofed identity and status',async()=>{
 const r=await api('/launchpad/submissions',users[0],{method:'POST',body:JSON.stringify({answers,userName:'Spoof',userEntity:'euracare',status:'successful'})});
 assert.equal(r.status,201);first=r.data.submission;assert.equal(first.userName,users[0].name);assert.equal(first.userEntity,'iwosan-lagoon');assert.equal(first.status,'submitted');assert.match(first.reference,/^IHS-\d+$/);
 const r2=await api('/launchpad/submissions',users[0],{method:'POST',body:JSON.stringify({answers:{...answers,idea:'=Test export formula',funding:0}})});assert.equal(r2.status,201);second=r2.data.submission;assert.notEqual(first.id,second.id);
});
test('rejects invalid submissions at the API',async()=>{assert.equal((await api('/launchpad/submissions',users[0],{method:'POST',body:JSON.stringify({answers:{...answers,funding:100001}})})).status,400);});
test('isolates personal history and protects response details',async()=>{
 const mine=await api('/launchpad/submissions/mine');assert.equal(mine.data.submissions.length,2);
 assert.equal((await api('/launchpad/submissions/mine',users[4])).data.submissions.length,0);
 assert.equal((await api(`/launchpad/submissions/${first.id}`,users[4])).status,404);
 assert.equal((await api(`/launchpad/submissions/${first.id}`,users[1])).status,200);
});
test('status updates preserve history, reject stale edits, and refresh owner results',async()=>{
 assert.equal((await api(`/launchpad/submissions/${first.id}/status`,users[0],{method:'PATCH',body:JSON.stringify({status:'successful',version:1})})).status,403);
 const r=await api(`/launchpad/submissions/${first.id}/status`,users[2],{method:'PATCH',body:JSON.stringify({status:'under_review',version:1})});assert.equal(r.status,200);assert.equal(r.data.submission.version,2);
 assert.equal((await api(`/launchpad/submissions/${first.id}/status`,users[1],{method:'PATCH',body:JSON.stringify({status:'rejected',version:1})})).status,409);
 const detail=await api(`/launchpad/submissions/${first.id}`);assert.equal(detail.data.submission.status,'under_review');assert.deepEqual(detail.data.history.map(h=>h.status),['submitted','under_review']);
 for(const [status,version] of [['successful',2],['rejected',3]]) assert.equal((await api(`/launchpad/submissions/${first.id}/status`,users[1],{method:'PATCH',body:JSON.stringify({status,version})})).status,200);
});
test('filters counts and exports across entities including full end dates',async()=>{
 const day=new Date().toLocaleDateString('en-CA',{timeZone:'Africa/Lagos'});
 const q=`search=${encodeURIComponent(users[0].email)}&entity=iwosan-lagoon&from=${day}&to=${day}`;
 const r=await api('/launchpad/review?'+q,users[1]);assert.equal(r.status,200);assert.equal(r.data.total,2);assert.equal(r.data.summary.submitted,1);assert.equal(r.data.summary.rejected,1);
 assert.equal((await api('/launchpad/review?'+q+'&status=rejected',users[1])).data.total,1);
 assert.equal((await api('/launchpad/review?search='+encodeURIComponent(first.reference),users[1])).data.total,1);
 const csv=await api('/launchpad/review/export?'+q,users[1]);assert.equal(csv.status,200);assert.match(csv.data,/'=Test export formula/);assert.match(csv.data,/Line manager email/);assert.ok(csv.data.includes(first.reference)&&csv.data.includes(second.reference));
 assert.equal((await api('/launchpad/review?from=invalid',users[1])).status,400);
});
test('only admins grant reviewer permission; stale tokens lose access after revocation',async()=>{
 assert.equal((await api(`/admin/users/${users[0].id}`,users[2],{method:'PATCH',body:JSON.stringify({canReviewLaunchpad:true})})).status,403);
 const grant=await api(`/admin/users/${users[0].id}`,users[3],{method:'PATCH',body:JSON.stringify({canReviewLaunchpad:true})});assert.equal(grant.status,200);assert.equal(grant.data.user.canReviewLaunchpad,true);
 assert.equal((await api('/launchpad/review',users[0])).status,200);
 assert.equal((await api(`/admin/users/${users[0].id}`,users[3],{method:'PATCH',body:JSON.stringify({canReviewLaunchpad:false})})).status,200);
 assert.equal((await api('/launchpad/review',users[0])).status,403);
});
