// Closing panel uses the existing brand assets and section navigation.
export function createFooter(){
 const footer=document.createElement('footer');footer.id='site-footer';footer.setAttribute('aria-label','LIEU');
 footer.innerHTML=`<div class="footer-intro"><img src="assets/lieu-wordmark.svg" alt="LIEU"><h2>Your Friendly Mobility Companion</h2><div class="footer-credits" lang="en"><p class="footer-project">ROBO-TAXI PHYSICAL AI COMPANION</p><dl><div><dt>Seonghyeok Shin</dt><dd>Engineer</dd></div><div><dt>Jiyeon Choi</dt><dd>Industrial Designer</dd></div><div><dt>Chaebin Lee</dt><dd>UX Designer</dd></div></dl><p class="footer-location">HIDE LAB · Seoul, South Korea</p></div></div><div class="footer-bottom"><span class="footer-copyright">© ${new Date().getFullYear()} HIDE LAB</span><nav class="footer-nav" aria-label="Explore LIEU"><a href="#story" data-section="story">Story</a><a href="#design" data-section="design">Design</a><a href="#mechanism" data-section="mechanism">Mechanism</a><a href="#scenario" data-section="scenario">Scenario</a></nav><a href="#" class="footer-top">Back to top ↗</a></div>`;
 document.body.append(footer);
 footer.querySelectorAll('[data-section]').forEach(link=>link.addEventListener('click',event=>{event.preventDefault();window.GNav?.goTo(link.dataset.section);}));
 footer.querySelector('.footer-top').addEventListener('click',event=>{event.preventDefault();dispatchEvent(new WheelEvent('wheel'));window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});});
 let previousLang='';
 return {update(top,vh){footer.style.top=`${top*vh}px`;const visible=scrollY+vh>top*vh;footer.inert=!visible;footer.setAttribute('aria-hidden',String(!visible));document.body.classList.toggle('at-footer',scrollY>=(top-.15)*vh);
 const lang=document.documentElement.lang;if(lang!==previousLang){previousLang=lang;const ko=lang.startsWith('ko');footer.querySelector('h2').textContent='Your Friendly Mobility Companion';footer.querySelector('.footer-top').textContent=ko?'처음으로 ↗':'Back to top ↗';footer.querySelectorAll('[data-section]').forEach((a,i)=>a.textContent=ko?['스토리','디자인','메커니즘','시나리오'][i]:['Story','Design','Mechanism','Scenario'][i]);}
 }};
}
