import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { loadHomeMatchup } from '@/lib/sleeper/home-matchups';
import type { ImportedLeague } from '@/lib/types';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
const headers = {'Cache-Control':'private, no-store'};
export async function GET(request?:NextRequest) {
  try {
    const supabase=await createClient();
    const {data:auth,error:authError}=await supabase.auth.getUser();
    if(authError||!auth.user) return NextResponse.json({error:'Sign in required.'},{status:401,headers});
    const {data,error}=await supabase.from('leagues').select('raw_data').eq('user_id',auth.user.id).eq('provider','sleeper').order('synced_at',{ascending:false});
    if(error) throw error;
    const records=(data||[]) as {raw_data:ImportedLeague}[];
    if(request?.headers.get('accept')==='application/x-ndjson'){
      let closed=false;
      const encoder=new TextEncoder();
      const stream=new ReadableStream({
        async start(controller){
          try{
            for(let i=0;i<records.length&&!closed;i+=3)await Promise.all(records.slice(i,i+3).map(async(r,index)=>{
              const matchup=await loadHomeMatchup(r.raw_data);
              if(!closed)controller.enqueue(encoder.encode(JSON.stringify({index:i+index,matchup})+'\n'));
            }));
            if(!closed)controller.close();
          }catch(error){if(!closed)controller.error(error);}
        },
        cancel(){closed=true;}
      });
      return new NextResponse(stream,{headers:{...headers,'Content-Type':'application/x-ndjson; charset=utf-8'}});
    }
    const matchups=[];
    // Bound concurrent provider work without dropping connected leagues.
    for(let i=0;i<records.length;i+=3) matchups.push(...await Promise.all(records.slice(i,i+3).map(r=>loadHomeMatchup(r.raw_data))));
    return NextResponse.json({matchups},{headers});
  } catch {return NextResponse.json({error:'We couldn’t load your matchups. Your league connections are unchanged.'},{status:502,headers});}
}
