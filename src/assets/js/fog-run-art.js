import { streets, width, height } from './fog-run-maze.js?v=1';

function polygon(ctx,points,colour) {
  ctx.fillStyle=colour;
  ctx.beginPath();
  points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
  ctx.closePath(); ctx.fill();
}
function disc(ctx,x,y,r,colour) {
  ctx.beginPath();ctx.arc(x,y,r,0,2*Math.PI);ctx.fillStyle=colour;ctx.fill();
}
export function drawLondon(canvas) {
  const c=canvas.getContext('2d'), tile=44;
  c.fillStyle='#374f60'; c.fillRect(0,0,canvas.width,canvas.height);
  // Shallow joints and specks of snow keep traversable streets darker than roofs.
  for(let y=0;y<height;y++) for(let x=0;x<width;x++) {
    if(streets[y][x]!=='.') continue;
    const left=x*tile, top=y*tile;
    c.fillStyle='#405969';
    for(let row=0;row<5;row++) for(let col=0;col<3;col++) {
      const offset=(row+(x+y)%2)%2*5;
      c.fillRect(left+2+col*13+offset,top+5+row*8,7,1);
    }
    disc(c,left+tile/2,top+tile/2,1.5,'#91a6ab');
  }
  function roof(x,y,w,h) {
    const varied=(x+3*y)%4;
    const a=x*tile+2,b=y*tile+2,r=(x+w)*tile-3,d=(y+h)*tile-4;
    const inset=Math.min(10,(r-a)/4,(d-b)/4);
    c.fillStyle='#1c3544';c.fillRect(a-1,b-1,r-a+4,d-b+5);
    c.fillStyle='#7894a1';c.fillRect(a,b,r-a,d-b);
    c.fillStyle=['#dae4df','#c6d9dc','#d6e1e6','#d4dfd9'][varied];c.fillRect(a,b,r-a-2,d-b-3);
    if(w>=h) {
      const mid=(b+d)/2;
      polygon(c,[[a,b],[r,b],[r-inset,mid],[a+inset,mid]],'#edf1e8');
      polygon(c,[[a,d-3],[a+inset,mid],[r-inset,mid],[r,d-3]],'#a9c0c9');
      c.fillStyle='#f8f7e9';c.fillRect(a+inset,mid-1,r-a-2*inset,3);
    } else {
      const mid=(a+r)/2;
      polygon(c,[[a,b],[mid,b+inset],[mid,d-inset],[a,d]],'#edf1e8');
      polygon(c,[[r,b],[r,d],[mid,d-inset],[mid,b+inset]],'#a9c0c9');
      c.fillStyle='#f7f6e8';c.fillRect(mid-1,b+inset,3,d-b-2*inset);
    }
    const chimneys=w>2?2:1;
    for(let i=0;i<chimneys;i++){
      const cx=a+(r-a)*(i+.7)/(chimneys+.5),cy=b+(d-b)*.3;
      c.fillStyle='#8da5ab';c.fillRect(cx+3,cy+2,7,9);
      c.fillStyle='#835d54';c.fillRect(cx,cy,7,8);
      c.fillStyle='#573f3d';c.fillRect(cx-1,cy-2,9,4);
      c.fillStyle='#e2e4d8';c.fillRect(cx-1,cy-2,9,1.6);
    }
    // A few lit dormers let houses read from above without covering the street.
    if (w>=2) for(let i=0;i<w;i++) {
      const dx=a+(i+.5)*(r-a)/w;
      c.fillStyle='#6c8490';c.fillRect(dx-5,d-11,10,7);
      c.fillStyle='#edc084';c.fillRect(dx-3,d-9,6,4);
      polygon(c,[[dx-7,d-11],[dx,d-16],[dx+7,d-11]],'#f8f7ed');
    }
  }
  const used=new Set();
  for(let y=1;y<height-1;y++) for(let x=1;x<width-1;x++) {
    const free=(cx,cy)=>cx<width-1 && cy<height-1 && streets[cy][cx]==='#' && !used.has(cy*width+cx);
    if(!free(x,y)) continue;
    let w=1,h=1;
    while(free(x+w,y))w++;
    while(Array.from({length:w},(_,i)=>free(x+i,y+h)).every(Boolean))h++;
    for(let j=0;j<h;j++) for(let i=0;i<w;i++)used.add((y+j)*width+x+i);
    roof(x,y,w,h);
  }
  // Snowbanks along the outside of the playable map and two London street plates.
  const W=canvas.width,H=canvas.height;
  for(const [x,y,w,h] of [[0,0,W,tile],[0,H-tile,W,tile],[0,tile,tile,H-2*tile],[W-tile,tile,tile,H-2*tile]]) {
    c.fillStyle='#9ab5c1';c.fillRect(x,y,w,h);
    c.fillStyle='#dce8e4';c.fillRect(x+2,y+2,w-4,h-4);
  }
  for(let n=0;n<width;n++) {
    for(const y of [2,H-7]) {c.fillStyle='#b6cbd0';c.fillRect(n*tile+8,y,24,3);}
  }
  for(const [text,x,y] of [['CORNHILL',W*.22,22],['CHEAPSIDE',W*.76,H-22]]) {
    c.fillStyle='#40545b';c.fillRect(x-38,y-8,76,16);
    c.strokeStyle='#9bac9d';c.strokeRect(x-37,y-7,74,14);
    c.fillStyle='#f6edcc';c.font='bold 9px Georgia';c.textAlign='center';c.fillText(text,x,y+3);
  }
  for(const [x,y] of [[23,23],[W-23,23],[23,H-23],[W-23,H-23],[W*.57,18],[W*.39,H-18]]) {
    disc(c,x+3,y+4,10,'#a7bdc2');
    for(let j=0;j<3;j++) {
      const top=y-13+j*4,half=5+j*2;
      polygon(c,[[x,top],[x+half,top+12],[x-half,top+12]],'#48736f');
      polygon(c,[[x,top],[x+half*.65,top+7],[x-2,top+6],[x-half*.7,top+8]],'#e6efdf');
    }
  }
}

export function drawPiece(canvas,kind) {
  const c=canvas.getContext('2d');
  c.clearRect(0,0,48,48);
  if(kind==='cap') {
    disc(c,24,34,15,'#21364480');
    // A floppy scarlet nightcap with a broad white band and a snowy pompom.
    const outline=new Path2D('M7 26 Q8 12 18 8 Q24 5 33 10 L42 17 L37 20 Q29 16 27 17 L35 26 L35 34 Q23 40 7 34 Z');
    c.fillStyle='#bd3c46';c.fill(outline);c.strokeStyle='#3d2934';c.lineWidth=2.6;c.stroke(outline);
    polygon(c,[[12,25],[16,13],[20,10],[22,10],[18,16],[16,25]],'#f48379');
    c.fillStyle='#fff4de';c.fillRect(8,26,26,7);
    c.fillStyle='#c1d2d0';c.fillRect(9,32,24,2);
    disc(c,40,19,4.7,'#263e48');disc(c,40,18,3.7,'#fff2da');
  } else {
    disc(c,24,25,20,'#a2d7d22b');
    c.strokeStyle='#c5ddd5';c.lineWidth=2;
    for(let i=0;i<3;i++) {
      c.beginPath();c.ellipse(5+i*2,34-i*3,2,3,Math.PI*.25,0,2*Math.PI);c.stroke();
    }
    c.fillStyle='#182b38';c.fillRect(6,14,36,25);
    c.fillStyle=kind==='iron'?'#638d92':'#80718f';c.fillRect(8,16,32,20);
    c.fillStyle='#283c4b';c.fillRect(8,25,32,9);c.fillRect(7,20,34,3);
    c.strokeStyle='#e5c486';c.lineWidth=3;c.strokeRect(19,10,10,5);
    for(const x of [11,34]){c.fillStyle='#d0ad71';c.fillRect(x,16,2,19);}
    c.strokeStyle='#fce1a0';c.lineWidth=2;c.strokeRect(21,21,6,6);
    c.fillStyle='#e7b85e';c.fillRect(19,24,10,8);
    c.fillStyle='#493c35';c.fillRect(23,26,2,4);
  }
}
