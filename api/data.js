import { db } from "hatchable";
export const access = "user";
export const methods = ["GET","POST","PUT","DELETE"];
const tables = {activities:"activities",completions:"activity_completions",projects:"projects",tasks:"tasks",learning:"learning_sessions",reading:"reading_sessions",reviews:"weekly_reviews",goals:"weekly_goals",settings:"user_preferences"};
const fields = {
 activities:["title","category","day_of_week","start_time","end_time","notes","active"],
 completions:["activity_id","completion_date","completed","notes"],
 projects:["title","description","category","priority","status","deadline","progress"],
 tasks:["project_id","parent_id","title","priority","status","due_date"],
 learning:["track","topic","duration_minutes","notes","resource_url","session_date"],
 reading:["book_title","pages_read","notes","reading_date"],
 reviews:["week_start","achievements","projects_advanced","skills_learned","books_pages","gym_sessions","challenges","missed_activities","improvements"],
 goals:["week_start","goal","completed"],
 settings:["reading_target"]
};
const projectDefaults = [
 ["AI Gmail Meeting Assistant","Continue building the Gmail-to-meeting workflow, validation, duplicate and conflict checks, and human approval pipeline.","Professional","High"],
 ["Software application ideas & development","Capture, scope and build new software product ideas and personal applications.","Personal","Medium"],
 ["MetaMind weekly blog publishing","Plan, write and publish a weekly article for MetaMind Limited.","MetaMind","Medium"],
 ["MetaMind business development","Develop MetaMind's AI agents, IT services, customer pipeline and business operations.","MetaMind","High"]
];
const defaults = [
["Wake up","Personal","Everyday","05:30","06:00"],
["Gym","Fitness","Monday, Tuesday, Thursday, Friday, Saturday","06:00","07:00"],
["Breakfast, preparation & commute","Personal","Everyday","07:00","08:30"],
["IGAD work","Work","Monday, Tuesday, Wednesday, Thursday, Friday","09:00","16:00"],
["Commute & rest","Personal","Everyday","16:00","17:00"],
["Open planning buffer","Personal","Sunday","17:00","19:00"],
["Dinner & relaxation","Personal","Everyday","19:00","20:00"],
["Reading / learning","Reading","Everyday","20:00","20:45"],
["Personal time & preparation","Personal","Everyday","20:45","21:30"],
["Sleep","Health","Everyday","21:30","05:30"],
["AI Gmail Meeting Assistant","Projects","Monday","17:00","19:00"],
["Cybersecurity study","Learning","Tuesday","17:00","19:00"],
["New application ideas & development","Projects","Wednesday","17:00","19:00"],
["Forex learning","Learning","Thursday","17:00","19:00"],
["MetaMind blog & business development","Projects","Friday","17:00","19:00"],
["Personal project development","Projects","Saturday","09:00","11:00"],
["Finance & investments","Learning","Saturday","11:30","13:00"],
["Cybersecurity practical learning","Learning","Saturday","14:00","16:00"],
["Rest / light exercise","Fitness","Sunday","08:00","09:00"],
["Weekly review & planning","Personal","Sunday","17:00","18:00"]
];
function dayMatches(label,day){return label==="Everyday" || label.split(", ").some(x=>["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][day]===x);}
async function refreshProject(user,id){
 if(!id)return;
 const q=await db.query("SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status='Done')::int AS done FROM tasks WHERE user_id=$1 AND project_id=$2",[user,id]);
 const progress=q.rows[0].total?Math.round(q.rows[0].done/q.rows[0].total*100):0;
 await db.query("UPDATE projects SET progress=$1, updated_at=NOW() WHERE id=$2 AND user_id=$3",[progress,id,user]);
}
export default async function(req,res){
 const user=req.user.id, method=req.method, body=req.body||{}, type=req.query?.type;
 if(!tables[type]) return res.status(400).json({error:"Unknown resource"});
 const table=tables[type], allowed=fields[type];
 if(method==="GET"){
  if(type==="activities"){
   const c=await db.query("SELECT COUNT(*)::int AS n FROM activities WHERE user_id=$1",[user]);
   if(!c.rows[0].n){
    for(let day=0;day<7;day++) for(const a of defaults) if(dayMatches(a[2],day)){
     await db.query("INSERT INTO activities(user_id,title,category,day_of_week,start_time,end_time,notes) VALUES($1,$2,$3,$4,$5,$6,$7)",[user,a[0],a[1],day,a[3],a[4],a[2]]);
    }
   }
  }
  if(type==="projects"){
   const c=await db.query("SELECT COUNT(*)::int AS n FROM projects WHERE user_id=$1",[user]);
   if(!c.rows[0].n) for(const p of projectDefaults) await db.query("INSERT INTO projects(user_id,title,description,category,priority,status,progress) VALUES($1,$2,$3,$4,$5,'Active',0)",[user,p[0],p[1],p[2],p[3]]);
  }
  const {rows}=await db.query("SELECT * FROM "+table+" WHERE user_id=$1 ORDER BY created_at DESC",[user]);
  return res.json({items:rows});
 }
 if(method==="POST"){
  const cols=allowed.filter(k=>body[k]!==undefined);
  if(type==="activities" && (!body.title || body.day_of_week===undefined)) return res.status(400).json({error:"Activity title and day are required"});
  if(type==="projects" && !body.title) return res.status(400).json({error:"Project title is required"});
  if(type==="tasks" && !body.title) return res.status(400).json({error:"Task title is required"});
  if(type==="learning" && (!body.track || !body.topic)) return res.status(400).json({error:"Learning track and topic are required"});
  if(type==="reading" && !body.book_title) return res.status(400).json({error:"Book title is required"});
  if(type==="reviews" && !body.week_start) return res.status(400).json({error:"Week start is required"});
  if(type==="goals" && (!body.week_start || !body.goal)) return res.status(400).json({error:"Week and goal are required"});
  const vals=cols.map(k=>body[k]), names=["user_id",...cols], params=[user,...vals], marks=params.map((_,i)=>"$"+(i+1));
  const sql="INSERT INTO "+table+" ("+names.join(",")+") VALUES ("+marks.join(",")+")"+(type==="completions"?" ON CONFLICT(user_id,activity_id,completion_date) DO UPDATE SET completed=EXCLUDED.completed, notes=EXCLUDED.notes":type==="settings"?" ON CONFLICT(user_id) DO UPDATE SET reading_target=EXCLUDED.reading_target, updated_at=NOW()":"")+" RETURNING *";
  const {rows}=await db.query(sql,params);
  if(type==="tasks") await refreshProject(user,body.project_id);
  return res.json({item:rows[0]});
 }
 if(method==="PUT"){
  if(!body.id) return res.status(400).json({error:"Record id required"});
  const cols=allowed.filter(k=>body[k]!==undefined);
  if(!cols.length) return res.status(400).json({error:"No fields to update"});
  const sets=cols.map((k,i)=>k+"=$"+(i+1));
  const touch=["activities","projects","tasks","reviews"].includes(type) ? ", updated_at=NOW()" : "";
  const vals=cols.map(k=>body[k]);
  vals.push(body.id,user);
  const {rows}=await db.query("UPDATE "+table+" SET "+sets.join(",")+touch+" WHERE id=$"+(vals.length-1)+" AND user_id=$"+vals.length+" RETURNING *",vals);
  if(!rows.length)return res.status(404).json({error:"Record not found"});
  if(type==="tasks") await refreshProject(user,rows[0].project_id);
  return res.json({item:rows[0]});
 }
 if(method==="DELETE"){
  if(!body.id) return res.status(400).json({error:"Record id required"});
  let projectId=null;
  if(type==="tasks"){const q=await db.query("SELECT project_id FROM tasks WHERE id=$1 AND user_id=$2",[body.id,user]);projectId=q.rows[0]?.project_id;}
  const {rowCount}=await db.query("DELETE FROM "+table+" WHERE id=$1 AND user_id=$2",[body.id,user]);
  if(type==="tasks") await refreshProject(user,projectId);
  return res.json({ok:rowCount>0});
 }
}