import {mapJourney} from "./journey-map.mjs";
const field=id=>document.getElementById(id);
const examples=[
 {id:"fictional-discover",label:"Read an invented product listing",stage:"discover",effort:1,emotion:1,helpAvailable:true},
 {id:"fictional-start",label:"Begin a made-up form",stage:"act",effort:4,emotion:-1,helpAvailable:false},
 {id:"fictional-recover",label:"Correct imaginary validation",stage:"recover",effort:2,emotion:0,helpAvailable:true}
];
field("input").value=JSON.stringify(examples,null,2);
function render(){
 field("steps").replaceChildren();
 field("summary").hidden=true;
 const raw=field("input").value;
 if(new TextEncoder().encode(raw).length>16384){
  field("status").textContent="Rejected: over 16 KiB of fictional input.";return;
 }
 let result;
 try{result=mapJourney(JSON.parse(raw));}
 catch(_){field("status").textContent="Rejected: check stage IDs, ordinal effort/emotion scores and fictional JSON.";return;}
 field("status").textContent="Mapped "+result.steps.length+" fictional steps · "+result.frictionCount+" illustrative friction signals.";
 field("effort").textContent=result.averageEffort.toFixed(2)+" / 5 average effort";
 for(const step of result.steps){
  const li=document.createElement("li");
  const stage=document.createElement("small");stage.textContent=step.stage+" · Step "+step.index;
  const h=document.createElement("h3");h.textContent=step.label;
  const meta=document.createElement("p");
  meta.textContent="Effort "+step.effort+"/5 · Emotion "+step.emotion+"/2 · Help "+(step.helpAvailable?"available":"not available");
  const notes=document.createElement("p");
  notes.textContent=step.flags.length?step.flags.join(" · "):"No modeled issues (not verified user success).";
  li.append(stage,h,meta,notes);
  field("steps").append(li);
 }
 field("summary").hidden=false;
}
field("map").addEventListener("click",render);
field("reset").addEventListener("click",()=>{field("input").value=JSON.stringify(examples,null,2);render();field("input").focus();});
render();
