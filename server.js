// LocateMe — consent-based location sharing backend. Node.js 18+, no dependencies.
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { promisify } = require('util');
const scrypt = promisify(crypto.scrypt);
const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'store.json');
fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({users:[],sessions:[],shares:[]}, null, 2));
let db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
function save(){ fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2)); }
const secret = process.env.LOCATEME_SECRET || 'change-this-secret-before-public-deployment-' + crypto.randomBytes(16).toString('hex');
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml'};
function send(res,status,obj){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Access-Control-Allow-Origin':'same-origin'});res.end(JSON.stringify(obj));}
function readBody(req){return new Promise((resolve,reject)=>{let b='';req.on('data',c=>{b+=c;if(b.length>1e6){reject(new Error('Body too large'));req.destroy();}});req.on('end',()=>{try{resolve(b?JSON.parse(b):{});}catch{reject(new Error('Invalid JSON'));}});});}
function token(){return crypto.randomBytes(32).toString('hex');}
function hashToken(t){return crypto.createHmac('sha256',secret).update(t).digest('hex');}
function safeUser(u){return {id:u.id,name:u.name,phone:u.phone,sharing:u.sharing,location:u.location||null};}
function getUser(req){const h=req.headers.authorization||'';if(!h.startsWith('Bearer '))return null;const raw=h.slice(7), s=db.sessions.find(x=>x.hash===hashToken(raw)&&x.expires>Date.now());return s?db.users.find(x=>x.id===s.userId)||null:null;}
function requireUser(req,res){const u=getUser(req);if(!u)send(res,401,{error:'Please log in again'});return u;}
async function route(req,res){
 const url=new URL(req.url,'http://localhost'); const p=url.pathname;
 if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Origin':'same-origin','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'GET,POST,PUT,DELETE,OPTIONS'});return res.end();}
 if(req.method==='GET'&&p==='/api/health')return send(res,200,{ok:true,service:'LocateMe API'});
 if(req.method==='POST'&&p==='/api/lookup'){const b=await readBody(req),digits=String(b.phone||'').replace(/\D/g,'');if(digits.length<7||digits.length>15)return send(res,400,{error:'Enter a valid mobile number'});const u=db.users.find(x=>String(x.phone||'').replace(/\D/g,'')===digits);if(!u||!u.discoverable||!u.sharing||!u.location||!Number.isFinite(Number(u.age)))return send(res,404,{error:'No currently shared profile found for this number. The owner must register, consent to discovery and enable GPS sharing.'});return send(res,200,{user:{name:u.name,age:u.age},location:u.location});}
 if(req.method==='POST'&&p==='/api/register'){
  const b=await readBody(req),name=String(b.name||'').trim(),phone=String(b.phone||'').trim(),password=String(b.password||''),age=Number(b.age);
  if(name.length<2||name.length>60)return send(res,400,{error:'Name must be 2–60 characters'});
  if(!/^\+?[0-9 ()-]{7,20}$/.test(phone))return send(res,400,{error:'Enter a valid phone number'});
  if(!Number.isInteger(age)||age<18||age>120)return send(res,400,{error:'Age must be between 18 and 120'});
  if(b.discoverable!==true)return send(res,400,{error:'Consent is required to appear in mobile number searches'});
  if(password.length<8||password.length>128)return send(res,400,{error:'Password must be at least 8 characters'});
  if(db.users.some(u=>u.phone===phone))return send(res,409,{error:'An account with this phone number already exists'});
  const salt=crypto.randomBytes(16).toString('hex'),pass=await scrypt(password,salt,64);
  const u={id:crypto.randomUUID(),name,phone,salt,password:pass.toString('hex'),age,discoverable:true,sharing:false,location:null,created:Date.now()};db.users.push(u);const raw=token();db.sessions.push({hash:hashToken(raw),userId:u.id,expires:Date.now()+30*86400000});save();return send(res,201,{token:raw,user:safeUser(u)});
 }
 if(req.method==='POST'&&p==='/api/login'){
  const b=await readBody(req),phone=String(b.phone||'').trim(),password=String(b.password||''),u=db.users.find(x=>x.phone===phone);
  if(!u)return send(res,401,{error:'Phone number or password is incorrect'});
  const got=await scrypt(password,u.salt,64);if(!crypto.timingSafeEqual(got,Buffer.from(u.password,'hex')))return send(res,401,{error:'Phone number or password is incorrect'});
  const raw=token();db.sessions.push({hash:hashToken(raw),userId:u.id,expires:Date.now()+30*86400000});save();return send(res,200,{token:raw,user:safeUser(u)});
 }
 if(req.method==='GET'&&p==='/api/me'){const u=requireUser(req,res);if(!u)return;return send(res,200,{user:safeUser(u)});}
 if(req.method==='POST'&&p==='/api/logout'){const raw=(req.headers.authorization||'').replace(/^Bearer /,'');db.sessions=db.sessions.filter(s=>s.hash!==hashToken(raw));save();return send(res,200,{ok:true});}
 if(req.method==='POST'&&p==='/api/location'){
  const u=requireUser(req,res);if(!u)return;const b=await readBody(req);
  if(!u.sharing)return send(res,403,{error:'Turn on sharing before updating location'});
  const lat=Number(b.latitude),lng=Number(b.longitude),accuracy=Number(b.accuracy);
  if(!Number.isFinite(lat)||!Number.isFinite(lng)||lat < -90||lat>90||lng < -180||lng>180||!Number.isFinite(accuracy)||accuracy<0||accuracy>100000)return send(res,400,{error:'Invalid GPS coordinates'});
  u.location={latitude:lat,longitude:lng,accuracy,updated:Date.now()};save();return send(res,200,{ok:true,updated:u.location.updated});
 }
 if(req.method==='POST'&&p==='/api/sharing'){
  const u=requireUser(req,res);if(!u)return;const b=await readBody(req);u.sharing=!!b.enabled;if(!u.sharing)u.location=null;save();return send(res,200,{sharing:u.sharing});
 }
 if(req.method==='POST'&&p==='/api/invite'){
  const u=requireUser(req,res);if(!u)return;if(!u.sharing||!u.location)return send(res,409,{error:'Enable sharing and wait for GPS before creating an invite'});
  let code=token().slice(0,12);db.shares=db.shares.filter(s=>s.ownerId!==u.id);db.shares.push({code,ownerId:u.id,created:Date.now(),expires:Date.now()+24*3600000});save();return send(res,201,{code,expires:Date.now()+24*3600000});
 }
 if(req.method==='GET'&&p.startsWith('/api/share/')){
  const code=p.slice('/api/share/'.length);const s=db.shares.find(x=>x.code===code&&x.expires>Date.now());if(!s)return send(res,404,{error:'Share link expired or invalid'});const u=db.users.find(x=>x.id===s.ownerId);if(!u||!u.sharing||!u.location)return send(res,404,{error:'This person is not currently sharing a location'});
  return send(res,200,{user:{name:u.name},location:u.location,sharing:true});
 }
 // Static files
 let file=p==='/'?'/index.html':decodeURIComponent(p);file=path.normalize(file).replace(/^([.][.][/\\])+/, '');const full=path.join(__dirname,file);
 if(!full.startsWith(__dirname))return send(res,403,{error:'Forbidden'});
 fs.readFile(full,(err,data)=>{if(err)return send(res,404,{error:'Not found'});res.writeHead(200,{'Content-Type':mime[path.extname(full)]||'application/octet-stream','X-Content-Type-Options':'nosniff'});res.end(data);});
}
const server=http.createServer((req,res)=>{route(req,res).catch(e=>{console.error(e);if(!res.headersSent)send(res,500,{error:'Server error'});});});
server.listen(PORT,'0.0.0.0',()=>console.log(`LocateMe running at http://localhost:${PORT}`));
