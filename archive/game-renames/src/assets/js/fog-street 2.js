import { pitch, signY, ground, wreathRadius } from './fog-course.js?v=4';

// Draw in low-resolution street coordinates so the lamps, cobbles and runner
// share the same pixel grid on a phone and a large screen.
export function createStreet(canvas, signs) {
  const ctx = canvas.getContext('2d');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const palettes = [
    ['#395251', '#243d3b', '#728070'],
    ['#785047', '#50373a', '#ad8062'],
    ['#435463', '#2b3949', '#74848a'],
    ['#756247', '#4d483b', '#a39272'],
  ];
  const labels = new Map();
  let lastCourse = null;
  let distance = 0;
  let partyTime = 0;
  function rect(x, y, w, h, colour) {
    ctx.fillStyle = colour;
    ctx.fillRect(Math.round(x), Math.round(y), Math.ceil(w), Math.ceil(h));
  }
  function disc(x, y, r, colour) {
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  function glow(x, y, radius, colour) {
    const g = ctx.createRadialGradient(x,y,0,x,y,radius);
    g.addColorStop(0,colour);
    g.addColorStop(1,'rgba(255,205,117,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x-radius,y-radius,radius*2,radius*2);
  }
  function roof(x, y, w, h, colour) {
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.moveTo(x,y); ctx.lineTo(x+w*.5,y-h); ctx.lineTo(x+w,y);
    ctx.closePath(); ctx.fill();
  }
  function windowPane(x,y,w,h,lit) {
    rect(x-2,y-2,w+4,h+4,'#29373a');
    rect(x,y,w,h,lit ? '#f6c172' : '#739598');
    rect(x+1,y+1,w-2,3,lit ? '#ffe1a0' : '#a2bcba');
    rect(x+w*.48,y,1,h,'#293c40');
    rect(x,y+h*.5,w,1,'#293c40');
    rect(x-3,y+h+1,w+6,2,'#b5b5a1');
  }
  function lamp(x,y) {
    rect(x-1,y+3,2,30,'#162f32');
    rect(x-3,y+32,6,2,'#102a2d');
    glow(x,y,12,'#fbd58a85');
    rect(x-3,y-3,6,8,'#1b3234'); rect(x-2,y-2,4,5,'#ffe7a6');
    rect(x-4,y-4,8,2,'#21383a'); rect(x-1,y-6,2,2,'#182d30');
  }
  function skyline(w) {
    const sky = ctx.createLinearGradient(0,0,0,109);
    sky.addColorStop(0,'#162b38'); sky.addColorStop(.52,'#738e8f'); sky.addColorStop(1,'#c1b1a0');
    ctx.fillStyle=sky; ctx.fillRect(0,0,w,160);
    const moonX=w*.77;
    glow(moonX,17,24,'#f6dba15c'); disc(moonX,17,7,'#e9dcb5');
    for (let i=0;i<w/16+1;i++) {
      const x=i*16-(motion.matches ? 0 : distance*.14%16);
      const top=35+((i+Math.floor((motion.matches?0:distance*.14)/16))*17)%19;
      rect(x,top,18,58,'#51696e'); roof(x-1,top+1,20,6,'#51696e');
      rect(x+9,top-9,3,8,'#51696e');
    }
    for (let i=0;i<w/31+1;i++) {
      const x=i*31-8-(motion.matches ? 0 : distance*.26%31);
      const top=41+((i+Math.floor((motion.matches?0:distance*.26)/31))*7)%20;
      rect(x,top,32,49,'#3e575e'); rect(x+8,top-6,5,6,'#3e575e');
      rect(x+3,top+4,2,4,'#beac88'); rect(x+13,top+10,2,3,'#82908a');
    }
    const tower=w*.31;
    rect(tower-5,27,10,32,'#425b60'); roof(tower-7,27,14,15,'#425b60');
    rect(tower,8,1,6,'#425b60'); disc(tower,32,2.7,'#e3c590');
    rect(tower,30,1,3,'#45585a');
  }
  function shop(cx,w,number,partyHouse) {
    const i=(number%3+3)%3;
    const index=(number%palettes.length+palettes.length)%palettes.length;
    const [wall,dark,trim]=palettes[partyHouse ? 1 : index];
    const x=cx-w/2;
    const top=43+(index%3)*4;
    const doorW=Math.min(18,w*.24);
    rect(x+w*.17,top-13,6,13,dark);
    rect(x+w*.17-1,top-15,8,3,trim);
    rect(x+1,top,w-2,80,wall);
    // Stagger the brick courses and leave the upper windows bright against them.
    for (let row=0;row<4;row++) {
      for (let bx=x+4+(row%2)*5;bx<x+w-8;bx+=13) rect(bx,top+4+row*5,5,1,dark);
    }
    rect(x,top,w,3,trim); rect(x-1,top+3,w+2,2,dark);
    if(i===1) { roof(cx-w*.26,top,w*.52,9,dark); roof(cx-w*.19,top,w*.38,5,trim); }
    else { rect(x+2,top-1,w-4,1,'#b0b4a6'); }
    for(const frac of [.23,.5,.77]) {
      windowPane(cx+w*(frac-.5)-3,top+8,6,9,(i+index+Math.round(frac*10))%3!==0 || partyHouse);
    }
    rect(x,67,w,13,dark); rect(x-1,66,w+2,2,trim);
    if(partyHouse) {
      ctx.textAlign='center';
      ctx.fillStyle='#ffe7b1'; ctx.font='bold 7px Georgia';
      ctx.fillText('FRED’S',cx,76,w-8);
    }
    rect(x+1,80,w-2,39,dark);
    const displayW=Math.max(6,Math.min(40,(w-doorW-13)/2));
    for(const side of [-1,1]) {
      const dx=cx+side*(doorW/2+displayW/2+4)-displayW/2;
      windowPane(dx,86,displayW,25,true);
      rect(dx+1,106,displayW-2,4,'#966c46');
      for(let j=0;j<3;j++) {
        const itemX=dx+displayW*(j+.5)/3;
        if (i===0) {
          disc(itemX,106,2.3,'#a46739'); rect(itemX-1,104,2,1,'#ffe0a1');
        } else if (i===1) {
          rect(itemX-2,104-j%2*2,2,4,'#6d5140'); rect(itemX+1,103,2,5,'#4d6964');
        } else {
          rect(itemX-2,104,4,2,'#95685a'); rect(itemX-1,102,4,2,'#61736b');
        }
      }
      if (partyHouse) {
        for (const guest of [-1,1]) {
          const gx=dx+displayW*(.5+guest*.2)+Math.sin(partyTime*9+side)*1.5;
          const gy=99+Math.sin(partyTime*14+guest*2)*1.5;
          disc(gx,gy,2.3,'#775241'); rect(gx-2,gy+2,5,7,guest===1?'#995154':'#49685a');
          rect(gx+guest*3,gy+3,2,2,'#775241');
        }
      }
    }
    rect(cx-doorW/2-2,85,doorW+4,36,trim);
    const open=partyHouse;
    rect(cx-doorW/2,87,doorW,32,open ? '#ffdb8a' : '#203332');
    if(open) {
      rect(cx-doorW/2,87,doorW*.22,32,dark);
      glow(cx,105,17,'#ffe3a78c');
    } else {
      rect(cx-doorW/2+2,89,doorW-4,10,'#a5aaa0');
      rect(cx-1,89,1,10,dark); rect(cx-doorW/2+2,93,doorW-4,1,dark);
      rect(cx-doorW/2+3,102,doorW-6,13,dark);
      rect(cx+doorW*.25,104,2,2,'#ecc479');
    }
    rect(x+2,81,2,36,trim); rect(x+w-4,81,2,36,trim);
    if (i===0) {
      for(let ax=x+3,j=0;ax<x+w-5;ax+=5,j++) rect(ax,82,5,3,j%2 ? '#b79875' : '#925f55');
    }
    rect(x,119,w,3,'#152d31'); rect(cx-doorW/2-3,119,doorW+6,3,'#b6b5a1');
    if(partyHouse) {
      // Fred waiting at the open door, one hand raised in welcome.
      rect(cx-2,105,4,4,'#d49b6a'); rect(cx-2,104,4,1,'#3e322e');
      rect(cx-3,109,6,8,'#875148'); rect(cx+3,109,2,3,'#875148');
      rect(cx+5,106,2,4,'#d49b6a'); rect(cx-2,116,2,3,'#373d3c');
      rect(cx+1,116,2,3,'#373d3c');
      for(let j=0;j<11;j++){
        const gx=x+4+j*(w-8)/10, gy=80+Math.sin(j*Math.PI/10)*3;
        rect(gx,gy,4,2,'#42674b'); if(j%2===0) rect(gx+1,gy+1,1,1,'#ffb263');
      }
    }
  }
  function scrooge(x,y,scale,step,jumping,facing) {
    ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(scale*facing,scale);
    rect(-6,0,13,2,'#25373a');
    const stride=jumping ? 3 : step ? 3 : 0;
    rect(-4,-6,3,4,'#18252a'); rect(-4-stride,-3,3+stride,2,'#18252a');
    rect(1,-6,3,4,'#18252a'); rect(1,-4,3+stride,3,'#18252a');
    rect(-5-stride,-2,4,2,'#101f25');rect(2+stride,-1,4,2,'#101f25');
    rect(-4,-15,8,10,'#2f473e');rect(-5,-9,10,5,'#233c37');
    rect(-4,-14,2,9,'#758477');rect(3,-13,3,7,'#273c36');
    rect(-3,-21,7,7,'#dbab7d');rect(3,-18,3,2,'#e6bf91');rect(-4,-20,2,5,'#b3b9a7');
    rect(-3,-15,7,2,'#ae5250');rect(-4,-14,2,4,'#a64645');
    rect(-4,-27,7,7,'#15282d');rect(-4,-22,7,2,'#4b5350');
    rect(-6,-21,12,2,'#112328');
    if(jumping) {
      rect(4,-18,3,5,'#36574b'); rect(6,-23,3,6,'#36574b'); rect(7,-26,3,4,'#ecc699');
    } else {
      rect(5,-9,3,2,'#e4bf87');rect(8,-8,1,9,'#c29761');
    }
    ctx.restore();
  }
  function wreath(x,word) {
    const rx=wreathRadius(word), ry=12;
    ctx.fillStyle='#173e35';
    ctx.beginPath();ctx.ellipse(x,signY,rx,ry,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#b69b64';ctx.lineWidth=1;
    ctx.beginPath();ctx.ellipse(x,signY,rx-3,ry-3,0,0,Math.PI*2);ctx.stroke();
    for(let i=0;i<28;i++){
      const a=i*Math.PI/14, lx=x+rx*Math.cos(a), ly=signY+ry*Math.sin(a);
      ctx.save();ctx.translate(lx,ly);ctx.rotate(Math.atan2(ry*Math.cos(a),-rx*Math.sin(a))+.45);
      ctx.fillStyle=i%2?'#519167':'#679b66';
      ctx.beginPath();ctx.moveTo(-4,0);ctx.quadraticCurveTo(0,-4,5,0);ctx.quadraticCurveTo(0,3,-4,0);ctx.fill();
      ctx.restore();
      if(i%7===1){disc(lx,ly,1.8,'#b53543');disc(lx+2,ly+1,1.2,'#db5452');}
    }
    rect(x-1,signY+ry-1,3,3,'#e65455');
    roof(x-6,signY+ry+4,5,4,'#a73542');roof(x+2,signY+ry+4,5,4,'#a73542');
  }
  function ghost(x,y,side) {
    ctx.save();ctx.translate(x,y);ctx.scale(side,1);
    ctx.fillStyle='#d6eee9';ctx.strokeStyle='#608888';ctx.lineWidth=1.4;
    ctx.beginPath();ctx.moveTo(-8,9);ctx.quadraticCurveTo(-11,2,-8,-6);
    ctx.bezierCurveTo(-8,-17,7,-18,8,-7);ctx.lineTo(10,1);ctx.lineTo(15,4);
    ctx.lineTo(10,6);ctx.lineTo(7,5);ctx.lineTo(8,13);ctx.lineTo(3,10);
    ctx.lineTo(-1,15);ctx.lineTo(-4,10);ctx.lineTo(-10,15);ctx.closePath();ctx.fill();ctx.stroke();
    rect(0,-7,2,3,'#304d55');rect(5,-7,2,3,'#304d55');
    for(let i=0;i<3;i++){
      ctx.strokeStyle='#a7c5c4';ctx.beginPath();ctx.ellipse(-8-i*3,7+i*2,2.2,1.5,-.3,0,Math.PI*2);ctx.stroke();
    }
    ctx.restore();
  }
  function label(number,word,x,w) {
    let el=labels.get(number);
    if(!el){el=document.createElement('span');signs.append(el);labels.set(number,el);}
    if(el.textContent!==word)el.textContent=word;
    el.hidden=false;
    el.style.left=x/w*100+'%';
  }
  function draw(course=lastCourse) {
    lastCourse=course;
    if (!course || !ctx || !canvas.clientWidth || !canvas.clientHeight) return;
    const w=Math.round(160*canvas.clientWidth/canvas.clientHeight);
    if(canvas.width!==w || canvas.height!==160){canvas.width=w;canvas.height=160;}
    const state=course?.state || 'start';
    const party=state==='arriving' || state==='won';
    const taken=state==='abducting' || state==='lost';
    const t=course?.sceneTime || 0;
    distance=course?.distance || 0;
    partyTime=party && !motion.matches?t:0;
    course.setWidth(w);
    const runnerX=course.playerX;
    const origin=course.houseX(0);
    skyline(w);
    rect(0,120,w,40,'#384d50');
    for(let row=0;row<7;row++){
      const pattern=(row%2)*8-distance%17;
      for(let x=pattern-17;x<w;x+=17)rect(x,124+row*6,11,1,row%3?'#586e6c':'#778780');
    }
    const visible=new Set();
    const start=Math.floor(-origin/pitch)-1, end=Math.ceil((w-origin)/pitch)+1;
    for(let i=start;i<=end;i++){
      const x=origin+i*pitch;
      if(x < -pitch*.51 || x > w+pitch*.51) continue;
      const home=i===course.homeIndex;
      shop(x,pitch-4,i,home);
      lamp(x+pitch/2,94);
      const house=course.houseAt(i);
      if(house && !home){
        wreath(x,house.word);label(i,house.word,x,w);visible.add(i);
      }
      if(home) {
        // Festoon lights and dancers distinguish Fred's house from the shops.
        for(let j=0;j<18;j++){
          const lx=x-pitch/2+5+j*7, ly=34+Math.sin(j*Math.PI/17)*8;
          rect(lx,ly,7,1,'#506557');
          if(j%2===0){glow(lx,ly+2,5,'#f8d18c77');disc(lx,ly+2,1.5,'#ffde9b');}
        }
      }
    }
    for(const [i,el] of labels)if(!visible.has(i)){el.remove();labels.delete(i);}
    const mist=ctx.createLinearGradient(0,92,0,150);
    mist.addColorStop(0,'#a9c5c000');mist.addColorStop(.63,'#b8cbc634');mist.addColorStop(1,'#91b1b100');
    ctx.fillStyle=mist;ctx.fillRect(0,92,w,58);
    let x=runnerX,y=ground-(course?.jumpHeight || 0),scale=1;
    const step=Math.floor(distance/5)%2===1;
    if(party){
      const entry=Math.max(0,(t-.58)/.42);
      x+=(course.houseX(course.homeIndex)-x)*entry; y-=20*entry;scale-=.49*entry;
      ctx.globalAlpha=Math.min(1,(1-t)*11);
    } else if(taken){
      const lift=Math.max(0,(t-.44)/.56);
      y-=lift*lift*177;x+=15*lift;
    }
    scrooge(x,y,scale,step,(course?.jumpHeight || 0)>5 || taken,party ? 1 : course.facing);
    ctx.globalAlpha=1;
    if(taken){
      const approach=Math.min(1,t/.44);
      const away=1-approach;
      for(const side of [-1,1]) {
        ghost(x+side*(12+away*(side===1?w*.55:w*.18)),y-14-away*(ground+35),-side);
      }
    }
  }
  new ResizeObserver(()=>draw()).observe(canvas);
  return {draw};
}
