import { getRawDb } from "../../../db";
import { getChatGPTUser } from "../../chatgpt-auth";

const editable = ["task","category","subcategory","parent_activity","context","priority","status","date_created","start_date","deadline","deadline_time","deadline_tbd","fixed_event","event_date","event_time","estimated_hours","actual_hours","next_action","waiting_for","follow_up_date","assigned_by","team_members","deliverable","stage","venue","link","notes","complete","completion_date","deadline_reliability"] as const;

async function removeDemoTasksAndRenumber(db:D1Database) {
  const marker=await db.prepare("SELECT 1 FROM list_items WHERE group_name='system' AND value='task_cleanup_v1'").first();
  if(marker)return;
  await db.prepare("DELETE FROM tasks WHERE task_id IN ('TASK-0001','TASK-0002','TASK-0003','TASK-0004','TASK-0005','TASK-0006','TASK-0007')").run();
  const rows=await db.prepare("SELECT id FROM tasks ORDER BY id").all<{id:number}>();
  if(rows.results.length){
    await db.batch(rows.results.map(row=>db.prepare("UPDATE tasks SET task_id=? WHERE id=?").bind(`RENUMBER-${row.id}`,row.id)));
    await db.batch(rows.results.map((row,index)=>db.prepare("UPDATE tasks SET task_id=? WHERE id=?").bind(`TASK-${String(index+1).padStart(4,"0")}`,row.id)));
  }
  await db.prepare("INSERT OR IGNORE INTO list_items (group_name,value,sort_order) VALUES ('system','task_cleanup_v1',0)").run();
}

export async function GET() {
  const user=await getChatGPTUser();
  if(!user) return Response.json({error:"Unauthorized"},{status:401});
  try {
    const db=getRawDb(); await removeDemoTasksAndRenumber(db);
    const result=await db.prepare("SELECT * FROM tasks ORDER BY task_id").all();
    return Response.json({tasks:result.results});
  } catch(error) { console.error("GET /api/tasks failed",error); return Response.json({error:"Unable to load tasks"},{status:500}); }
}

export async function POST(request:Request) {
  const user=await getChatGPTUser();
  if(!user) return Response.json({error:"Unauthorized"},{status:401});
  try {
    const db=getRawDb(); await removeDemoTasksAndRenumber(db); const body=await request.json() as Record<string,unknown>;
    if(!String(body.task??"").trim()) return Response.json({error:"Task is required"},{status:400});
    const last=await db.prepare("SELECT task_id FROM tasks ORDER BY id DESC LIMIT 1").first<{task_id:string}>();
    const next=String((Number(last?.task_id?.split("-")[1]??0)+1)).padStart(4,"0");
    const now=new Date().toISOString(); const taskId=`TASK-${next}`;
    const cols=editable.filter(k=>body[k]!==undefined);
    const values=cols.map(k=>typeof body[k]==="boolean"?(body[k]?1:0):body[k]);
    const sql=`INSERT INTO tasks (task_id,${cols.join(",")},created_at,updated_at) VALUES (?,${cols.map(()=>"?").join(",")},?,?)`;
    await db.prepare(sql).bind(taskId,...values,now,now).run();
    const task=await db.prepare("SELECT * FROM tasks WHERE task_id=?").bind(taskId).first();
    return Response.json({task},{status:201});
  } catch(error) { console.error("POST /api/tasks failed",error); return Response.json({error:"Unable to create task"},{status:500}); }
}

export async function PATCH(request:Request) {
  const user=await getChatGPTUser();
  if(!user) return Response.json({error:"Unauthorized"},{status:401});
  try {
    const db=getRawDb(); const body=await request.json() as Record<string,unknown>; const taskId=String(body.task_id??"");
    if(!taskId) return Response.json({error:"task_id is required"},{status:400});
    const cols=editable.filter(k=>body[k]!==undefined);
    if(!cols.length) return Response.json({error:"No changes supplied"},{status:400});
    const values=cols.map(k=>typeof body[k]==="boolean"?(body[k]?1:0):body[k]);
    await db.prepare(`UPDATE tasks SET ${cols.map(k=>`${k}=?`).join(",")}, updated_at=? WHERE task_id=?`).bind(...values,new Date().toISOString(),taskId).run();
    const task=await db.prepare("SELECT * FROM tasks WHERE task_id=?").bind(taskId).first();
    return Response.json({task});
  } catch(error) { console.error("PATCH /api/tasks failed",error); return Response.json({error:"Unable to update task"},{status:500}); }
}
