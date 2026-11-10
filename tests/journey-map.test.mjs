import test from "node:test";
import assert from "node:assert/strict";
import {mapJourney,JourneyFault} from "../src/journey-map.mjs";
const sample=()=>[
 {id:"fictional-discover",label:"Read fictional listing",stage:"discover",effort:1,emotion:1,helpAvailable:true},
 {id:"fictional-start",label:"Begin invented form",stage:"act",effort:4,emotion:-1,helpAvailable:false},
 {id:"fictional-recover",label:"Fix invented validation",stage:"recover",effort:2,emotion:0,helpAvailable:true}
];
test("maps a fictional path, handoff pain points and evidence limitations",()=>{
 const source=sample(),r=mapJourney(source);
 assert.equal(r.steps.length,3);
 assert.equal(r.averageEffort,2.33);
 assert.deepEqual(r.steps[1].flags,[
  "HIGH_EFFORT_EXAMPLE","NEGATIVE_EMOTION_EXAMPLE","HELP_GAP_EXAMPLE","DIFFICULT_HANDOFF_EXAMPLE"
 ]);
 assert.equal(r.frictionCount,4);
 assert.equal(r.observedUsers,0);
 assert.equal(r.measuredDropoff,false);
 assert.deepEqual(source,sample());
 assert(Object.isFrozen(r.observations));
});
test("zero signals does not claim a validated user journey",()=>{
 const x=sample();x[1].effort=1;x[1].emotion=1;x[1].helpAvailable=true;
 const r=mapJourney(x);
 assert.equal(r.frictionCount,0);
 assert.equal(r.observedUsers,0);
});
test("rejects unsupported stages, duplicate IDs and impossible scores",()=>{
 const cases=[[],[sample()[0]],Array(11).fill(sample()[0]),
  [{...sample()[0],id:"wrong!"},sample()[1]],
  [{...sample()[0],effort:Infinity},sample()[1]],
  [{...sample()[0],emotion:-3},sample()[1]],
  [{...sample()[0],helpAvailable:"yes"},sample()[1]],
  [{...sample()[0],stage:"production"},sample()[1]],
  [{...sample()[0],extra:"control"},sample()[1]],
  [Object.assign(Object.create(Date.prototype),sample()[0]),sample()[1]],
  [sample()[0],sample()[0]]];
 for(const x of cases)assert.throws(()=>mapJourney(x),JourneyFault);
});
test("hostile-looking labels are preserved as inert model data",()=>{
 const x=sample();x[0].label="<img src=x onerror=alert(1)>";
 assert.equal(mapJourney(x).steps[0].label,x[0].label);
});
