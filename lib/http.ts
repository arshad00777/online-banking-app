import {NextResponse} from 'next/server';
export const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
export const fail=(message:string,status=400)=>json({error:message},status);
export function safeError(e:unknown){console.error(e);return fail('Request could not be completed',500)}
export function moneyToCents(v:unknown):number|null{if(typeof v!=='string'&&typeof v!=='number')return null;const s=String(v);if(!/^(0|[1-9]\d{0,8})(\.\d{1,2})?$/.test(s))return null;const [a,b='']=s.split('.');const n=Number(a)*100+Number(b.padEnd(2,'0'));return Number.isSafeInteger(n)&&n>0?n:null}
