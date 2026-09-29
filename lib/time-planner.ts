export type PlannerKind="sleep"|"class"|"study"|"focus"|"meal"|"other";
export type PlannerItem={id:string;title:string;start:string;end:string;kind:PlannerKind;locked?:boolean;note?:string;warning?:string};
export type PlannerSettings={
  sleepStart:string;sleepEnd:string;gapMinutes:number;studyHoursPerClass:number;
  phaseSwitchDate:string;algoStartDate:string;caseHours:number;cfaHours:number;
  breakfastStart:string;lunchStart:string;snackStart:string;dinnerStart:string;mealMinutes:number;
};

export const defaultPlannerSettings:PlannerSettings={
  sleepStart:"23:00",sleepEnd:"07:00",gapMinutes:15,studyHoursPerClass:3,
  phaseSwitchDate:"2026-10-11",algoStartDate:"2026-10-12",caseHours:2,cfaHours:3,
  breakfastStart:"08:00",lunchStart:"12:30",snackStart:"16:00",dinnerStart:"20:00",mealMinutes:30,
};

const toMin=(value:string)=>{const [h,m]=value.split(":").map(Number);return h*60+m};
const toTime=(minutes:number)=>`${String(Math.floor(minutes/60)%24).padStart(2,"0")}:${String(minutes%60).padStart(2,"0")}`;
const duration=(item:PlannerItem)=>toMin(item.end)-toMin(item.start);
const weekday=(date:string)=>new Date(date+"T12:00:00Z").getUTCDay();
const dayName=(day:number)=>["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][day];
const addDays=(date:string,count:number)=>{const d=new Date(date+"T12:00:00Z");d.setUTCDate(d.getUTCDate()+count);return d.toISOString().slice(0,10)};

function classesForDate(date:string,settings:PlannerSettings):PlannerItem[]{
  const day=weekday(date);const items:PlannerItem[]=[];const add=(title:string,start:string,end:string,note:string)=>items.push({id:`class-${date}-${title}-${start}`,title,start,end,kind:"class",locked:true,note});
  if(day===1||day===2){add("SCMCFP","12:15","13:45","CR-101 · Section B");add("CEI","18:00","19:30","CR-102 · Section A")}
  if(day===3||day===4)add("QMSS","10:30","12:00","CR-102 · Section A");
  if(day===5||day===6){
    if(date>=settings.algoStartDate)add("Algo Investing","12:15","13:45","CR-106 · Post-midterm only");
    add("QAF","14:30","16:00","CR-102 · Section A");
    add("BAO","16:15","17:45","CR-102 · Section B");
  }
  return items;
}

function mealItems(date:string,settings:PlannerSettings,classes:PlannerItem[]):PlannerItem[]{
  const day=weekday(date);const hasAlgo=classes.some(x=>x.title==="Algo Investing");const meal=(title:string,start:string,end:string,warning?:string):PlannerItem=>({id:`meal-${date}-${title}`,title,start,end,kind:"meal",locked:true,warning});
  const breakfast=meal("Breakfast",settings.breakfastStart,toTime(toMin(settings.breakfastStart)+settings.mealMinutes));
  let lunchStart=settings.lunchStart;
  if(day===1||day===2)lunchStart="14:00";
  if(hasAlgo)lunchStart="14:00";
  const lunch=meal("Lunch",lunchStart,toTime(toMin(lunchStart)+settings.mealMinutes),hasAlgo?"Constraint exception: Algo ends at 13:45 and QAF starts at 14:30, so two 15-minute buffers plus a 30-minute lunch cannot fit.":"");
  let snackStart=settings.snackStart;let snackMinutes=settings.mealMinutes;let snackWarning="";
  if(day===5||day===6){snackStart="16:00";snackMinutes=15;snackWarning="Constraint exception: QAF and BAO leave only 16:00–16:15 inside the 16:00–18:00 mess window."}
  const snack=meal("Snacks",snackStart,toTime(toMin(snackStart)+snackMinutes),snackWarning);
  const dinner=meal("Dinner",settings.dinnerStart,toTime(toMin(settings.dinnerStart)+settings.mealMinutes));
  return [breakfast,lunch,snack,dinner];
}

function overlaps(start:number,end:number,item:PlannerItem,gap:number){
  const a=toMin(item.start),b=toMin(item.end);return start<b+gap&&end>a-gap;
}

function allocate(items:PlannerItem[],date:string,title:string,totalMinutes:number,kind:PlannerKind,note:string,settings:PlannerSettings){
  let remaining=totalMinutes;let index=0;
  const dayStart=toMin(settings.sleepEnd)+settings.gapMinutes;
  const dayEnd=toMin(settings.sleepStart)-settings.gapMinutes;
  while(remaining>=15){
    let placed=false;
    for(let cursor=dayStart;cursor<=dayEnd-15;cursor+=15){
      const maximum=Math.min(90,remaining,dayEnd-cursor);let length=maximum-maximum%15;
      while(length>=15&&items.some(item=>overlaps(cursor,cursor+length,item,settings.gapMinutes)))length-=15;
      if(length<15)continue;
      items.push({id:`${kind}-${date}-${index++}`,title,start:toTime(cursor),end:toTime(cursor+length),kind,note});remaining-=length;placed=true;break;
    }
    if(!placed)break;
  }
  return remaining;
}

export function generateDayPlan(date:string,settings:PlannerSettings){
  const classes=classesForDate(date,settings);
  const items=[...classes,...mealItems(date,settings,classes)];
  const classMinutes=classes.reduce((sum,item)=>sum+duration(item),0);
  const phaseIsCfa=date>=settings.phaseSwitchDate;
  const phaseMinutes=(phaseIsCfa?settings.cfaHours:settings.caseHours)*60;
  const phaseTitle=phaseIsCfa?"CFA Level II preparation":"Case competition";
  const phaseUnscheduled=allocate(items,date,phaseTitle,phaseMinutes,"focus",phaseIsCfa?"Daily from 11 October":"Daily through 10 October",settings);
  const workCapacity=Math.max(0,8*60-classMinutes-(phaseMinutes-phaseUnscheduled));
  const recentSubjects=Array.from(new Set(Array.from({length:7},(_,i)=>classesForDate(addDays(date,-i),settings).map(x=>x.title)).flat()));
  const studyTitle=recentSubjects.length?`Self-study · ${recentSubjects.join(" / ")}`:"Academic self-study / task execution";
  const studyUnscheduled=allocate(items,date,studyTitle,workCapacity,"study",`${settings.studyHoursPerClass} hours owed per class; use this block against the oldest pending subject.`,settings);
  items.sort((a,b)=>a.start.localeCompare(b.start)||a.end.localeCompare(b.end));
  const workMinutes=items.filter(x=>x.kind==="class"||x.kind==="study"||x.kind==="focus").reduce((s,x)=>s+duration(x),0);
  const rawSleep=toMin(settings.sleepEnd)-toMin(settings.sleepStart);
  const sleepMinutes=rawSleep>0?rawSleep:rawSleep+24*60;
  const otherMinutes=24*60-sleepMinutes-workMinutes;
  const weekStart=addDays(date,-((weekday(date)+6)%7));
  const weekClasses=Array.from({length:7},(_,i)=>classesForDate(addDays(weekStart,i),settings)).flat();
  const weeklyStudyDemand=weekClasses.length*settings.studyHoursPerClass;
  const warnings=items.filter(x=>x.warning).map(x=>x.warning as string);
  if(phaseUnscheduled>0)warnings.push(`${phaseUnscheduled/60} hour(s) of ${phaseTitle} could not fit.`);
  if(studyUnscheduled>0)warnings.push(`${studyUnscheduled/60} hour(s) of the daily work allocation could not fit.`);
  return {items,metrics:{sleep:sleepMinutes/60,work:workMinutes/60,other:otherMinutes/60,classHours:classMinutes/60,weeklyClasses:weekClasses.length,weeklyStudyDemand},warnings,dayName:dayName(weekday(date))};
}

export function plannerDuration(item:PlannerItem){return duration(item)/60}
