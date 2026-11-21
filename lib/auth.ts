import {SignJWT,jwtVerify} from 'jose';
import {cookies} from 'next/headers';
export type Session={id:string;role:'admin'|'customer';name:string};
function key(){const s=process.env.JWT_SECRET;if(!s||s.length<32)throw new Error('JWT_SECRET must be at least 32 characters');return new TextEncoder().encode(s)}
export async function sign(s:Session){return new SignJWT(s).setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime('8h').sign(key())}
export async function session():Promise<Session|null>{try{const token=cookies().get('bank_session')?.value;if(!token)return null;const {payload}=await jwtVerify(token,key());if(typeof payload.id!=='string'||(payload.role!=='admin'&&payload.role!=='customer')||typeof payload.name!=='string')return null;return {id:payload.id,role:payload.role,name:payload.name}}catch{return null}}
