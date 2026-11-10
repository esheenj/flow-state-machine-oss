import test from "node:test";
import assert from "node:assert/strict";
import {evaluateBlueprint,BlueprintFault} from "../src/service-blueprint.mjs";
const sample=()=>[
 {id:"invented-request",touchpoint:"Customer starts imaginary request",frontstage:"Mock request screen",backstage:"Fictional queue",dependency:"Sample website",waitMinutes:1,manualHandoff:false},
 {id:"invented-review",touchpoint:"Review pretend request",frontstage:"Mock status card",backstage:"Imaginary manual queue",dependency:null,waitMinutes:35,manualHandoff:true},
 {id:"invented-delivery",touchpoint:"View mock result",frontstage:"Mock completion message",backstage:"Imaginary fulfillment",dependency:"Sample review",waitMinutes:2,manualHandoff:false}
];
test("finds explainable fictional frontstage/backstage bottlenecks",()=>{
 const input=sample(),r=evaluateBlueprint(input);
 assert.equal(r.totalWaitMinutes,38);
 assert.equal(r.issueCount,3);
 assert.deepEqual(r.rows[1].flags,["LONG_ILLUSTRATIVE_WAIT","MANUAL_HANDOFF_DELAY","DEPENDENCY_UNMAPPED"]);
 assert.equal(r.observedServiceOperations,0);
 assert.equal(r.productionAuthority,false);
 assert.deepEqual(input,sample());
 assert(Object.isFrozen(r.rows));
});
test("all mapped and short fictional waits do not prove real service quality",()=>{
 const rows=sample();
 rows[1].waitMinutes=2;rows[1].dependency="Mock queue";rows[1].manualHandoff=false;
 const r=evaluateBlueprint(rows);
 assert.equal(r.issueCount,0);
 assert.equal(r.observedServiceOperations,0);
});
test("rejects unsupported steps, hidden data and impossible wait values",()=>{
 const first=sample()[0],second=sample()[1];
 for(const invalid of [
  [],[first],Array(9).fill(first),[first,first],
  [{...first,id:"../secret"},second],
  [{...first,waitMinutes:NaN},second],
  [{...first,waitMinutes:241},second],
  [{...first,manualHandoff:"false"},second],
  [{...first,backstage:""},second],
  [{...first,dependency:""},second],
  [{...first,secret:"private"},second],
  [Object.assign(Object.create(Date.prototype),first),second]
 ])assert.throws(()=>evaluateBlueprint(invalid),BlueprintFault);
});
test("markup-looking frontstage labels remain model data",()=>{
 const rows=sample();rows[0].frontstage="<img src=x onerror=alert(1)>";
 assert.equal(evaluateBlueprint(rows).rows[0].frontstage,rows[0].frontstage);
});
