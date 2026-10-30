export const D=await(await fetch(new URL('./data/demo.json',import.meta.url))).json();
export const stageTimes=[0,D.llm.ready_t,D.candidate_t,D.feedback.at(-1).consumed_t,D.final_t,D.final_t];
export function frameAt(t){return D.frames[Math.min(D.frames.length-1,Math.max(0,Math.floor(t*10+1e-6)))]}
export function roleText(role,lang){return D.roles[role]?.[lang]||role}
export function drawTraffic(ctx,t,W,H,lang,step){
 ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,W,H);ctx.save();ctx.scale(W/390,H/220);
 ctx.fillStyle='#edf3f3';ctx.fillRect(0,0,390,220);ctx.fillStyle='#c7d0d2';ctx.fillRect(109,0,172,220);
 ctx.fillStyle='#e4e9e9';ctx.fillRect(109,0,57,220);ctx.fillRect(224,0,57,220);
 ctx.strokeStyle='#ffffff';ctx.lineWidth=1.3;ctx.setLineDash([8,7]);for(const x of [166.2,223.8]){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,220);ctx.stroke()}ctx.setLineDash([]);
 const f=frameAt(t),X=d=>195+d*16,Y=s=>220-(s-f.ego.s+60)/145*220;
 ctx.font='10px Arial';ctx.textAlign='center';ctx.fillStyle='#7c929c';ctx.fillText(lang==='zh'?'目标邻道（右侧）':'Target lane (right)',253,14);
 if(step>=2&&step<5){for(const [i,p]of D.plans.entries()){ctx.strokeStyle=i?'#25886d':'#2c74b7';ctx.lineWidth=i?2:4;ctx.setLineDash(i?[6,3]:[3,4]);ctx.beginPath();let started=false;for(let j=0;j<p.trajectory.t.length;j++){const s=p.trajectory.s[j],d=p.trajectory.d[j],y=Y(s);if(y<-12||y>232){started=false;continue}if(!started){ctx.moveTo(X(d),y);started=true}else ctx.lineTo(X(d),y)}ctx.stroke()}ctx.setLineDash([])}
 if(step>=5){ctx.strokeStyle='#277f71';ctx.lineWidth=3;ctx.beginPath();let first=true;for(const p of D.frames.filter(s=>s.sim_t<=t)){const y=Y(p.ego.s);if(y>230)continue;if(first){ctx.moveTo(X(p.ego.d),y);first=false}else ctx.lineTo(X(p.ego.d),y)}ctx.stroke()}
 if(step===0){ctx.fillStyle='#db996a35';ctx.fillRect(208,102,64,45);ctx.strokeStyle='#cc9256';ctx.setLineDash([3,3]);ctx.strokeRect(208,102,64,45);ctx.setLineDash([])}
 const left=[],right=[];
 for(const v of f.vehicles){const y=Y(v.x),x=X(v.y),r=D.roles[v.id];if(y<6||y>215)continue;ctx.fillStyle=r.color;ctx.strokeStyle='#ffffff';ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(x-8,y-12,16,24,4);ctx.fill();ctx.stroke();ctx.fillStyle='#ffffffaa';ctx.fillRect(x-5,y-7,10,5);
 const distance=v.x-f.ego.s;const item={v,x,y,label:roleText(v.id,lang),line:(distance<0?(lang==='zh'?'后':'−'):'')+Math.abs(distance).toFixed(0)+'m · '+(v.speed*3.6).toFixed(0)+(lang==='zh'?'km/h':' km/h'),color:r.color};(v.id==='parallel_pass'||v.id==='target_rear'?right:left).push(item)}
 for(const [items,isRight]of [[left,false],[right,true]]){items.sort((a,b)=>a.y-b.y);let last=-25;for(const q of items){const ly=Math.min(195,Math.max(22,q.y,last+36));last=ly;const tx=isRight?292:8;ctx.strokeStyle=q.color+'99';ctx.lineWidth=.9;ctx.beginPath();ctx.moveTo(q.x+(isRight?9:-9),q.y);ctx.lineTo(isRight?286:99,ly-5);ctx.stroke();ctx.textAlign='left';ctx.fillStyle=q.color;ctx.font='bold 11.5px Arial';ctx.fillText(q.label,tx,ly-7);ctx.fillStyle='#8098a4';ctx.font='9px Arial';ctx.fillText(q.line,tx,ly+7)}}
 const ex=X(f.ego.d),ey=Y(f.ego.s);ctx.fillStyle='#2e779f';ctx.strokeStyle='white';ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(ex-9,ey-13,18,26,4);ctx.fill();ctx.stroke();ctx.fillStyle='#d7edf8';ctx.fillRect(ex-6,ey-8,12,5);ctx.textAlign='center';ctx.font='10px Arial';ctx.fillStyle='#2f708e';ctx.fillText((lang==='zh'?'自车 ':'Ego ')+(f.ego.v*3.6).toFixed(0)+' km/h',ex,ey+27);
 ctx.restore();
}
export function drawSpeed(ctx,W,H,lang,step){ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,W,H);if(step<2)return;ctx.save();ctx.scale(W/400,H/90);ctx.fillStyle='#91a2ad';ctx.font='9px Arial';ctx.fillText(lang==='zh'?'预测速度 · km/h':'Predicted speed · km/h',8,12);ctx.strokeStyle='#e2eaee';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(20,74);ctx.lineTo(390,74);ctx.stroke();for(const [i,p]of D.plans.entries()){ctx.strokeStyle=i?'#25886d':'#2c74b7';ctx.lineWidth=2;ctx.beginPath();p.trajectory.t.forEach((t,j)=>{const x=20+(t-D.candidate_t)/(29-D.candidate_t)*370,y=73-(p.trajectory.v[j]*3.6-55)/50*50;if(!j)ctx.moveTo(x,y);else ctx.lineTo(x,y)});ctx.stroke();ctx.fillStyle=i?'#25886d':'#2c74b7';ctx.fillText((i?'B ':'A ')+p.peak_speed_kmh.toFixed(0),i?332:285,21)}ctx.fillStyle='#9aabb4';ctx.fillText(D.candidate_t.toFixed(1)+'s',20,87);ctx.fillText('29s',370,87);ctx.restore()}
export function wrap(ctx,text,x,y,width,lineHeight){let line='';for(const c of text){const next=line+c;if(ctx.measureText(next).width>width&&line){ctx.fillText(line,x,y);line=c;y+=lineHeight}else line=next}if(line)ctx.fillText(line,x,y);return y+lineHeight}
