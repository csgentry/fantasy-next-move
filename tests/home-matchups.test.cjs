const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm'),path=require('node:path');
function load(file,mocks={}){const filename=path.resolve(file),m={exports:{}};const source=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const req=id=>mocks[id]??(id.startsWith('.')?load(path.resolve(path.dirname(filename),id+'.ts'),mocks):require(id));vm.runInThisContext('(function(require,module,exports){'+source+'\n})',{filename})(req,m,m.exports);return m.exports;}
const service=load('lib/sleeper/home-matchups.ts');
const state={season:'2026',season_type:'regular',week:8,leg:8};
const meta={season:'2026',status:'in_season',settings:{last_scored_leg:7}};
test('provider week advances, league leg wins and completed leagues use last scored week',()=>{
 assert.equal(service.matchupWeek(meta,state),8);assert.equal(service.matchupWeek(meta,{...state,leg:9,week:9}),9);
 assert.equal(service.matchupWeek({...meta,settings:{leg:10}},state),10);
 assert.equal(service.matchupWeek({...meta,status:'complete'},state),7);
 assert.equal(service.matchupWeek({...meta,season:'2025'},state),7);
 assert.equal(service.matchupWeek({...meta,season:'2027',settings:{start_week:2}},state),2);
 assert.equal(service.matchupWeek({...meta,status:'complete',settings:{}},state),null);
});
test('schedule status supports upcoming, live, final and unknown without guessing',()=>{
 assert.equal(service.matchupStatus(meta,8,[{week:8,status:'scheduled'}],[]),'Upcoming');
 assert.equal(service.matchupStatus(meta,8,[{week:8,status:'inprogress'}],[]),'Live');
 assert.equal(service.matchupStatus(meta,8,[{week:8,status:'complete'},{week:8,status:'scheduled'}],[]),'Live');
 assert.equal(service.matchupStatus(meta,8,[{week:8,status:'complete'}],[]),'Final');
 assert.equal(service.matchupStatus(meta,7,[],[]),'Final');assert.equal(service.matchupStatus(meta,8,[],[]),null);
});
test('missing scores never become zeros and commissioner override is authoritative',()=>{
 assert.equal(service.scoreValue(undefined),null);assert.equal(service.scoreValue({points:null}),null);
 assert.equal(service.scoreValue({points:0}),0);assert.equal(service.scoreValue({points:20,custom_points:0}),0);
 assert.equal(service.scoreValue({points:NaN}),null);
});
const saved={provider:'sleeper',leagueId:'123456789',season:'2026',name:'Saved',userRosterId:1,teams:[{rosterId:1,ownerId:'customer',teamName:'Old'}]};
function response(data){return new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});}
test('live provider-shaped response pairs exact matchup ID, refreshes owner identity, preserves missing projection',async()=>{
 const real=global.fetch;global.fetch=async url=>{
 const s=String(url);return response(s.includes('/state/')?state:s.includes('/schedule/')?[{week:8,status:'inprogress'}]:s.endsWith('/rosters')?[{roster_id:1,owner_id:'customer',settings:{wins:4,losses:3}},{roster_id:2,owner_id:'opponent'},{roster_id:3,owner_id:'other'}]:s.endsWith('/users')?[{user_id:'customer',metadata:{team_name:'My Fresh Team'}},{user_id:'opponent',metadata:{team_name:'Right Opponent'}}]:s.includes('/matchups/')?[{roster_id:1,matchup_id:5,points:0},{roster_id:2,matchup_id:5,points:39},{roster_id:3,matchup_id:6,points:90}]:{...meta,name:'Fresh league',avatar:'e'.repeat(32)});
 };
 try{const r=await service.loadHomeMatchup(saved);assert.equal(r.leagueAvatarUrl,'https://sleepercdn.com/avatars/thumbs/'+ 'e'.repeat(32));assert.equal(r.opponent.teamName,'Right Opponent');assert.equal(r.own.teamName,'My Fresh Team');assert.equal(r.week,8);assert.equal(r.score,0);assert.equal(r.opponentScore,39);assert.equal(r.projection,null);assert.equal(r.own.rank,undefined);assert.equal(r.status,'Live');assert.ok(r.syncedAt);}finally{global.fetch=real;}
});
test('changed ownership and provider outage cannot display another owner as the customer',async()=>{
 const real=global.fetch;global.fetch=async url=>response(String(url).endsWith('/rosters')?[{roster_id:1,owner_id:'new-owner'}]:String(url).endsWith('/users')?[]:String(url).includes('/state/')?state:meta);
 try{const r=await service.loadHomeMatchup(saved);assert.equal(r.own,null);assert.equal(r.score,null);assert.match(r.note,/ownership/);global.fetch=async()=>{throw Error('private upstream detail')};const outage=await service.loadHomeMatchup(saved);assert.equal(outage.score,null);assert.equal(outage.syncedAt,null);assert.ok(!outage.note.includes('private upstream'));}finally{global.fetch=real;}
});
function route(user,records){let queried=false;const filters=[];const query={select(){return this},eq(k,v){filters.push([k,v]);return this},order(){queried=true;return Promise.resolve({data:records,error:null})}};return {filters,get queried(){return queried},GET:load('app/api/account/matchups/route.ts',{'@/lib/supabase/server':{createClient:async()=>({auth:{getUser:async()=>({data:{user},error:null})},from:()=>query})},'@/lib/sleeper/home-matchups':{loadHomeMatchup:async league=>({league,score:null})}}).GET};}
test('anonymous request denied before reading leagues',async()=>{const r=route(null,[]);assert.equal((await r.GET()).status,401);assert.equal(r.queried,false);});
test('multiple leagues returned only for authenticated owner, with private no-store responses',async()=>{const r=route({id:'owner-a'},[{raw_data:saved},{raw_data:{...saved,leagueId:'987654321'}}]);const result=await r.GET();assert.equal((await result.json()).matchups.length,2);assert.deepEqual(r.filters,[['user_id','owner-a'],['provider','sleeper']]);assert.equal(result.headers.get('Cache-Control'),'private, no-store');});
test('no connected leagues returns honest empty collection',async()=>{assert.equal((await (await route({id:'owner-b'},[]).GET()).json()).matchups.length,0);});

test('moving the connected owner to another roster carries fresh identity into navigation',async()=>{
 const real=global.fetch;global.fetch=async url=>{
 const s=String(url);return response(s.includes('/state/')?state:s.includes('/schedule/')?[]:s.endsWith('/rosters')?[{roster_id:1,owner_id:'new-owner'},{roster_id:2,owner_id:'customer',players:['current-player'],starters:['current-player'],settings:{fpts:123,fpts_decimal:45}}]:s.endsWith('/users')?[{user_id:'customer',metadata:{team_name:'Moved Team'}}]:s.includes('/matchups/')?[]:{...meta,name:'Fresh league',avatar:'e'.repeat(32)});
 };
 try{const r=await service.loadHomeMatchup(saved);assert.equal(r.rosterId,2);assert.equal(r.league.userRosterId,2);const customer=r.league.teams.find(t=>t.rosterId===2);assert.equal(customer.ownerId,'customer');assert.equal(customer.teamName,'Moved Team');assert.deepEqual(customer.starters,['current-player']);assert.equal(customer.pointsFor,123.45);}finally{global.fetch=real;}
});

test('homepage account image belongs to connected customer, never the selected rival or team logo',()=>{
 const {customerSleeperAvatar}=load('lib/home-imagery.ts');
 const league={provider:'sleeper',userRosterId:3,teams:[{rosterId:3,ownerAvatarUrl:'a'.repeat(32),avatarUrl:'b'.repeat(32)},{rosterId:10,ownerAvatarUrl:'c'.repeat(32),avatarUrl:'d'.repeat(32)}]};
 assert.equal(customerSleeperAvatar(league),'https://sleepercdn.com/avatars/thumbs/'+ 'a'.repeat(32));
 assert.equal(customerSleeperAvatar({...league,userRosterId:null}),null);
});
test('missing customer profile image stays neutral, including when a team logo exists',()=>{
 const {customerSleeperAvatar}=load('lib/home-imagery.ts');
 const league={provider:'sleeper',userRosterId:1,teams:[{rosterId:1,avatarUrl:'b'.repeat(32),ownerAvatarUrl:'https://untrusted.example/picture.jpg'}]};
 assert.equal(customerSleeperAvatar(league),null);assert.equal(customerSleeperAvatar({...league,provider:'yahoo'}),null);
});

test('homepage does not turn a one-week projection beat into trade advice',()=>{
 const {homepageRecommendations}=load('lib/home-dashboard.ts');
 const moves=[{id:'sell-high:123',category:'Trade'},{id:'trade-target:456',category:'Trade'},{id:'lineup:789',category:'Lineup'}];
 assert.deepEqual(homepageRecommendations(moves).map(m=>m.id),['trade-target:456','lineup:789']);
 assert.deepEqual(homepageRecommendations([moves[0]]),[]);
});
test('Before Kickoff stays on the owned roster, prioritizes starters and preserves designation text',()=>{
 const {rosterAvailability}=load('lib/home-dashboard.ts');
 const profiles={bench:{playerId:'bench',injuryStatus:'Out'},starter:{playerId:'starter',injuryStatus:'Questionable'},healthy:{playerId:'healthy',injuryStatus:'Active'},other:{playerId:'other',injuryStatus:'IR'}};
 const rows=rosterAvailability({players:['bench','healthy','starter'],starters:['starter']},profiles);
 assert.deepEqual(rows.map(p=>p.playerId),['starter','bench']);
 assert.equal(rows[0].injuryStatus,'Questionable');
 assert.deepEqual(rosterAvailability(undefined,profiles),[]);
});
test('homepage score synchronization slows outside live matchups and backs off on failure',()=>{
 const {matchupRefreshDelay}=load('lib/home-dashboard.ts');
 assert.equal(matchupRefreshDelay(['Final','Live']),120000);
 assert.equal(matchupRefreshDelay(['Upcoming']),300000);
 assert.equal(matchupRefreshDelay([null]),300000);
 assert.equal(matchupRefreshDelay(['Final']),900000);
 assert.equal(matchupRefreshDelay([]),900000);
 assert.equal(matchupRefreshDelay(['Live'],true),300000);
});
