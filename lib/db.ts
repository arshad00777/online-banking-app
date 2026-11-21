import postgres from 'postgres';
let client:ReturnType<typeof postgres>|undefined;
export function db(){if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL is not configured. Follow README setup.');if(!client)client=postgres(process.env.DATABASE_URL,{max:5,prepare:false,ssl:process.env.DATABASE_URL.includes('localhost')?false:'require'});return client;}
