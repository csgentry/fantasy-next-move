const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function action(auth){
 const loaded={exports:{}};
 const source=ts.transpileModule(fs.readFileSync('app/auth/actions.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const mocks={'@/lib/supabase/server':{createClient:async()=>({auth})},'next/navigation':{redirect:path=>{throw Object.assign(Error('redirect'),{path})}}};
 vm.runInThisContext('(function(require,module,exports){'+source+'\n})')(id=>mocks[id]||{},loaded,loaded.exports);return loaded.exports.signOut;
}
test('logout awaits Supabase local session termination before leaving the application',async()=>{
 let completed=false;
 const run=action({signOut:async options=>{assert.deepEqual(options,{scope:'local'});await Promise.resolve();completed=true;return {error:null}}});
 await assert.rejects(run(),error=>{assert.equal(completed,true);assert.equal(error.path,'/');return true});
});
test('failed logout does not falsely claim that the session has ended',async()=>{
 for(const signOut of [async()=>({error:{message:'Provider unavailable'}}),async()=>{throw Error('Network unavailable')}]){
  await assert.rejects(action({signOut})(),error=>{assert.match(error.path,/^\/account\?error=/);assert.match(decodeURIComponent(error.path),/Unable to log out/);return true});
 }
});
