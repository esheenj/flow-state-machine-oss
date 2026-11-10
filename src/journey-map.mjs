// Original offline journey-mapping metadata worksheet: fictional journeys only.
// No participant interviews, validated accessibility evidence or live analytics.
export class JourneyFault extends Error {
 constructor(code){super(code);this.name="JourneyFault";this.code=code;}
}
const FIELDS=["id","label","stage","effort","emotion","helpAvailable"];
const STAGES=new Set(["discover","act","recover"]);
const ID=/^[a-z][a-z0-9-]{2,40}$/;
export function mapJourney(steps){
 if(!Array.isArray(steps)||steps.length<2||steps.length>10)throw new JourneyFault("INVALID_STEP_COUNT");
 const ids=new Set(),observations=[];
 let previous=null;
 const mapped=steps.map((step,index)=>{
  if(!step||typeof step!=="object"||Array.isArray(step)||
    ![Object.prototype,null].includes(Object.getPrototypeOf(step))||
    Object.keys(step).length!==FIELDS.length||!FIELDS.every(x=>Object.hasOwn(step,x)))
    throw new JourneyFault("INVALID_STEP_SHAPE");
  if(typeof step.id!=="string"||!ID.test(step.id)||ids.has(step.id))throw new JourneyFault("INVALID_OR_DUPLICATE_ID");
  ids.add(step.id);
  if(typeof step.label!=="string"||step.label.trim().length<2||step.label.length>80)throw new JourneyFault("INVALID_LABEL");
  if(typeof step.stage!=="string"||!STAGES.has(step.stage))throw new JourneyFault("INVALID_STAGE");
  if(!Number.isInteger(step.effort)||step.effort<0||step.effort>5)throw new JourneyFault("INVALID_EFFORT");
  if(!Number.isInteger(step.emotion)||step.emotion< -2||step.emotion>2)throw new JourneyFault("INVALID_EMOTION");
  if(typeof step.helpAvailable!=="boolean")throw new JourneyFault("INVALID_HELP_FLAG");
  const flags=[];
  if(step.effort>=4)flags.push("HIGH_EFFORT_EXAMPLE");
  if(step.emotion<0)flags.push("NEGATIVE_EMOTION_EXAMPLE");
  if(step.emotion<0&&!step.helpAvailable)flags.push("HELP_GAP_EXAMPLE");
  if(previous&&step.stage!==previous.stage&&step.effort>=4)flags.push("DIFFICULT_HANDOFF_EXAMPLE");
  for(const code of flags)observations.push(Object.freeze({id:step.id,code}));
  previous=step;
  return Object.freeze({...step,index:index+1,flags:Object.freeze(flags)});
 });
 const avg=Number((mapped.reduce((sum,row)=>sum+row.effort,0)/mapped.length).toFixed(2));
 return Object.freeze({
  schema:"fictional-journey-map-v1",steps:Object.freeze(mapped),
  frictionCount:observations.length,observations:Object.freeze(observations),averageEffort:avg,
  nextStudy:"Observe consenting participants at an actual stage handoff before prioritising design changes.",
  observedUsers:0,measuredDropoff:false,
  disclaimer:"Illustrative subjective scores, not customer research, actual drop-off or causal evidence."
 });
}
