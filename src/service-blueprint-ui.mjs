import {evaluateBlueprint} from "./service-blueprint.mjs";
const $=id=>document.getElementById(id);
const demo=[
 {id:"invented-request",touchpoint:"Customer starts imaginary request",frontstage:"Mock request screen",backstage:"Fictional queue",dependency:"Sample website",waitMinutes:1,manualHandoff:false},
 {id:"invented-review",touchpoint:"Review pretend request",frontstage:"Mock status card",backstage:"Imaginary manual queue",dependency:null,waitMinutes:35,manualHandoff:true},
 {id:"invented-delivery",touchpoint:"View mock result",frontstage:"Mock completion message",backstage:"Imaginary fulfillment",dependency:"Sample review",waitMinutes:2,manualHandoff:false}
];
$("input").value=JSON.stringify(demo,null,2);
function render(){
 $("rows").replaceChildren();$("output").hidden=true;
 const raw=$("input").value;
 if(new TextEncoder().encode(raw).length>16384){
  $("status").textContent="Rejected: sample must be under 16 KiB.";return;
 }
 let report;
 try{report=evaluateBlueprint(JSON.parse(raw));}
 catch(_){$("status").textContent="Rejected: check each step ID, text, dependencies and wait times.";return;}
 $("status").textContent=report.rows.length+" fictional service steps mapped · "+report.issueCount+" illustrative flags.";
 $("wait").textContent="Total invented wait time: "+report.totalWaitMinutes+" minutes";
 for(const step of report.rows){
  const li=document.createElement("li");
  const title=document.createElement("strong");title.textContent=step.index+". "+step.touchpoint;
  const front=document.createElement("p");front.textContent="Visible action: "+step.frontstage;
  const back=document.createElement("p");back.textContent="Behind the scenes: "+step.backstage;
  const dep=document.createElement("p");dep.textContent="Dependency: "+(step.dependency||"unmapped");
  const flags=document.createElement("p");
  flags.textContent=step.flags.length?step.flags.join(" · "):"No modeled flag (not observed service success).";
  const time=document.createElement("p");
  time.textContent="Illustrative wait: "+step.waitMinutes+" min · Manual handoff: "+(step.manualHandoff?"yes":"no");
  li.append(title,front,back,dep,time,flags);
  $("rows").append(li);
 }
 $("output").hidden=false;
}
$("map").addEventListener("click",render);
$("reset").addEventListener("click",()=>{$("input").value=JSON.stringify(demo,null,2);render();$("input").focus();});
render();
