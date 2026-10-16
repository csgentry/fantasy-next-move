const target=process.env.FNM_MONITOR_URL || 'https://fantasynextmove.com/api/health';
try {
 const response=await fetch(target,{signal:AbortSignal.timeout(15000),redirect:'error'});
 const body=await response.json().catch(()=>({}));
 const healthy=response.ok && body.status==='ready' && body.database==='reachable';
 console.log(JSON.stringify({check:'application_database_readiness',healthy,status:response.status}));
 if(!healthy)process.exitCode=1;
}catch{console.error('FantasyNextMove health check failed or timed out.');process.exitCode=1;}
