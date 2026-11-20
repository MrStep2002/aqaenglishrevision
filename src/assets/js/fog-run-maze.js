// Cell centres are integer coordinates. Actors travel along the edges between
// neighbouring street cells, so neither turns nor dropped frames can cut a corner.
export const streets = [
  '###############',
  '#.............#',
  '#.###.###.###.#',
  '#...#.....#...#',
  '#.#.#.###.#.#.#',
  '#.#.........#.#',
  '#.###.#.#.###.#',
  '#.....#.#.....#',
  '#.###.....###.#',
  '#.............#',
  '###############',
];
export const width = streets[0].length;
export const height = streets.length;
export const directions = {up:-width, right:1, down:width, left:-1};
const opposite = {up:'down', right:'left', down:'up', left:'right'};
const id = (x,y) => y*width+x;
const roads = new Map();
streets.forEach((row,y) => [...row].forEach((tile,x) => {
  if (tile !== '.') return;
  const cell = id(x,y);
  roads.set(cell, Object.entries(directions).flatMap(([dir,offset]) => {
    const next = cell+offset;
    return streets[Math.floor(next/width)]?.[next%width] === '.' ? [{dir,cell:next}] : [];
  }));
}));

// The maze is small and fixed. Cache walking distances once for both pursuers.
const distances = new Map();
for (const start of roads.keys()) {
  const found = new Map([[start,0]]);
  const queue = [start];
  for (let i=0; i<queue.length; i++) {
    const here = queue[i];
    for (const {cell} of roads.get(here)) {
      if (found.has(cell)) continue;
      found.set(cell,found.get(here)+1);
      queue.push(cell);
    }
  }
  distances.set(start,found);
}
const distance = (a,b) => distances.get(a).get(b);
const pads = [[3,1],[7,1],[11,1],[3,3],[7,3],[11,3],[4,5],[7,5],[10,5],[3,7],[7,7],[11,7],[3,9],[7,9],[11,9]].map(([x,y]) => id(x,y));
const actor = cell => ({cell,to:cell,t:0,dir:null});
export function position(a) {
  return {x:a.cell%width+(a.to%width-a.cell%width)*a.t,
    y:Math.floor(a.cell/width)+(Math.floor(a.to/width)-Math.floor(a.cell/width))*a.t};
}
const nearest = a => a.t < .5 ? a.cell : a.to;

function advance(a, amount, choose) {
  if (a.cell===a.to) {
    const next=choose(roads.get(a.cell));
    if (!next) return;
    a.to=next.cell;
    a.dir=next.dir;
  }
  a.t+=amount;
  if (a.t>=1) {
    const rest=a.t-1;
    a.cell=a.to;
    a.t=0;
    if(rest>0) advance(a,rest,choose);
  }
}

export class FogRunMaze {
  constructor(random=Math.random) {
    this.random=random;
    this.lives=3;
    this.words=0;
    this.resetPositions();
    this.tokens=[];
  }
  resetPositions() {
    const starts=[7,5,9,3,11].map(x=>id(x,9));
    const spawn=starts.find(cell=>(this.tokens ?? []).every(t=>!t.active || distance(cell,t.cell)>1));
    this.player=actor(spawn ?? starts[0]);
    this.boxes=[actor(id(1,1)),actor(id(13,1))];
    this.queued=null;
    this.grace=1.4;
  }
  placeWords(entries,answer) {
    // One sign in each third of the board keeps labels distinct on small screens.
    // Spawn away from the cap, including when one word replaces the last.
    const origin=nearest(this.player);
    const usedRows=new Set();
    this.tokens=entries.map((entry,i)=>{
      const sites=pads.filter(cell => Math.floor((cell%width)/5)===i && distance(cell,origin)>=3);
      const safe=sites.filter(cell=>this.boxes.every(box=>distance(nearest(box),cell)>1));
      const separate=sites.filter(cell=>!usedRows.has(Math.floor(cell/width)));
      const spaced=safe.filter(cell=>!usedRows.has(Math.floor(cell/width)));
      const candidates=spaced.length ? spaced : separate.length ? separate : sites;
      const cell=candidates[Math.floor(this.random()*candidates.length)];
      usedRows.add(Math.floor(cell/width));
      return {entry,cell,correct:entry===answer,active:true};
    });
    this.player.dir=null;
    this.queued=null;
    this.grace=1.4;
  }
  steer(dir) {
    if (!Object.hasOwn(directions,dir)) return false;
    const p=this.player;
    if (p.cell!==p.to && dir===opposite[p.dir]) {
      [p.cell,p.to]=[p.to,p.cell]; p.t=1-p.t; p.dir=dir;
    }
    this.queued=dir;
    return p.cell!==p.to || roads.get(p.cell).some(n=>n.dir===dir);
  }
  playerTurn(options) {
    const turn=options.find(n=>n.dir===this.queued);
    if (turn) {this.queued=null; return turn;}
    return options.find(n=>n.dir===this.player.dir);
  }
  boxTurn(box,index,options) {
    // One box follows the cap; the other tries to meet it at the next junction.
    let target=nearest(this.player);
    if (index===1) {
      for(let n=0;n<2;n++) {
        const ahead=roads.get(target).find(edge=>edge.dir===this.player.dir);
        if (!ahead) break;
        target=ahead.cell;
      }
    }
    let routes=options.filter(edge=>edge.dir!==opposite[box.dir]);
    if (!routes.length) routes=options;
    const other=nearest(this.boxes[1-index]);
    const cost=edge=>distance(edge.cell,target)+(edge.cell===other?2:0);
    const best=Math.min(...routes.map(cost));
    const shortlist=routes.filter(edge=>cost(edge)===best);
    return shortlist[Math.floor(this.random()*shortlist.length)];
  }
  // Call at fixed, small steps, returning at most one gameplay event per step.
  tick(dt) {
    advance(this.player,dt*4.65,links=>this.playerTurn(links));
    this.grace=Math.max(0,this.grace-dt);
    if (this.grace===0) {
      this.boxes.forEach((box,i)=>advance(box,dt*(2.55-i*.18+Math.min(this.words,12)*.13),links=>this.boxTurn(box,i,links)));
    }
    const p=position(this.player);
    const touching=(x,y,r)=>Math.hypot(p.x-x,p.y-y)<r;
    if (this.grace===0 && this.boxes.some(box=>{const b=position(box);return touching(b.x,b.y,.64);})) {
      this.lives--;
      return {kind:'caught'};
    }
    const token=this.tokens.find(t=>t.active && touching(t.cell%width,Math.floor(t.cell/width),.28));
    if (!token) return null;
    token.active=false;
    if (!token.correct) {
      this.lives--;
      return {kind:'miss',token};
    }
    // Start the next clue on a cell centre, free to choose any open direction.
    this.player=actor(token.cell);
    this.words++;
    return {kind:'word',token};
  }
}
