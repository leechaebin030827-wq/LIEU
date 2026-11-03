/* Mechanism → Scenario bridge. Uses the site's existing cabin renderer verbatim.
   Two supplied Mixamo-rigged characters use authored seated gestures. */
import { createCabinScene } from './cabin-scene.js?v=18';
import { createFooter } from './footer.js?v=4';
import * as director from './scenario-director.js?v=6';
const root=document.createElement('section');root.id='scenario';root.setAttribute('aria-label','Scenario');
root.innerHTML='<div class="scenario-label">SCENARIO</div><h2 class="scenario-title"></h2><div class="scenario-cabin"></div><div class="scenario-caption"><div class="scenario-number"></div><div class="scenario-heading"></div><div class="scenario-description"></div></div>';document.body.append(root);
const slot=root.querySelector('.scenario-cabin'),title=root.querySelector('h2');
slot.style.opacity='1';
const footer=createFooter();
let start=87,loaded=false,lastHeight='';const duration=3+director.sequenceDuration*.32;
const clamp=x=>Math.min(1,Math.max(0,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
window.Scenario={get start(){return start;},duration};
function frame(){requestAnimationFrame(frame);const a=window.Anatomy;start=a?a.AN+a.TL.parts+a.TL.len*8+1.8:87;
const vh=innerHeight,vw=innerWidth,t=scrollY/vh-start,on=t>-.01;
const space=document.getElementById('scrollspace'),height=`${(start+duration+1.8)*100}vh`;if(space&&height!==lastHeight){space.style.height=height;lastHeight=height;}
footer.update(start+duration+.8,vh);
root.style.visibility=on?'visible':'hidden';root.setAttribute('aria-hidden',String(!on));
// The next white panel rises continuously over the final mechanism frame.
root.style.transform=`translateY(${(1-smooth(t/1.3))*vh}px)`;
if(t> -2&&!loaded){loaded=true;createCabinScene(slot,{editable:false,interaction:true,director,progress:()=>scrollY/innerHeight-start});}
const lang=document.documentElement.lang||'en';title.textContent=lang.startsWith('ko')?'이제, 당신과 함께.':'Now, with you.';
const margin=parseFloat(getComputedStyle(root).getPropertyValue('--margin'))||32;
const w=vw-2*margin,h=Math.min(w*9/16,vh*.61),expand=smooth((t-2)/1.8);
const x=margin*(1-expand),y=vh*.26*(1-expand),width=w+(vw-w)*expand,heightPx=h+(vh-h)*expand;
Object.assign(slot.style,{left:x+'px',top:y+'px',width:width+'px',height:heightPx+'px',borderRadius:6*(1-expand)+'px'});
const state=director.scenarioState(t),ko=lang.startsWith('ko');
const captions=ko?[
 ['탑승 · 환영','안녕하세요, 루예요.','다가와 인사하고, 모두 자리에 앉았는지 살펴요.'],
 ['주행 · 경로 안내','다른 길로 안내할게요.','주변을 살피고 바닥에 우회 경로를 보여줘요.'],
 ['교감 · 호출 응답','네, 불렀어요?','당신을 향해 다가와, 눈과 작은 움직임으로 답해요.'],
 ['도착 · 하차 안내','다음에 또 만나요.','도착을 알리고, 내릴 방향을 안내한 뒤 물러나요.']
]:[
 ['BOARDING / WELCOME','Hello. I’m LIEU.','A greeting, a glance around. Making sure everyone is settled.'],
 ['ON THE WAY / GUIDANCE','A different way.','Looking around, then making the new route visible on the floor.'],
 ['A MOMENT TOGETHER','You called?','Turning toward you. Answering with a glance and a little movement.'],
 ['ARRIVAL / GOODBYE','Until next time.','A gentle goodbye, a direction to the door, then a step back.']
];const copy=captions[state.index],beat=director.storyBeat(state),caption=root.querySelector('.scenario-caption');caption.style.opacity=String(smooth((t-3)/.5));caption.querySelector('.scenario-number').textContent=`0${state.index+1} / 04 — ${copy[0]} · ${beat.index+1}/4 ${beat.entry[ko?2:1]}`;caption.querySelector('.scenario-heading').textContent=copy[1];caption.querySelector('.scenario-description').textContent=beat.entry[ko?4:3];
title.style.opacity=root.querySelector('.scenario-label').style.opacity=String(1-expand);
}
requestAnimationFrame(frame);
