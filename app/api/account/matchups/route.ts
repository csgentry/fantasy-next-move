import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { loadHomeMatchup } from '@/lib/sleeper/home-matchups';
import type { ImportedLeague } from '@/lib/types';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
const headers = {'Cache-Control':'private, no-store'};
export async function GET() {
  try {
    const supabase=await createClient();
    const {data:auth,error:authError}=await supabase.auth.getUser();
    if(authError||!auth.user) return NextResponse.json({error:'Sign in required.'},{status:401,headers});
    const {data,error}=await supabase.from('leagues').select('raw_data').eq('user_id',auth.user.id).eq('provider','sleeper').order('synced_at',{ascending:false});
    if(error) throw error;
    const records=(data||[]) as {raw_data:ImportedLeague}[];
    const matchups=[];
    // Bound concurrent provider work without dropping connected leagues.
    for(let i=0;i<records.length;i+=3) matchups.push(...await Promise.all(records.slice(i,i+3).map(r=>loadHomeMatchup(r.raw_data))));
    return NextResponse.json({matchups},{headers});
  } catch {return NextResponse.json({error:'We couldn’t load your matchups. Your league connections are unchanged.'},{status:502,headers});}
}
