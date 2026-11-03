import * as THREE from 'three';
export const sequences=await fetch('assets/scenario/sequences.json').then(r=>{if(!r.ok)throw Error('Scenario sequences unavailable');return r.json();});
export const sequenceDuration=sequences.reduce((n,s)=>n+s.durationSec,0);
export function sample(track,t){const keys=track?.keys||[];if(!keys.length)return 0;let a=keys[0],b=a;for(const key of keys){if(key.tSec<=t)a=key;else{b=key;break;}b=a;}if(b===a||a.interpolationToNext==='hold')return a.value;let p=Math.max(0,Math.min(1,(t-a.tSec)/(b.tSec-a.tSec)));if(a.interpolationToNext==='smoothstep')p=p*p*(3-2*p);return a.value+(b.value-a.value)*p;}
export function scenarioState(scroll){let time=Math.max(0,(scroll-3)/.32),index=0;while(index<sequences.length-1&&time>sequences[index].durationSec){time-=sequences[index].durationSec;index++;}const sequence=sequences[index];time=Math.min(time,sequence.durationSec);return {index,time,sequence};}
// Ordered story beats follow the source motion/projector timings.
export const beats=[
 [[0,'WELCOME','환영','A welcome appears as the passengers settle in.','승객이 자리에 앉으면 환영 메시지를 보여줘요.'],[7,'LOOK AROUND','살피기','LIEU turns to acknowledge both passengers.','양쪽 승객을 향해 고개를 돌려 인사해요.'],[18,'ACKNOWLEDGE','교감','A small glance and gesture complete the greeting.','눈맞춤과 작은 몸짓으로 인사를 나눠요.'],[26,'GIVE SPACE','기다리기','The greeting settles into a quiet presence.','인사를 마치고 조용히 함께해요.']],
 [[0,'NOTICE','상황 살피기','LIEU looks around before offering guidance.','주변을 살핀 뒤 안내를 준비해요.'],[13,'REPOSITION','위치 잡기','It returns to a position for shared guidance.','두 승객에게 안내할 위치로 이동해요.'],[18.3,'SHOW THE WAY','경로 안내','The new direction appears on the floor between the seats.','좌석 사이 바닥에 바뀐 경로를 보여줘요.'],[29.4,'SETTLE','안내 마무리','The projection ends and the cabin settles again.','안내가 끝나면 다시 차분히 기다려요.']],
 [[0,'CALL','부르기','A passenger makes a small gesture toward LIEU.','승객이 작은 손짓으로 루를 불러요.'],[4.4,'RESPOND','응답하기','LIEU responds with its gaze and movement.','루가 시선과 움직임으로 답해요.'],[12,'STAY CLOSE','함께하기','A quiet pause gives the passenger time.','잠시 곁에 머물며 승객을 기다려요.'],[22.2,'REASSURE','마무리','“Anytime.” The exchange comes to a gentle close.','“언제든지요.” 짧은 교감을 마무리해요.']],
 [[0,'APPROACH','도착 예고','An arrival message prepares passengers for the stop.','도착 메시지로 하차를 준비할 시간을 줘요.'],[13.4,'ACKNOWLEDGE','인사 준비','LIEU turns its attention back to the passengers.','승객을 향해 마지막 인사를 준비해요.'],[14.6,'SAY GOODBYE','작별 인사','A small gesture and a goodbye on the floor.','작은 몸짓과 바닥의 메시지로 인사해요.'],[24.6,'GIVE SPACE','물러나기','LIEU finishes its goodbye and gives passengers space.','인사를 마치고 승객에게 여유를 줘요.']]
];
export function storyBeat(state){const list=beats[state.index];let index=0;for(let i=1;i<list.length;i++)if(state.time>=list[i][0])index=i;return {index,entry:list[index]};}
// Authored camera route: metres in the cabin frame. Each chapter starts at
// the preceding chapter's endpoint, including when scrolling backwards.
// [seconds, azimuth, elevation, distance, look-at]. Orbit interpolation keeps
// the camera outside the passengers instead of cutting through the cabin.
const shots=[
 // Welcome: establish both passengers, approach over a shoulder, meet LIEU.
 [[0,.88,.34,.91,[0,.19,0]],[7,.68,.24,.66,[0,.215,.01]],[16,.30,.08,.43,[0,.247,.015]],[25,-.30,.20,.57,[0,.22,.01]],[32.3,-.48,.36,.80,[0,.19,0]]],
 // Guidance: opposite three-quarter, rise to read the floor, settle beside it.
 [[0,-.48,.36,.80,[0,.19,0]],[10,-.72,.40,.76,[0,.20,0]],[20,-1.12,.66,1.12,[0,.20,0]],[29,-.82,.72,1.12,[0,.20,0]],[39,.46,.29,.65,[0,.215,0]]],
 // Conversation: passenger eye level, a restrained push-in and lateral arc.
 [[0,.46,.29,.65,[0,.215,0]],[7,.24,.08,.44,[0,.247,.02]],[15,-.10,.04,.40,[0,.25,.02]],[23,-.35,.17,.52,[0,.23,.01]],[32,-.54,.32,.76,[0,.19,0]]],
 // Arrival: show LIEU, the way out, then slowly widen to the whole cabin.
 [[0,-.54,.32,.76,[0,.19,0]],[9,-.78,.43,.78,[0,.19,0]],[18,-1.10,.68,1.12,[0,.20,0]],[25,.12,.56,.94,[0,.18,0]],[31,.50,.38,1.02,[0,.19,0]]]
];
const smoother=p=>{p=Math.max(0,Math.min(1,p));return p*p*p*(p*(p*6-15)+10);};
export function cameraPose(state){
 const list=shots[state.index];let a=list[0],b=a;
 for(let i=1;i<list.length;i++){b=list[i];if(state.time<=b[0])break;a=b;}
 const p=a===b?0:smoother((state.time-a[0])/(b[0]-a[0]));
 const az=THREE.MathUtils.lerp(a[1],b[1],p),el=THREE.MathUtils.lerp(a[2],b[2],p),d=THREE.MathUtils.lerp(a[3],b[3],p);
 const target=new THREE.Vector3(...a[4]).lerp(new THREE.Vector3(...b[4]),p);
 const position=new THREE.Vector3(Math.sin(az)*Math.cos(el)*d,Math.sin(el)*d,Math.cos(az)*Math.cos(el)*d).add(target);
 return {position,target};
}
export function directCamera(camera,center,state,entrance=1){
 const {position,target}=cameraPose(state);position.sub(center);target.sub(center);
 // Join the existing introductory camera without a snap as the frame expands.
 const p=smoother(entrance),fromTarget=camera.position.clone().add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(camera.position.length()));
 camera.position.lerp(position,p);camera.lookAt(fromTarget.lerp(target,p));
}
export function createSignals(parent,center){
 const floorCanvas=document.createElement('canvas');floorCanvas.width=1024;floorCanvas.height=512;const fc=floorCanvas.getContext('2d'),ft=new THREE.CanvasTexture(floorCanvas);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(.15,.075),new THREE.MeshBasicMaterial({map:ft,transparent:true,side:THREE.DoubleSide,depthWrite:false}));floor.rotation.x=-Math.PI/2;floor.position.set(-center.x,.066-center.y,-center.z);parent.add(floor);
 const words={welcome:'WELCOME',detour_1:'↱',detour_2:'↱',detour_3:'A different way.',hey:'Hey LIEU',reply:'Here for you.',anytime:'Anytime.',arriving:'Almost there.',goodbye:'See you soon.'};
 let previous='';return {update(state){const tracks=state.sequence.tracks; const clip=tracks.projector.clips.find(c=>state.time>=c.fromSec&&state.time<=c.toSec),id=clip?.id||'';floor.visible=!!clip;floor.material.opacity=sample(tracks.projector.properties.opacity,state.time);
 if(id!==previous){previous=id;fc.clearRect(0,0,1024,512);fc.fillStyle='#f2f2f6';fc.font=`400 ${(words[id]||'').length<4?240:90}px sans-serif`;fc.textAlign='center';fc.textBaseline='middle';fc.fillText(words[id]||'',512,256);ft.needsUpdate=true;}
 }};
}
