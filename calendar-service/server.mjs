import { createServer } from "node:http";
import { promises as fs } from "node:fs";
import { dirname } from "node:path";
import { createCipheriv, createDecipheriv, createHmac, createHash, randomBytes, timingSafeEqual } from "node:crypto";

const PORT=Number(process.env.PORT||3000);
const FRONTEND_URL=(process.env.FRONTEND_URL||"https://sampurnanandofficial1.github.io/mba-command-centre/").replace(/#.*$/,"");
const FRONTEND_ORIGIN=new URL(FRONTEND_URL).origin;
const PUBLIC_BASE_URL=(process.env.PUBLIC_BASE_URL||"").replace(/\/$/,"");
const GOOGLE_CLIENT_ID=process.env.GOOGLE_CLIENT_ID||"";
const GOOGLE_CLIENT_SECRET=process.env.GOOGLE_CLIENT_SECRET||"";
const SESSION_SECRET=process.env.SESSION_SECRET||"";
const ENCRYPTION_KEY=process.env.ENCRYPTION_KEY||"";
const ACCESS_CODE=process.env.ACCESS_CODE||"";
const CONNECTION_FILE=process.env.CONNECTION_FILE||"/data/google-connection.enc";
const EXPECTED_EMAIL="pgp41221@iiml.ac.in";
const SCOPES="openid email https://www.googleapis.com/auth/calendar.readonly";
const SESSION_TTL_MS=7*24*60*60*1000;
const key=createHash("sha256").update(ENCRYPTION_KEY).digest();

const b64=value=>Buffer.from(value).toString("base64url");
const unb64=value=>Buffer.from(value,"base64url");
const json=(res,status,body,extra={})=>{res.writeHead(status,{"content-type":"application/json; charset=utf-8","cache-control":"no-store",...extra});res.end(JSON.stringify(body))};
const redirect=(res,url)=>{res.writeHead(302,{location:url,"cache-control":"no-store"});res.end()};
const apiHeaders=origin=>({"access-control-allow-origin":origin===FRONTEND_ORIGIN?origin:FRONTEND_ORIGIN,"access-control-allow-methods":"GET,POST,OPTIONS","access-control-allow-headers":"Authorization,Content-Type","vary":"Origin","x-content-type-options":"nosniff","x-frame-options":"DENY","referrer-policy":"no-referrer"});

function configured(){return Boolean(PUBLIC_BASE_URL&&GOOGLE_CLIENT_ID&&GOOGLE_CLIENT_SECRET&&SESSION_SECRET&&ENCRYPTION_KEY&&ACCESS_CODE)}
function safeEqual(a,b){const left=createHash("sha256").update(String(a)).digest();const right=createHash("sha256").update(String(b)).digest();return timingSafeEqual(left,right)}
function signState(payload){const data=b64(JSON.stringify(payload));const signature=createHmac("sha256",SESSION_SECRET).update(data).digest("base64url");return `${data}.${signature}`}
function readState(value){const [data,signature]=String(value||"").split(".");if(!data||!signature)throw new Error("Invalid OAuth state");const expected=createHmac("sha256",SESSION_SECRET).update(data).digest();const actual=unb64(signature);if(actual.length!==expected.length||!timingSafeEqual(actual,expected))throw new Error("Invalid OAuth state");const payload=JSON.parse(unb64(data).toString("utf8"));if(Date.now()-Number(payload.issuedAt)>10*60*1000)throw new Error("OAuth state expired");return payload}
function encrypt(payload){const iv=randomBytes(12);const cipher=createCipheriv("aes-256-gcm",key,iv);const encrypted=Buffer.concat([cipher.update(JSON.stringify(payload),"utf8"),cipher.final()]);return `${b64(iv)}.${b64(encrypted)}.${b64(cipher.getAuthTag())}`}
function decrypt(value){const [iv,ciphertext,tag]=String(value||"").split(".");if(!iv||!ciphertext||!tag)throw new Error("Invalid secure payload");const decipher=createDecipheriv("aes-256-gcm",key,unb64(iv));decipher.setAuthTag(unb64(tag));return JSON.parse(Buffer.concat([decipher.update(unb64(ciphertext)),decipher.final()]).toString("utf8"))}
function issueSession(){return encrypt({type:"calendar-access",issuedAt:Date.now(),expiresAt:Date.now()+SESSION_TTL_MS})}
function bearer(req){const value=req.headers.authorization||"";if(!value.startsWith("Bearer "))throw new Error("Missing secure calendar session");const session=decrypt(value.slice(7));if(session.type!=="calendar-access"||Number(session.expiresAt)<Date.now())throw new Error("Session expired");return session}
async function requestBody(req){const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>4096)throw new Error("Request too large");chunks.push(chunk)}try{return JSON.parse(Buffer.concat(chunks).toString("utf8")||"{}")}catch{throw new Error("Invalid JSON")}}
async function saveConnection(payload){await fs.mkdir(dirname(CONNECTION_FILE),{recursive:true});await fs.writeFile(CONNECTION_FILE,encrypt(payload),{encoding:"utf8",mode:0o600})}
async function loadConnection(){try{const value=await fs.readFile(CONNECTION_FILE,"utf8");const connection=decrypt(value.trim());if(connection.email!==EXPECTED_EMAIL||!connection.refreshToken)throw new Error("Stored Google connection is invalid");return connection}catch(error){if(error?.code==="ENOENT")throw new Error("Google Calendar administrator setup is incomplete");throw error}}
async function tokenRequest(params){const response=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams(params)});const data=await response.json();if(!response.ok)throw new Error(data.error_description||data.error||"Google token exchange failed");return data}
async function userInfo(accessToken){const response=await fetch("https://www.googleapis.com/oauth2/v3/userinfo",{headers:{authorization:`Bearer ${accessToken}`}});const data=await response.json();if(!response.ok)throw new Error("Google identity verification failed");return data}
async function activeConnection(connection){if(connection.accessToken&&Number(connection.accessExpiresAt)>Date.now()+60_000)return connection;const token=await tokenRequest({client_id:GOOGLE_CLIENT_ID,client_secret:GOOGLE_CLIENT_SECRET,refresh_token:connection.refreshToken,grant_type:"refresh_token"});const active={...connection,accessToken:token.access_token,accessExpiresAt:Date.now()+Number(token.expires_in||3600)*1000};await saveConnection(active);return active}
async function googleJson(url,accessToken){const response=await fetch(url,{headers:{authorization:`Bearer ${accessToken}`}});if(!response.ok){const body=await response.text();throw new Error(`Google Calendar API ${response.status}: ${body.slice(0,160)}`)}return response.json()}
async function readEvents(connection,url){const min=url.searchParams.get("timeMin");const max=url.searchParams.get("timeMax");if(!min||!max||Number.isNaN(Date.parse(min))||Number.isNaN(Date.parse(max)))throw new Error("Valid timeMin and timeMax are required");if(Date.parse(max)-Date.parse(min)>180*86400000)throw new Error("Calendar window may not exceed 180 days");const list=await googleJson("https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=250",connection.accessToken);const calendars=(list.items||[]).filter(item=>item.accessRole!=="none");const readCalendar=async calendar=>{const result=[];let pageToken="";do{const params=new URLSearchParams({singleEvents:"true",orderBy:"startTime",showDeleted:"false",maxResults:"2500",timeMin:min,timeMax:max,timeZone:"Asia/Kolkata"});if(pageToken)params.set("pageToken",pageToken);const endpoint=`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar.id)}/events?${params}`;let data;try{data=await googleJson(endpoint,connection.accessToken)}catch(error){if(String(error).includes(" 403:"))return result;throw error}for(const item of data.items||[]){if(item.status==="cancelled")continue;const start=item.start?.dateTime||item.start?.date||"";const end=item.end?.dateTime||item.end?.date||start;if(!start)continue;result.push({id:`${calendar.id}|${item.iCalUID||item.id}|${start}`,calendarId:calendar.id,calendarName:calendar.summary||"Calendar",title:item.summary||"Busy",start,end,allDay:Boolean(item.start?.date&&!item.start?.dateTime),location:item.location||"",htmlLink:item.htmlLink||"",color:calendar.backgroundColor||"#16d9ff"})}pageToken=data.nextPageToken||""}while(pageToken);return result};const groups=await Promise.all(calendars.map(readCalendar));const unique=new Map();for(const event of groups.flat())if(!unique.has(event.id))unique.set(event.id,event);return {events:[...unique.values()].sort((a,b)=>a.start.localeCompare(b.start)),calendars:calendars.length}}

const server=createServer(async(req,res)=>{
  const origin=req.headers.origin||"";const headers=apiHeaders(origin);const url=new URL(req.url||"/",`http://${req.headers.host||"localhost"}`);
  if(req.method==="OPTIONS"){res.writeHead(204,headers);return res.end()}
  try{
    if(url.pathname==="/health"){let connected=false;try{await loadConnection();connected=true}catch{}return json(res,200,{ok:true,configured:configured(),connected,account:EXPECTED_EMAIL},headers)}
    if(url.pathname==="/api/unlock"&&req.method==="POST"){if(!configured())return json(res,503,{error:"Calendar service is not configured"},headers);const body=await requestBody(req);if(!safeEqual(body.accessCode||"",ACCESS_CODE))return json(res,401,{error:"Incorrect access code"},headers);return json(res,200,{sessionToken:issueSession(),account:EXPECTED_EMAIL},headers)}
    if(url.pathname==="/auth/google"){if(!configured())return json(res,503,{error:"OAuth service is not configured"},headers);const accessCode=url.searchParams.get("access_code")||"";if(!safeEqual(accessCode,ACCESS_CODE))return json(res,401,{error:"Administrator access code required"},headers);const state=signState({nonce:b64(randomBytes(18)),issuedAt:Date.now()});const params=new URLSearchParams({client_id:GOOGLE_CLIENT_ID,redirect_uri:`${PUBLIC_BASE_URL}/auth/google/callback`,response_type:"code",scope:SCOPES,access_type:"offline",prompt:"consent select_account",include_granted_scopes:"true",login_hint:EXPECTED_EMAIL,state});return redirect(res,`https://accounts.google.com/o/oauth2/v2/auth?${params}`)}
    if(url.pathname==="/auth/google/callback"){try{readState(url.searchParams.get("state"));if(url.searchParams.get("error"))throw new Error(url.searchParams.get("error"));const code=url.searchParams.get("code");if(!code)throw new Error("Google did not return an authorization code");const token=await tokenRequest({client_id:GOOGLE_CLIENT_ID,client_secret:GOOGLE_CLIENT_SECRET,code,redirect_uri:`${PUBLIC_BASE_URL}/auth/google/callback`,grant_type:"authorization_code"});const profile=await userInfo(token.access_token);const email=String(profile.email||"").toLowerCase();if(email!==EXPECTED_EMAIL)throw new Error(`Only ${EXPECTED_EMAIL} may connect`);if(!token.refresh_token)throw new Error("Google did not issue long-lived calendar access. Revoke the app and connect again.");await saveConnection({email,refreshToken:token.refresh_token,accessToken:token.access_token,accessExpiresAt:Date.now()+Number(token.expires_in||3600)*1000,connectedAt:Date.now()});return redirect(res,`${FRONTEND_URL}#calendar_connected=1`)}catch(error){return redirect(res,`${FRONTEND_URL}#calendar_error=${encodeURIComponent(error instanceof Error?error.message:"OAuth failed")}`)}}
    if(url.pathname==="/api/session"){bearer(req);return json(res,200,{connected:true,account:EXPECTED_EMAIL,sessionToken:issueSession()},headers)}
    if(url.pathname==="/api/events"){bearer(req);const connection=await activeConnection(await loadConnection());const result=await readEvents(connection,url);return json(res,200,{...result,account:connection.email,sessionToken:issueSession()},headers)}
    if(url.pathname==="/auth/logout"&&req.method==="POST")return json(res,200,{ok:true},headers);
    return json(res,404,{error:"Not found"},headers);
  }catch(error){const message=error instanceof Error?error.message:"Unexpected error";const status=/session|expired|Missing secure|access code|Incorrect/.test(message)?401:/incomplete/.test(message)?503:400;return json(res,status,{error:message},headers)}
});

server.listen(PORT,"0.0.0.0",()=>console.log(`JARVIS calendar service listening on ${PORT}`));
