// Original offline fictional service blueprint worksheet. No organizational data.
export class BlueprintFault extends Error {
 constructor(code){super(code);this.name="BlueprintFault";this.code=code;}
}
const KEYS=["id","touchpoint","frontstage","backstage","dependency","waitMinutes","manualHandoff"];
const ID=/^[a-z][a-z0-9-]{2,36}$/;
function str(s,max=90){return typeof s==="string"&&s.trim().length>=2&&s.length<=max;}
export function evaluateBlueprint(steps){
 if(!Array.isArray(steps)||steps.length<2||steps.length>8)
  throw new BlueprintFault("INVALID_STEP_COUNT");
 const seen=new Set(),findings=[];
 let totalWaitMinutes=0;
 const rows=steps.map((step,index)=>{
  if(!step||typeof step!=="object"||Array.isArray(step)||
     ![Object.prototype,null].includes(Object.getPrototypeOf(step))||
     Object.keys(step).length!==KEYS.length||!KEYS.every(k=>Object.hasOwn(step,k)))
   throw new BlueprintFault("INVALID_STEP_SHAPE");
  if(typeof step.id!=="string"||!ID.test(step.id)||seen.has(step.id))
   throw new BlueprintFault("INVALID_OR_DUPLICATE_ID");
  seen.add(step.id);
  for(const key of ["touchpoint","frontstage","backstage"]){
   if(!str(step[key]))throw new BlueprintFault("INVALID_LABEL");
  }
  if(step.dependency!==null&&!str(step.dependency))throw new BlueprintFault("INVALID_DEPENDENCY");
  if(!Number.isInteger(step.waitMinutes)||step.waitMinutes<0||step.waitMinutes>240)
   throw new BlueprintFault("INVALID_WAIT");
  if(typeof step.manualHandoff!=="boolean")throw new BlueprintFault("INVALID_HANDOFF");
  const flags=[];
  if(step.waitMinutes>20)flags.push("LONG_ILLUSTRATIVE_WAIT");
  if(step.manualHandoff&&step.waitMinutes>5)flags.push("MANUAL_HANDOFF_DELAY");
  if(step.dependency===null)flags.push("DEPENDENCY_UNMAPPED");
  totalWaitMinutes+=step.waitMinutes;
  for(const code of flags)findings.push(Object.freeze({stepId:step.id,code}));
  return Object.freeze({...step,index:index+1,flags:Object.freeze(flags)});
 });
 return Object.freeze({
  schema:"fictional-service-blueprint-v1",rows:Object.freeze(rows),
  issueCount:findings.length,findings:Object.freeze(findings),totalWaitMinutes,
  observedServiceOperations:0,productionAuthority:false,
  nextTest:"Observe a real, authorized service handoff and compare actual wait times before prioritizing changes.",
  disclaimer:"Synthetic frontstage/backstage sketch only, not verified organizational process intelligence."
 });
}
