import {NextRequest,NextResponse} from 'next/server';
import bcrypt from 'bcryptjs';
import {db} from '@/lib/db';
import {session,sign} from '@/lib/auth';
import {json,fail,safeError,moneyToCents} from '@/lib/http';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const cookieOptions={httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax' as const,path:'/',maxAge:8*60*60};
async function body(req:NextRequest){try{return await req.json()}catch{return null}}
async function freshUser(s:Awaited<ReturnType<typeof session>>){if(!s)return null;const rows=await db()`SELECT id,name,email,role,status FROM users WHERE id=${s.id} LIMIT 1`;return rows[0]||null}
async function handle(req:NextRequest,ctx:{params:{path:string[]}}){const route=ctx.params.path.join('/');const method=req.method;try{
 if(route==='logout'&&method==='POST'){const r=json({ok:true});r.cookies.set('bank_session','',{...cookieOptions,maxAge:0});return r}
 if(route==='register'&&method==='POST'){
  const b=await body(req);const name=String(b?.name||'').trim(),email=String(b?.email||'').trim().toLowerCase(),password=String(b?.password||'');
  if(name.length<2||name.length>100||!/^\S+@\S+\.\S+$/.test(email)||email.length>255||password.length<10||password.length>128)return fail('Enter a valid name, email and password (10+ characters)');
  const hash=await bcrypt.hash(password,12);const sql=db();const user=await sql.begin(async tx=>{const rows=await tx`INSERT INTO users(name,email,password_hash,role,status) VALUES(${name},${email},${hash},'customer','active') ON CONFLICT(email) DO NOTHING RETURNING id`;if(!rows.length)return null;await tx`INSERT INTO accounts(user_id,account_number,balance_cents) VALUES(${rows[0].id},${'AB'+crypto.randomUUID().replace(/-/g,'').slice(0,12).toUpperCase()},0)`;return rows[0]});if(!user)return fail('Email is already registered',409);return json({message:'Account created. Please sign in.'},201)
 }
 if(route==='login'&&method==='POST'){
  const b=await body(req);const email=String(b?.email||'').trim().toLowerCase(),password=String(b?.password||'');if(!email||!password)return fail('Email and password required');
  const rows=await db()`SELECT id,name,email,role,status,password_hash FROM users WHERE email=${email} LIMIT 1`;const u=rows[0];const valid=u?await bcrypt.compare(password,u.password_hash):false;if(!valid)return fail('Invalid credentials',401);if(u.status!=='active')return fail('Account is disabled',403);
  const r=json({role:u.role,name:u.name});r.cookies.set('bank_session',await sign({id:u.id,role:u.role,name:u.name}),cookieOptions);return r
 }
 const s=await session();const u=await freshUser(s);if(!u)return fail('Please sign in',401);if(u.status!=='active')return fail('Account disabled',403);
 if(route==='me'&&method==='GET')return json({user:{id:u.id,name:u.name,email:u.email,role:u.role}});
 if(route==='overview'&&method==='GET'){
  if(u.role!=='customer')return fail('Forbidden',403);
  const accounts=await db()`SELECT account_number,balance_cents FROM accounts WHERE user_id=${u.id}`;
  const transactions=await db()`SELECT id,type,amount_cents,description,created_at,reference FROM transactions WHERE user_id=${u.id} ORDER BY created_at DESC LIMIT 100`;
  return json({user:{name:u.name,email:u.email},account:accounts[0]||null,transactions});
 }
 if(route==='transfer'&&method==='POST'){
  if(u.role!=='customer')return fail('Forbidden',403);
  const b=await body(req),destination=String(b?.destination||'').trim().toUpperCase(),cents=moneyToCents(b?.amount);
  if(!/^AB[A-F0-9]{12}$/.test(destination)||!cents||cents>100000000)return fail('Invalid account number or amount (maximum ₹10,00,000)');
  const sql=db();const outcome=await sql.begin(async tx=>{
    const accounts=await tx`SELECT id,user_id,account_number,balance_cents FROM accounts WHERE user_id=${u.id} OR account_number=${destination} ORDER BY id FOR UPDATE`;
    const from=accounts.find(a=>a.user_id===u.id),to=accounts.find(a=>a.account_number===destination);
    if(!from||!to)return 'Account not found';if(from.id===to.id)return 'Cannot transfer to your own account';if(Number(from.balance_cents)<cents)return 'Insufficient balance';
    const recipient=await tx`SELECT status FROM users WHERE id=${to.user_id}`;if(recipient[0]?.status!=='active')return 'Recipient account unavailable';
    const ref='TX'+crypto.randomUUID().replace(/-/g,'').slice(0,16).toUpperCase();
    await tx`UPDATE accounts SET balance_cents=balance_cents-${cents} WHERE id=${from.id}`;
    await tx`UPDATE accounts SET balance_cents=balance_cents+${cents} WHERE id=${to.id}`;
    await tx`INSERT INTO transactions(user_id,type,amount_cents,description,reference) VALUES(${u.id},'debit',${cents},${'Transfer to '+destination},${ref})`;
    await tx`INSERT INTO transactions(user_id,type,amount_cents,description,reference) VALUES(${to.user_id},'credit',${cents},${'Transfer from '+from.account_number},${ref})`;
    return null;
  });if(outcome)return fail(outcome,400);return json({message:'Demo transfer completed'});
 }
 if(route==='admin/overview'&&method==='GET'){
  if(u.role!=='admin')return fail('Forbidden',403);
  const [users,transactions,stats]=await Promise.all([
    db()`SELECT u.id,u.name,u.email,u.role,u.status,u.created_at,a.account_number,a.balance_cents FROM users u LEFT JOIN accounts a ON a.user_id=u.id ORDER BY u.created_at DESC LIMIT 200`,
    db()`SELECT t.id,t.type,t.amount_cents,t.description,t.reference,t.created_at,u.name AS user_name FROM transactions t JOIN users u ON u.id=t.user_id ORDER BY t.created_at DESC LIMIT 100`,
    db()`SELECT (SELECT COUNT(*) FROM users WHERE role='customer') AS customers,(SELECT COUNT(*) FROM transactions) AS transactions,(SELECT COALESCE(SUM(balance_cents),0) FROM accounts) AS total_balance`]);
  return json({users,transactions,stats:stats[0]});
 }
 if(route==='admin/status'&&method==='POST'){
  if(u.role!=='admin')return fail('Forbidden',403);const b=await body(req);if(typeof b?.userId!=='string'||!['active','disabled'].includes(b?.status))return fail('Invalid request');
  const rows=await db()`UPDATE users SET status=${b.status} WHERE id=${b.userId} AND role='customer' RETURNING id`;if(!rows.length)return fail('Customer not found',404);return json({message:'Customer status updated'});
 }
 if(route==='admin/credit'&&method==='POST'){
  if(u.role!=='admin')return fail('Forbidden',403);const b=await body(req);const cents=moneyToCents(b?.amount);if(typeof b?.userId!=='string'||!cents||cents>100000000)return fail('Invalid amount or customer');
  const sql=db();const result=await sql.begin(async tx=>{const rows=await tx`SELECT a.id,u.status FROM accounts a JOIN users u ON u.id=a.user_id WHERE a.user_id=${b.userId} AND u.role='customer' FOR UPDATE`;if(!rows.length||rows[0].status!=='active')return false;await tx`UPDATE accounts SET balance_cents=balance_cents+${cents} WHERE id=${rows[0].id}`;await tx`INSERT INTO transactions(user_id,type,amount_cents,description,reference) VALUES(${b.userId},'credit',${cents},'Demo admin funding',${'SEED'+crypto.randomUUID().slice(0,12)})`;return true});if(!result)return fail('Active customer not found',404);return json({message:'Demo balance credited'});
 }
 return fail('Route not found',404);
 }catch(e){if(e&&typeof e==='object'&&'code'in e&&e.code==='23505')return fail('Duplicate record',409);return safeError(e)}}
export const GET=handle;export const POST=handle;
