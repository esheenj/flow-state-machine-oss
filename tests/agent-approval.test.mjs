import test from "node:test";
import assert from "node:assert/strict";
import {reviewApproval,ApprovalFault} from "../src/agent-approval.mjs";
const doc=(operation="READ_FIXTURE",events=[])=>({
 schema:"agent-approval-demo.v1",
 request:{id:"fictional-task",operation},events
});
const action=(id,decision)=>({id,decision});
test("never grants live authority even after allowed fictional sequence",()=>{
 const input=doc("READ_FIXTURE",[
  action("evt-one","APPROVE"),action("evt-two","SIMULATE")
 ]);
 const out=reviewApproval(input);
 assert.equal(out.state,"SIMULATED");
 assert.equal(out.simulatedRuns,1);
 assert.equal(out.blockedAttempts,0);
 assert.equal(out.realExecutionAllowed,false);
 assert(Object.isFrozen(out.trail));
 assert.deepEqual(input.events.map(x=>x.id),["evt-one","evt-two"]);
});
test("denied attempt is visible, recovery can reopen a fictional request",()=>{
 const out=reviewApproval(doc("READ_FIXTURE",[
  action("evt-one","SIMULATE"),action("evt-two","DENY"),
  action("evt-three","REOPEN"),action("evt-four","APPROVE"),
  action("evt-five","SIMULATE")
 ]));
 assert.equal(out.blockedAttempts,1);
 assert.equal(out.state,"SIMULATED");
 assert.equal(out.simulatedRuns,1);
 assert.equal(out.trail[0].reason,"SIMULATION_BLOCKED_NOT_APPROVED");
});
test("nonread operation remains denied even when user clicks approve",()=>{
 for(const op of ["WRITE_SIMULATION","TRANSFER_SIMULATION"]){
  const out=reviewApproval(doc(op,[action("evt-one","APPROVE"),action("evt-two","SIMULATE")]));
  assert.equal(out.state,"DENIED");
  assert.equal(out.simulatedRuns,0);
  assert.equal(out.blockedAttempts,1);
  assert.equal(out.realExecutionAllowed,false);
  assert.equal(out.trail[0].reason,"POLICY_DENIED_NONREAD");
 }
});
test("identical repeated event IDs are ignored, conflicting ones fail closed",()=>{
 const events=[action("evt-one","APPROVE"),action("evt-one","APPROVE"),action("evt-two","SIMULATE")];
 const out=reviewApproval(doc("READ_FIXTURE",events));
 assert.equal(out.eventsApplied,2);
 assert.equal(out.duplicatesIgnored,1);
 assert.equal(out.simulatedRuns,1);
 events[1]=action("evt-one","DENY");
 assert.throws(()=>reviewApproval(doc("READ_FIXTURE",events)),ApprovalFault);
});
test("impossible transitions are rejected without partial published result",()=>{
 for(const events of [
  [action("evt-one","REOPEN")],
  [action("evt-one","DENY"),action("evt-two","DENY")],
  [action("evt-one","APPROVE"),action("evt-two","APPROVE")],
  [action("evt-one","APPROVE"),action("evt-two","SIMULATE"),action("evt-three","REOPEN")],
 ]){
  assert.throws(()=>reviewApproval(doc("READ_FIXTURE",events)),ApprovalFault);
 }
});
test("requires strict metadata without secret-bearing fields or hostile identifiers",()=>{
 for(const input of [
  null,{},doc("DELETE_REAL"),{...doc(),secret:"x"},
  {...doc(),events:Array.from({length:41},(_,i)=>action("e"+String(i+100),"DENY"))},
  {...doc(),request:{id:"../secret",operation:"READ_FIXTURE"}},
  doc("READ_FIXTURE",[{id:"evt-one",decision:"APPROVE",token:"secret"}]),
  doc("READ_FIXTURE",[action("bad!", "APPROVE")]),
  doc("READ_FIXTURE",[action("evt-one", "EXECUTE")]),
  doc("READ_FIXTURE",[[1,2]])
 ])assert.throws(()=>reviewApproval(input),ApprovalFault);
});
