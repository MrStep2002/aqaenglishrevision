import { Chase, width, height, position } from './marley-maze.js?v=2';
import { drawLondon, drawPiece } from './marley-art.js';
import { shuffle, wordChoices } from './carol-word-choices.js';

const dialog=document.getElementById('marleys-chase');
const find=selector=>dialog.querySelector(selector);
const launcher=document.getElementById('play-marleys-chase');
const bank=JSON.parse(find('.chase-data').textContent);
const phrase=find('.chase-phrase'), status=find('.chase-status');
const map=find('.chase-map'), cap=find('.chase-cap');
const boxes=[...dialog.querySelectorAll('.chase-box')];
const cover=find('.chase-cover'), action=find('.chase-action');
const pause=find('.chase-pause'), level=find('.chase-level select');
const lifeDisplay=find('.chase-lives');
const hats=[...lifeDisplay.querySelectorAll('canvas')];
const step=1/60;
const keys={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',w:'up',s:'down',a:'left',d:'right'};
let game, pool, deck, entry, phase='setup', resumePhase, tokenNodes=[];
let frame, previousTime, carry=0, wordTimer;

drawLondon(find('.chase-roofs'));
drawPiece(cap,'cap');
hats.forEach(hat=>drawPiece(hat,'cap'));
boxes.forEach((box,i)=>drawPiece(box,i===0?'iron':'brass'));

function setPhase(value) {
  phase=value;
  dialog.dataset.phase=value;
  pause.hidden=!['playing','ready'].includes(value);
}
function locate(element,x,y) {
  element.style.left=(x+.5)*100/width+'%';
  element.style.top=(y+.5)*100/height+'%';
}
function drawActors() {
  [cap,...boxes].forEach((element,i)=>{
    const {x,y}=position(i===0?game.player:game.boxes[i-1]);
    locate(element,x,y);
  });
}
function updateHud() {
  find('.chase-count').textContent=String(game.words);
  lifeDisplay.setAttribute('aria-label',game.lives+(game.lives===1?' life remaining':' lives remaining'));
  hats.forEach((hat,i)=>hat.classList.toggle('is-lost',i>=game.lives));
}
function showCard(title,body,button,showLevel=false) {
  cover.hidden=false;
  find('.chase-message').textContent=title;
  find('.chase-detail').textContent=body;
  find('.chase-level').hidden=!showLevel;
  action.textContent=button;
  if(dialog.open) action.focus({preventScroll:true});
}
function showPhrase(entry,solved) {
  const gap=document.createElement(solved?'mark':'span');
  if(solved) gap.textContent=entry.example.slice(entry.start,entry.start+entry.length);
  else {
    gap.className='chase-blank';
    gap.setAttribute('role','img');gap.setAttribute('aria-label','missing word');
  }
  phrase.replaceChildren(entry.example.slice(0,entry.start),gap,entry.example.slice(entry.start+entry.length));
}
function nextPhrase() {
  if (!deck.length) {
    deck=shuffle(pool);
    const last=deck.length-1;
    if (last>0 && deck[last]===entry) [deck[0],deck[last]]=[deck[last],deck[0]];
  }
  entry=deck.pop();
  showPhrase(entry,false);
  game.placeWords(wordChoices(entry,bank),entry);
  tokenNodes=game.tokens.map(token=>{
    const marker=document.createElement('span');
    marker.className='chase-token';
    marker.textContent=token.entry.word;
    locate(marker,token.cell%width,Math.floor(token.cell/width));
    return marker;
  });
  find('.chase-pickups').replaceChildren(...tokenNodes);
  const locations=game.tokens.map((token,i)=>{
    const row=Math.floor(token.cell/width);
    const vertical=row<4?'top':row>6?'bottom':'middle';
    return token.entry.word+' at the '+vertical+' '+['left','centre','right'][i];
  });
  map.setAttribute('aria-label','Snowy London maze. '+locations.join('. ')+'. Steer with the arrow keys.');
  drawActors();
}
function ready(message='Read the phrase, then steer to set off.') {
  cover.hidden=true;
  setPhase('ready');
  status.textContent=message;
  map.focus({preventScroll:true});
}
function setup() {
  game=new Chase();
  pool=bank.filter(e=>e.level===Number(level.value));
  deck=[];
  entry=null;
  updateHud();
  nextPhrase();
  setPhase('setup');
  showCard('Escape Marley’s cash boxes','Collect the missing word. A wrong word or a cash box costs one life.','Play chase',true);
  status.textContent='';
}
function stopClock() {
  cancelAnimationFrame(frame);
  clearTimeout(wordTimer);
  previousTime=null;carry=0;
}
function endRun() {
  setPhase('lost');
  showCard('Out of lives','You collected '+game.words+(game.words===1?' word.':' words.'),'Play again');
  status.textContent='Game over.';
}
function afterWord() {
  if(phase!=='word' || !dialog.open) return;
  nextPhrase();ready();
}
function handleEvent(event) {
  updateHud();
  if(event.token) tokenNodes[game.tokens.indexOf(event.token)].hidden=true;
  if(game.lives===0) { stopClock();endRun();return; }
  if(event.kind==='miss') {
    status.textContent='Wrong word. '+lifeDisplay.getAttribute('aria-label')+'.';
    return;
  }
  stopClock();
  if(event.kind==='caught') {
    setPhase('caught');
    showCard('Caught by a cash box!',game.lives+(game.lives===1?' life left.':' lives left.')+' The missing word is still in the streets.','Try again');
    status.textContent='The chase is stopped.';
    return;
  }
  setPhase('word');
  showPhrase(event.token.entry,true);
  status.textContent='Found it! '+event.token.entry.word;
  wordTimer=setTimeout(afterWord,700);
}
function tick(now) {
  if(!dialog.open || phase!=='playing') return;
  if(previousTime!==null) carry+=Math.min(.1,(now-previousTime)/1000);
  previousTime=now;
  while(carry>=step && phase==='playing') {
    carry-=step;
    const event=game.tick(step);
    if(event)handleEvent(event);
  }
  drawActors();
  if(phase==='playing')frame=requestAnimationFrame(tick);
}
function startClock() {
  stopClock();setPhase('playing');
  frame=requestAnimationFrame(tick);
}
function steer(dir) {
  if(!['ready','playing'].includes(phase) || !dialog.open) return;
  const canMove=game.steer(dir);
  if(phase==='ready' && canMove) {
    status.textContent='Watch the cash boxes!';
    startClock();
  }
}
function pauseGame() {
  if(!['ready','playing','word'].includes(phase)) return;
  resumePhase=phase;
  stopClock();setPhase('paused');
  showCard('Chase paused',resumePhase==='word'?'Word collected.':entry.definition,'Resume');
  status.textContent='The streets are still.';
}
action.addEventListener('click',()=>{
  if(phase==='setup')ready();
  else if(phase==='caught'){game.resetPositions();drawActors();ready('Steer to try again. The cash boxes will give you a head start.');}
  else if(phase==='paused') {
    if(resumePhase==='word') {cover.hidden=true;setPhase('word');afterWord();}
    else ready('Steer when you’re ready to resume.');
  } else if(phase==='lost')setup();
});
level.addEventListener('change',()=>{setup();level.focus();});
pause.addEventListener('click',pauseGame);
dialog.addEventListener('keydown',event=>{
  if(event.altKey || event.ctrlKey || event.metaKey || event.target===level) return;
  const key=event.key.length===1?event.key.toLowerCase():event.key;
  if(keys[key] && ['playing','ready'].includes(phase)){
    event.preventDefault();if(!event.repeat) steer(keys[key]);
  } else if(key==='p' && !event.repeat){
    if(phase==='paused')action.click();else pauseGame();
  }
});
for(const button of dialog.querySelectorAll('[data-dir]')){
  button.addEventListener('pointerdown',event=>{event.preventDefault();steer(button.dataset.dir);});
  button.addEventListener('click',event=>{if(event.detail===0)steer(button.dataset.dir);});
}
let swipe;
map.tabIndex=-1;
map.addEventListener('pointerdown',e=>{
  if(!['ready','playing'].includes(phase))return;
  swipe={id:e.pointerId,x:e.clientX,y:e.clientY};
  map.setPointerCapture(e.pointerId);
});
map.addEventListener('pointermove',e=>{
  if(swipe?.id!==e.pointerId)return;
  const dx=e.clientX-swipe.x, dy=e.clientY-swipe.y;
  if(Math.max(Math.abs(dx),Math.abs(dy))<12)return;
  steer(Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up'));
  swipe.x=e.clientX;swipe.y=e.clientY;
});
map.addEventListener('lostpointercapture',()=>{swipe=null;});
document.addEventListener('visibilitychange',()=>{if(document.hidden && dialog.open)pauseGame();});
window.addEventListener('blur',()=>{if(dialog.open)pauseGame();});
launcher.addEventListener('click',()=>{
  if(dialog.open)return;
  dialog.showModal();
  if(!game)setup();
  else if(!cover.hidden)action.focus({preventScroll:true});
  else map.focus({preventScroll:true});
});
dialog.addEventListener('close',()=>{pauseGame();stopClock();swipe=null;});
