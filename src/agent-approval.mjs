// Original offline authorization-state teaching simulator. NEVER grants
// real-world permissions, tool authority, credentials or execution rights.
export class ApprovalFault extends Error{
 constructor(code){super(code);this.name="ApprovalFault";this.code=code;}
}
const ID=/^[a-z][a-z0-9-]{2,40}$/;
const OPERATIONS=new Set(["READ_FIXTURE","WRITE_SIMULATION","TRANSFER_SIMULATION"]);
const DECISIONS=new Set(["APPROVE","DENY","REOPEN","SIMULATE"]);
const plain=x=>x!==null&&typeof x==="object"&&!Array.isArray(x)&&
 [Object.prototype,null].includes(Object.getPrototypeOf(x));
const fail=code=>{throw new ApprovalFault(code);};
export function reviewApproval(input){
 if(!plain(input)||Object.keys(input).length!==3||
   !["schema","request","events"].every(k=>Object.hasOwn(input,k))||
   input.schema!=="agent-approval-demo.v1")fail("INVALID_ENVELOPE");
 const request=input.request;
 if(!plain(request)||Object.keys(request).length!==2||
   !Object.hasOwn(request,"id")||!Object.hasOwn(request,"operation")||
   typeof request.id!=="string"||!ID.test(request.id)||
   typeof request.operation!=="string"||!OPERATIONS.has(request.operation))fail("INVALID_REQUEST");
 if(!Array.isArray(input.events)||input.events.length>40)fail("INVALID_EVENT_COUNT");
 const seen=new Map(),trail=[];
 let state="PENDING",blockedAttempts=0,simulatedRuns=0,duplicatesIgnored=0;
 for(const [index,event] of input.events.entries()){
  if(!plain(event)||Object.keys(event).length!==2||
     !Object.hasOwn(event,"id")||!Object.hasOwn(event,"decision")||
     typeof event.id!=="string"||!ID.test(event.id)||
     typeof event.decision!=="string"||!DECISIONS.has(event.decision))fail("INVALID_EVENT");
  if(seen.has(event.id)){
   if(seen.get(event.id)!==event.decision)fail("CONFLICTING_REPLAY");
   duplicatesIgnored+=1;
   continue;
  }
  seen.set(event.id,event.decision);
  const before=state;
  let reason="FICTIONAL_STATE_CHANGE";
  if(event.decision==="APPROVE"){
   if(state!=="PENDING")fail("APPROVE_REQUIRES_PENDING");
   // Simulated approval cannot override a fixture-only policy denial.
   if(request.operation!=="READ_FIXTURE"){
    state="DENIED";reason="POLICY_DENIED_NONREAD";
   }else state="APPROVED";
  }else if(event.decision==="DENY"){
   if(state!=="PENDING")fail("DENY_REQUIRES_PENDING");
   state="DENIED";
  }else if(event.decision==="REOPEN"){
   if(state!=="DENIED")fail("REOPEN_REQUIRES_DENIED");
   state="PENDING";
  }else if(event.decision==="SIMULATE"){
   if(state==="APPROVED"&&request.operation==="READ_FIXTURE"){
    state="SIMULATED";simulatedRuns+=1;reason="FICTIONAL_ONLY_NO_TOOL_CALLED";
   }else{
    blockedAttempts+=1;reason="SIMULATION_BLOCKED_NOT_APPROVED";
   }
  }
  trail.push(Object.freeze({number:index+1,eventId:event.id,decision:event.decision,
   before,after:state,reason}));
 }
 return Object.freeze({
  schema:"agent-approval-demo.review.v1",requestId:request.id,operation:request.operation,
  state,eventsApplied:seen.size,duplicatesIgnored,blockedAttempts,simulatedRuns,
  trail:Object.freeze(trail),realExecutionAllowed:false,
  scope:"Fictional local state machine; no authenticated human approval or production execution authority."
 });
}
