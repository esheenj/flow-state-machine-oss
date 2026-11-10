import {reviewApproval} from "./agent-approval.mjs";
const $=id=>document.getElementById(id);
const SCHEMA="agent-approval-demo.v1";
let events=[],counter=0;
function envelope(rows=events){
 return {schema:SCHEMA,request:{id:"fictional-task",operation:$("operation").value},events:rows};
}
function show(report){
 $("state").textContent=report.state;
 $("counts").textContent=report.eventsApplied+" distinct fictional events · "+report.blockedAttempts+
  " blocked attempts · "+report.simulatedRuns+" simulated-only completions";
 $("events").replaceChildren();
 for(const step of report.trail){
  const li=document.createElement("li");
  const title=document.createElement("strong");
  title.textContent=step.number+". "+step.decision+" · "+step.before+" → "+step.after;
  const detail=document.createElement("p");
  detail.textContent=step.reason+" · "+step.eventId;
  li.append(title,detail);$("events").append(li);
 }
 if(!report.trail.length){
  const li=document.createElement("li");li.textContent="No decisions yet. Try an attempted run before approval.";
  $("events").append(li);
 }
 $("notice").textContent="All actions are fictional. Real execution authorization: NEVER.";
}
function apply(decision){
 const next={id:"fictional-event-"+String(counter+1),decision};
 try{
  const report=reviewApproval(envelope([...events,next]));
  counter+=1;events=[...events,next];show(report);
 }catch(_){
  $("notice").textContent="Rejected: that transition is not allowed in the fictional state machine. Earlier decisions are unchanged.";
 }
}
function reset(){
 events=[];counter=0;
 show(reviewApproval(envelope()));
}
for(const id of ["approve","deny","reopen","simulate"]){
 $(id).addEventListener("click",()=>apply(id.toUpperCase()));
}
$("operation").addEventListener("change",reset);
$("reset").addEventListener("click",()=>{
 $("operation").value="READ_FIXTURE";reset();$("operation").focus();
});
reset();
