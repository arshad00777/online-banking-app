import {json} from '@/lib/http';
export const runtime='nodejs';
export function GET(){return json({status:'ok',service:'AstraBank demo'})}
