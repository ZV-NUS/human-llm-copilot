export const DATA=await (await fetch(new URL('./data/replays.json',import.meta.url))).json();
export function frameAt(c,t){return c.frames[Math.max(0,Math.min(c.frames.length-1,Math.floor(t*10+1e-6)))]}
export function eventAt(c,t){let out=c.events[0];for(const e of c.events)if(e.t<=t+1e-8)out=e;return out}
export function requestAt(c,t){return 1+c.events.filter(e=>e.kind==='question'&&e.t<=t).length+(c.id==='deadline-feedback'&&t>=1.2?1:0)}
export function pipelineIndex(e){return ({input:0,language:1,question:2,feedback:2,update:2,execute:4,complete:4})[e.kind]??3}
export function wrap(ctx,text,x,y,maxWidth,lineHeight,maxLines=20){let line='',count=0;for(const word of text.split(/\s+/)){let next=line?line+' '+word:word;if(ctx.measureText(next).width>maxWidth&&line){ctx.fillText(line,x,y);y+=lineHeight;count++;line=word;if(count>=maxLines)return y}else line=next}if(line)ctx.fillText(line,x,y);return y+lineHeight}
export function trajectory(ctx,c,t,w,h){
 ctx.clearRect(0,0,w,h);ctx.fillStyle='#edf2f3';ctx.fillRect(0,0,w,h);ctx.fillStyle='#738c98';ctx.font=`${Math.max(10,h*.08)}px Arial`;ctx.fillText('Recorded trajectory',18,22);
 const left=35,right=w-28,top=47,bottom=h-23,maxS=Math.max(...c.frames.map(f=>f.ego.s));const X=s=>left+(right-left)*s/maxS,Y=d=>bottom-(d+5.4)/10.8*(bottom-top);
 ctx.lineWidth=1;ctx.strokeStyle='#ccd9df';ctx.setLineDash([7,6]);for(const d of [-1.8,1.8]){ctx.beginPath();ctx.moveTo(left,Y(d));ctx.lineTo(right,Y(d));ctx.stroke()}ctx.setLineDash([]);
 ctx.strokeStyle='#b0c5d0';ctx.lineWidth=2;ctx.beginPath();c.frames.forEach((f,i)=>{if(i===0)ctx.moveTo(X(f.ego.s),Y(f.ego.d));else ctx.lineTo(X(f.ego.s),Y(f.ego.d))});ctx.stroke();
 ctx.strokeStyle='#30758d';ctx.lineWidth=3;ctx.beginPath();c.frames.filter(f=>f.sim_t<=t).forEach((f,i)=>{if(i===0)ctx.moveTo(X(f.ego.s),Y(f.ego.d));else ctx.lineTo(X(f.ego.s),Y(f.ego.d))});ctx.stroke();
 const f=frameAt(c,t);ctx.fillStyle='#24647f';ctx.beginPath();ctx.arc(X(f.ego.s),Y(f.ego.d),5,0,Math.PI*2);ctx.fill();ctx.font=`${Math.max(9,h*.065)}px Arial`;ctx.fillStyle='#879ba6';ctx.fillText('0 m',left,h-5);ctx.fillText(Math.round(maxS)+' m',right-33,h-5);
}
