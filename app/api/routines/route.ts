import { getRawDb } from "../../../db";
import { getChatGPTUser } from "../../chatgpt-auth";

const defaults=[
  {name:"Meditation",time:"07:00"},{name:"Walking",time:"07:30"},{name:"Breakfast",time:"09:00"},
  {name:"Lunch",time:"13:30"},{name:"Snacks",time:"17:30"},{name:"Dinner",time:"21:00"},
];

type RoutineValue={name:string;time:string};
type RoutineRow={id:number;value:string;sort_order:number};

function encode(value:RoutineValue){return JSON.stringify(value)}
function decode(row:RoutineRow){try{return {id:row.id,...JSON.parse(row.value) as RoutineValue,sort_order:row.sort_order}}catch{return {id:row.id,name:row.value,time:"",sort_order:row.sort_order}}}
function addDays(date:string,count:number){const d=new Date(date+"T12:00:00Z");d.setUTCDate(d.getUTCDate()+count);return d.toISOString().slice(0,10)}

async function ensureDefinitions(db:D1Database){
  const count=await db.prepare("SELECT COUNT(*) AS count FROM list_items WHERE group_name='personal_routine'").first<{count:number}>();
  if((count?.count??0)>0)return;
  await db.batch(defaults.map((item,index)=>db.prepare("INSERT OR IGNORE INTO list_items (group_name,value,sort_order) VALUES ('personal_routine',?,?)").bind(encode(item),index)));
}

export async function GET(request:Request){
  const user=await getChatGPTUser();
  if(!user) return Response.json({error:"Unauthorized"},{status:401});
  try{
    const db=getRawDb();await ensureDefinitions(db);
    const date=new URL(request.url).searchParams.get("date")??new Date().toISOString().slice(0,10);
    const [items,completions,history]=await Promise.all([
      db.prepare("SELECT id,value,sort_order FROM list_items WHERE group_name='personal_routine' ORDER BY sort_order,id").all<RoutineRow>(),
      db.prepare("SELECT routine,complete FROM routine_completions WHERE completion_date=?").bind(date).all(),
      db.prepare("SELECT routine,completion_date,complete FROM routine_completions WHERE completion_date BETWEEN ? AND ? ORDER BY completion_date").bind(addDays(date,-29),date).all(),
    ]);
    return Response.json({definitions:items.results.map(decode),routines:completions.results,history:history.results,windowDays:30});
  }catch(error){console.error("GET /api/routines failed",error);return Response.json({error:"Unable to load routines"},{status:500})}
}

export async function POST(request:Request){
  const user=await getChatGPTUser();
  if(!user) return Response.json({error:"Unauthorized"},{status:401});
  try{
    const db=getRawDb();const body=await request.json() as {action?:string;routine?:string;date?:string;complete?:boolean;name?:string;time?:string};
    if(body.action==="create"){
      const name=String(body.name??"").trim(),time=String(body.time??"").trim();
      if(!name)return Response.json({error:"Habit name is required"},{status:400});
      const existing=await db.prepare("SELECT id,value,sort_order FROM list_items WHERE group_name='personal_routine'").all<RoutineRow>();
      if(existing.results.some(row=>decode(row).name.toLowerCase()===name.toLowerCase()))return Response.json({error:"That habit already exists"},{status:409});
      const max=Math.max(-1,...existing.results.map(row=>row.sort_order));
      const result=await db.prepare("INSERT INTO list_items (group_name,value,sort_order) VALUES ('personal_routine',?,?)").bind(encode({name,time}),max+1).run();
      return Response.json({id:Number(result.meta.last_row_id),name,time,sort_order:max+1},{status:201});
    }
    if(!body.routine||!body.date)return Response.json({error:"Routine and date are required"},{status:400});
    await db.prepare("INSERT INTO routine_completions (routine,completion_date,complete) VALUES (?,?,?) ON CONFLICT(completion_date,routine) DO UPDATE SET complete=excluded.complete").bind(body.routine,body.date,body.complete?1:0).run();
    return Response.json({routine:body.routine,date:body.date,complete:Boolean(body.complete)});
  }catch(error){console.error("POST /api/routines failed",error);return Response.json({error:"Unable to save routine"},{status:500})}
}

export async function PATCH(request:Request){
  const user=await getChatGPTUser();
  if(!user) return Response.json({error:"Unauthorized"},{status:401});
  try{
    const db=getRawDb();const {id,name,time}=await request.json() as {id:number;name:string;time:string};
    const cleanName=String(name??"").trim(),cleanTime=String(time??"").trim();
    if(!id||!cleanName)return Response.json({error:"Habit name is required"},{status:400});
    const current=await db.prepare("SELECT id,value,sort_order FROM list_items WHERE id=? AND group_name='personal_routine'").bind(id).first<RoutineRow>();
    if(!current)return Response.json({error:"Habit not found"},{status:404});
    const oldName=decode(current).name;
    const duplicates=await db.prepare("SELECT id,value,sort_order FROM list_items WHERE group_name='personal_routine' AND id<>?").bind(id).all<RoutineRow>();
    if(duplicates.results.some(row=>decode(row).name.toLowerCase()===cleanName.toLowerCase()))return Response.json({error:"That habit already exists"},{status:409});
    await db.batch([
      db.prepare("UPDATE list_items SET value=? WHERE id=?").bind(encode({name:cleanName,time:cleanTime}),id),
      db.prepare("UPDATE routine_completions SET routine=? WHERE routine=?").bind(cleanName,oldName),
    ]);
    return Response.json({id,name:cleanName,time:cleanTime,sort_order:current.sort_order});
  }catch(error){console.error("PATCH /api/routines failed",error);return Response.json({error:"Unable to update habit"},{status:500})}
}

export async function DELETE(request:Request){
  const user=await getChatGPTUser();
  if(!user) return Response.json({error:"Unauthorized"},{status:401});
  try{
    const db=getRawDb();const id=Number(new URL(request.url).searchParams.get("id"));
    if(!id)return Response.json({error:"Habit id is required"},{status:400});
    await db.prepare("DELETE FROM list_items WHERE id=? AND group_name='personal_routine'").bind(id).run();
    return Response.json({deleted:true,id});
  }catch(error){console.error("DELETE /api/routines failed",error);return Response.json({error:"Unable to remove habit"},{status:500})}
}
