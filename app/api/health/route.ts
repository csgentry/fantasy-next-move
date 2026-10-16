import {NextResponse} from "next/server";
export const dynamic="force-dynamic";
export async function GET(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 const headers={"Cache-Control":"no-store"};
 if(!url||!key)return NextResponse.json({status:"configuration_required",database:"unknown"},{status:503,headers});
 try {
  // Readiness probe runs as the public role; never uses the service credential.
  const response=await fetch(`${url}/rest/v1/profiles?select=id&limit=1`,{method:"HEAD",headers:{apikey:key},cache:"no-store",signal:AbortSignal.timeout(5000)});
  return NextResponse.json({status:response.ok?"ready":"dependency_unavailable",database:response.ok?"reachable":"unavailable",scope:"application_database_only"},{status:response.ok?200:503,headers});
 }catch{return NextResponse.json({status:"dependency_unavailable",database:"unavailable"},{status:503,headers});}
}
