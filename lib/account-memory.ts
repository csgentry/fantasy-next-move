// One instance per authenticated React session. Nothing is written to browser
// storage or shared with another request/session on the server.
export class AccountMemory<T>{
 private owner:string|null=null;
 private revision=0;
 private value:{at:number;data:T}|undefined;
 private pending:{promise:Promise<T>;controller:AbortController}|undefined;
 constructor(private ttl=60000){}
 clear(){this.revision++;this.pending?.controller.abort();this.pending=undefined;this.value=undefined;}
 setOwner(owner:string|null){if(owner!==this.owner){this.clear();this.owner=owner;}}
 peek(owner:string|null):T|undefined{return owner&&owner===this.owner&&this.value&&Date.now()-this.value.at<this.ttl?this.value.data:undefined;}
 remember(owner:string|null,data:T){if(!owner||owner!==this.owner)return;this.clear();this.value={at:Date.now(),data};}
 async load(owner:string|null,loader:(signal:AbortSignal)=>Promise<T>):Promise<T>{
  if(owner!==this.owner)throw Error('Account changed. Reload your league.');
  const current=this.peek(owner);if(current!==undefined)return current;
  if(this.pending)return this.pending.promise;
  const epoch=this.revision,controller=new AbortController();
  const promise=loader(controller.signal).then(data=>{
   if(epoch!==this.revision||owner!==this.owner)throw Error('Account changed. Reload your league.');
   if(owner)this.value={at:Date.now(),data};return data;
  });
  this.pending={promise,controller};
  try{return await promise;}finally{if(this.pending?.promise===promise)this.pending=undefined;}
 }
}
