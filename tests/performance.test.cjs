const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
function load(file,mocks={}){
 const filename=path.resolve(file),loaded={exports:{}};
 const source=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const req=id=>id==='server-only'?{}:mocks[id]??(id==='@/lib/home-analysis'?load('lib/home-analysis.ts',mocks):id.startsWith('.')?load(path.resolve(path.dirname(filename),id+'.ts'),mocks):require(id));
 vm.runInThisContext('(function(require,module,exports){'+source+'\n})',{filename})(req,loaded,loaded.exports);return loaded.exports;
}
function cacheMock(){const entries=new Map();return {unstable_cache:(fn,keys)=>async(...args)=>{const key=JSON.stringify([keys,args]);if(!entries.has(key))entries.set(key,Promise.resolve().then(()=>fn(...args)).catch(e=>{entries.delete(key);throw e}));return entries.get(key)}};}
test('public feed cache fits oversized feeds, deduplicates, and preserves scoring and availability',async()=>{
 const previous=global.fetch;let calls=0,stored=0;
 const c=cacheMock();const original=c.unstable_cache;
 c.unstable_cache=(fn,keys)=>original(async(...args)=>{const result=await fn(...args);stored=Buffer.byteLength(JSON.stringify(result));return result},keys);
 global.fetch=async()=>{calls++;return Response.json([{player_id:'p1',stats:{rush_yd:0,rec:4.125,unknown_scoring_key:6},player:{full_name:'Fixture Player',position:'RB',injury_status:'Questionable',unused_metadata:'x'.repeat(3000000)}}]);};
 try{
  const {publicSleeperFeed}=load('lib/sleeper/public-feed-cache.ts',{'next/cache':c});
  const url='https://api.sleeper.com/projections/nfl/2026/6?season_type=regular';
  const rows=await Promise.all(Array.from({length:8},()=>publicSleeperFeed(url,300)));
  await publicSleeperFeed(url,300);
  assert.equal(calls,1);assert.ok(stored<1900000);assert.equal(rows[0][0].stats.unknown_scoring_key,6);assert.equal(rows[0][0].stats.rush_yd,0);assert.equal(rows[0][0].stats.rec,4.125);assert.equal(rows[0][0].player.injury_status,'Questionable');assert.equal(rows[0][0].player.unused_metadata,undefined);
  await assert.rejects(()=>publicSleeperFeed('https://fnm.test/api/account/leagues',300),/Only public/);
  await assert.rejects(()=>publicSleeperFeed('https://api.sleeper.app/v1/league/123456789/rosters',300),/Only public/);
 }finally{global.fetch=previous;}
});
test('failed public requests are not retained as successful cached data',async()=>{
 const previous=global.fetch;let calls=0;
 global.fetch=async()=>++calls===1?new Response('',{status:503}):Response.json({p1:{full_name:'Recovered',position:'QB'}});
 try{const {publicSleeperFeed}=load('lib/sleeper/public-feed-cache.ts',{'next/cache':cacheMock()});const url='https://api.sleeper.app/v1/players/nfl?active=true';await assert.rejects(()=>publicSleeperFeed(url,300));assert.equal((await publicSleeperFeed(url,300)).p1.full_name,'Recovered');assert.equal(calls,2);}finally{global.fetch=previous;}
});
test('expired shared feed is refetched rather than presented as fresh',async()=>{
 const {gzipSync}=require('node:zlib');const previous=global.fetch;let calls=0;
 global.fetch=async()=>{calls++;return Response.json({p1:{full_name:'Fresh'}})};
 try{const {publicSleeperFeed}=load('lib/sleeper/public-feed-cache.ts',{'next/cache':{unstable_cache:()=>async()=>({at:Date.now()-900000,body:gzipSync(JSON.stringify({p1:{full_name:'Stale'}})).toString('base64')})}});assert.equal((await publicSleeperFeed('https://api.sleeper.app/v1/players/nfl?active=true',300)).p1.full_name,'Fresh');assert.equal(calls,1);}finally{global.fetch=previous;}
});
test('dashboard analysis excludes historical backfill and defers account-scoped persistence',async()=>{
 const previous=global.fetch;const requested=[],writes=[],reads=[];let deferred;
 const query={select(){return this},eq(k,v){reads.push([k,v]);return this},then(resolve){return Promise.resolve({data:[],error:null}).then(resolve)},async upsert(rows){writes.push(...rows);return {error:null}}};
 const teams=[{rosterId:1,ownerId:'owner',players:['p1'],starters:['p1']},{rosterId:2,ownerId:'rival',players:['p2'],starters:['p2']}];
 global.fetch=async url=>{url=String(url);requested.push(url);let data;
  if(url.includes('/state/nfl'))data={season:'2026',season_type:'regular',week:6};
  else if(url.endsWith('/rosters'))data=teams.map(t=>({roster_id:t.rosterId,owner_id:t.ownerId,players:t.players,starters:t.starters}));
  else if(url.endsWith('/users'))data=[];
  else if(url.includes('/matchups/'))data=teams.map(t=>({roster_id:t.rosterId,matchup_id:1,points:0}));
  else if(url.includes('/league/'))data={season:'2026',status:'in_season',settings:{last_scored_leg:5}};
  else if(url.includes('/players/'))data={p1:{full_name:'One',position:'RB'},p2:{full_name:'Two',position:'RB'}};
  else data=[{player_id:'p1',stats:{rush_yd:10}},{player_id:'p2',stats:{rush_yd:20}}];
  return Response.json(data);
 };
 try{
  const service=load('lib/sleeper/intelligence-server.ts',{'next/cache':cacheMock(),'@/lib/supabase/admin':{createAdminClient:()=>({from:()=>query})},'@/lib/supabase/server':{createClient:async()=>({from:()=>query})},'@/lib/fantasy-scoring':{calculateFantasyScore:s=>({total:s.rush_yd||0})},'@/lib/player-intelligence':{calculateProjectionAccuracy:()=>({})}});
  const result=await service.syncSleeperPlayerIntelligence({leagueRecord:{id:'saved',user_id:'authenticated-owner',provider_league_id:'123456789',raw_data:{leagueId:'123456789',season:'2026',teams,scoringSettings:{}}},deferPersistence:work=>{deferred=work}});
  assert.equal(result.projectionWeek,6);assert.equal(result.currentSnapshots.find(s=>s.playerId==='p1').projectedPoints,10);assert.equal(result.accuracySnapshots.length,2);assert.equal(result.storageStatus,'deferred');assert.equal(writes.length,0);assert.equal(reads.length,0);assert.ok(!requested.some(u=>/\/(?:3|4)(?:\?|$)/.test(u)));assert.equal(result.currentLeague.teams[0].ownerId,'owner');assert.ok(result.rostersSyncedAt);
  await deferred();assert.ok(writes.length>0);assert.ok(writes.every(row=>row.user_id==='authenticated-owner'&&row.provider_league_id==='123456789'));
 }finally{global.fetch=previous;}
});
test('overlapping analysis is coalesced only within the authenticated account and input version',async()=>{
 let calls=0;const owners=['owner-a','owner-a','owner-b'];
 const route=load('app/api/sleeper/intelligence/route.ts',{
  '@/lib/billing/entitlements':{getUserEntitlement:async()=>({})},
  '@/lib/player-intelligence':{buildPersonalizedPlayerRecommendations:()=>[]},
  '@/lib/sleeper/intelligence-server':{syncSleeperPlayerIntelligence:async({leagueRecord})=>{calls++;await new Promise(resolve=>setTimeout(resolve,30));return {currentLeague:leagueRecord.raw_data,activeSeason:false,currentSnapshots:[],accountMarker:leagueRecord.user_id};}},
  '@/lib/supabase/server':{createClient:async()=>{const owner=owners.shift();const query={select(){return this},eq(){return this},async maybeSingle(){return {data:{user_id:owner,raw_data:{leagueId:'123456789',teams:[],season:'2026'}},error:null}}};return {auth:{getUser:async()=>({data:{user:{id:owner}}})},from:()=>query};}}
 });
 const request=()=>new Request('https://fnm.test/api/sleeper/intelligence',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({leagueId:'123456789'})});
 const responses=await Promise.all([route.POST(request()),route.POST(request()),route.POST(request())]);const payloads=await Promise.all(responses.map(response=>response.json()));
 assert.equal(calls,2);assert.deepEqual(payloads.map(p=>p.accountMarker),['owner-a','owner-a','owner-b']);assert.ok(responses.every(response=>response.headers.get('cache-control')==='private, no-store'));
});
test('a slow league cannot block a ready league in the private matchup stream',async()=>{
 let release;const gate=new Promise(resolve=>{release=resolve});const filters=[];
 const records=[{raw_data:{leagueId:'slow'}},{raw_data:{leagueId:'ready'}}];
 const query={select(){return this},eq(k,v){filters.push([k,v]);return this},async order(){return {data:records,error:null}}};
 const route=load('app/api/account/matchups/route.ts',{'@/lib/supabase/server':{createClient:async()=>({auth:{getUser:async()=>({data:{user:{id:'stream-owner'}}})},from:()=>query})},'@/lib/sleeper/home-matchups':{loadHomeMatchup:async league=>{if(league.leagueId==='slow')await gate;return {league};}}});
 const response=await route.GET(new Request('https://fnm.test/api/account/matchups',{headers:{Accept:'application/x-ndjson'}}));
 const reader=response.body.getReader();const first=await reader.read();assert.equal(JSON.parse(new TextDecoder().decode(first.value)).matchup.league.leagueId,'ready');
 release();const second=await reader.read();assert.equal(JSON.parse(new TextDecoder().decode(second.value)).matchup.league.leagueId,'slow');assert.equal((await reader.read()).done,true);assert.ok(filters.some(([k,v])=>k==='user_id'&&v==='stream-owner'));assert.equal(response.headers.get('cache-control'),'private, no-store');
});
test('matchup streaming requires authentication before any provider or league work',async()=>{
 const route=load('app/api/account/matchups/route.ts',{'@/lib/supabase/server':{createClient:async()=>({auth:{getUser:async()=>({data:{user:null}})},from(){throw Error('No private query allowed')}})},'@/lib/sleeper/home-matchups':{loadHomeMatchup(){throw Error('No provider request allowed')}}});
 const response=await route.GET(new Request('https://fnm.test/api/account/matchups',{headers:{Accept:'application/x-ndjson'}}));assert.equal(response.status,401);
});
test('selection memory coalesces reads and never accepts a prior account response',async()=>{
 const {AccountMemory}=load('lib/account-memory.ts');const memory=new AccountMemory();let resolveA,calls=0;
 memory.setOwner('a');const loader=()=>{calls++;return new Promise(resolve=>{resolveA=resolve})};
 const one=memory.load('a',loader),two=memory.load('a',loader);assert.equal(calls,1);
 memory.setOwner('b');assert.equal(memory.peek('a'),undefined);memory.remember('b',{league:'b'});
 resolveA({league:'a'});await assert.rejects(one,/Account changed/);await assert.rejects(two,/Account changed/);assert.deepEqual(memory.peek('b'),{league:'b'});assert.equal(memory.peek('a'),undefined);
 memory.remember('a',{league:'wrong'});assert.deepEqual(memory.peek('b'),{league:'b'});
});
test('selection writes invalidate older reads and expired or cleared values cannot be reused',async()=>{
 const {AccountMemory}=load('lib/account-memory.ts');const memory=new AccountMemory(5);memory.setOwner('a');let complete;
 const old=memory.load('a',()=>new Promise(resolve=>{complete=resolve}));memory.remember('a',{league:'new'});complete({league:'old'});await assert.rejects(old,/Account changed/);assert.deepEqual(memory.peek('a'),{league:'new'});
 await new Promise(resolve=>setTimeout(resolve,10));assert.equal(memory.peek('a'),undefined);
 memory.remember('a',null);assert.equal(await memory.load('a',()=>{throw Error('A cached empty selection should not refetch')}),null);memory.clear();assert.equal(memory.peek('a'),undefined);
});
test('homepage payload reduction preserves team player details and identical matchup forecasts',()=>{
 const {homepageAnalysis}=load('lib/home-analysis.ts'),{forecastMatchup}=load('lib/matchup-forecast.ts');const at=new Date().toISOString();
 const own={rosterId:1,players:['own','bench'],starters:['own']},rival={rosterId:2,players:['rival'],starters:['rival']};
 const snapshot=(id,rosterId,team,projectedPoints)=>({playerId:id,rosterId,nflTeam:team,position:'WR',season:2026,week:6,projectedPoints,projectionStats:{rec_yd:100,rec:5},actualStats:{rec:0}});
 const data={leagueId:'league',season:2026,projectionWeek:6,syncedAt:at,rostersSyncedAt:at,activeSeason:true,currentLeague:{leagueId:'league',userRosterId:1,teams:[own,rival]},profiles:{own:{fullName:'Own'},bench:{fullName:'Bench'},rival:{fullName:'Rival'},...Object.fromEntries(Array.from({length:1000},(_,i)=>['free'+i,{fullName:'Unrostered player '+i}]))},currentSnapshots:[snapshot('own',1,'GB',20),snapshot('bench',1,'CHI',5),snapshot('rival',2,'CHI',30),snapshot('free',null,'GB',10)],accuracySnapshots:Array.from({length:60},(_,i)=>({...snapshot('history'+i,null,'GB',10),week:5,actualPoints:i%2?5:15}))};
 const card={league:{leagueId:'league',season:'2026'},week:6,status:'Upcoming',own,opponent:rival,score:0,opponentScore:0,forecastInputs:{games:[{home:'GB',away:'CHI',status:'scheduled'}],teams:[{rosterId:1,starters:['own'],points:[0]},{rosterId:2,starters:['rival'],points:[0]}]}};
 const slim=homepageAnalysis(data,1);assert.deepEqual(forecastMatchup(card,slim),forecastMatchup(card,data));assert.deepEqual(Object.keys(slim.profiles),['own','bench']);assert.deepEqual(slim.currentSnapshots.find(s=>s.playerId==='own').projectionStats,{rec_yd:100,rec:5});assert.ok(slim.currentSnapshots.some(s=>s.playerId==='rival'));assert.ok(!slim.currentSnapshots.some(s=>s.playerId==='free'));assert.ok(JSON.stringify(slim).length<JSON.stringify(data).length/2);
});
