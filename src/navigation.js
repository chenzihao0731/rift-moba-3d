const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);

class MinHeap {
  constructor(){this.entries=[];}
  push(value){const a=this.entries;a.push(value);let i=a.length-1;while(i){const p=(i-1)>>1;if(a[p].score<=value.score)break;a[i]=a[p];i=p;}a[i]=value;}
  pop(){const a=this.entries,first=a[0],last=a.pop();if(a.length){let i=0;while(true){const l=i*2+1,r=l+1;if(l>=a.length)break;const child=r<a.length&&a[r].score<a[l].score?r:l;if(a[child].score>=last.score)break;a[i]=a[child];i=child;}a[i]=last;}return first;}
  get size(){return this.entries.length;}
}

// The grid locates a route, while geometric checks keep its smoothed edges clear.
export class Navigation {
  constructor(obstacles=[],{cell=4,min=-120,max=120,clearance=1.8}={}){
    this.cell=cell;this.min=min;this.max=max;this.size=Math.floor((max-min)/cell)+1;
    this.obstacles=obstacles.filter(o=>Number.isFinite(o.x)&&Number.isFinite(o.z)&&o.r>0).map(o=>({x:o.x,z:o.z,r:o.r+clearance}));
    this.blocked=new Uint8Array(this.size*this.size);
    for(let i=0;i<this.blocked.length;i++)this.blocked[i]=this.pointClear(this.point(i))?0:1;
    this._edgeCache=new Map();
  }
  point(index){return{x:this.min+(index%this.size)*this.cell,z:this.min+Math.floor(index/this.size)*this.cell};}
  index(point){const x=clamp(Math.round((point.x-this.min)/this.cell),0,this.size-1),z=clamp(Math.round((point.z-this.min)/this.cell),0,this.size-1);return z*this.size+x;}
  pointClear(point){return point.x>=this.min&&point.x<=this.max&&point.z>=this.min&&point.z<=this.max&&!this.obstacles.some(o=>Math.hypot(point.x-o.x,point.z-o.z)<o.r+.03);}
  segmentClear(a,b){
    if(!this.pointClear(a)||!this.pointClear(b))return false;
    const dx=b.x-a.x,dz=b.z-a.z,length=dx*dx+dz*dz;
    for(const o of this.obstacles){const t=clamp(((o.x-a.x)*dx+(o.z-a.z)*dz)/(length||1),0,1);if(Math.hypot(a.x+t*dx-o.x,a.z+t*dz-o.z)<o.r+.03)return false;}
    return true;
  }
  nearestIndex(point){
    const start=this.index(point);if(!this.blocked[start])return start;
    const sx=start%this.size,sz=Math.floor(start/this.size);let best=start,bestDist=Infinity;
    for(let radius=1;radius<this.size;radius++){
      for(let z=Math.max(0,sz-radius);z<=Math.min(this.size-1,sz+radius);z++)for(let x=Math.max(0,sx-radius);x<=Math.min(this.size-1,sx+radius);x++){
        if(Math.abs(x-sx)!==radius&&Math.abs(z-sz)!==radius)continue;const i=z*this.size+x;if(this.blocked[i])continue;
        const d=distance(this.point(i),point);if(d<bestDist){best=i;bestDist=d;}
      }
      if(bestDist<Infinity&&radius*this.cell>bestDist+this.cell)return best;
    }
    return best;
  }
  nearestPoint(point){const p={x:clamp(point.x,this.min,this.max),z:clamp(point.z,this.min,this.max)};return this.pointClear(p)?p:this.point(this.nearestIndex(p));}
  connectedIndex(point){
    const nearest=this.nearestIndex(point);if(this.segmentClear(point,this.point(nearest)))return nearest;
    const sx=this.index(point)%this.size,sz=Math.floor(this.index(point)/this.size);let best=-1,bestDist=Infinity;
    for(let radius=1;radius<=6;radius++){
      for(let z=Math.max(0,sz-radius);z<=Math.min(this.size-1,sz+radius);z++)for(let x=Math.max(0,sx-radius);x<=Math.min(this.size-1,sx+radius);x++){
        const i=z*this.size+x;if(this.blocked[i])continue;const p=this.point(i),d=distance(point,p);
        if(d<bestDist&&this.segmentClear(point,p)){best=i;bestDist=d;}
      }
      if(best!==-1)return best;
    }
    return -1;
  }
  _edgeClear(a,b){const key=a<b?a*this.blocked.length+b:b*this.blocked.length+a;if(!this._edgeCache.has(key))this._edgeCache.set(key,this.segmentClear(this.point(a),this.point(b)));return this._edgeCache.get(key);}
  findPath(from,to){
    const startPoint=this.nearestPoint(from),destination=this.nearestPoint(to);
    if(this.segmentClear(startPoint,destination))return{points:[destination],destination};
    const start=this.connectedIndex(startPoint),goal=this.connectedIndex(destination),count=this.blocked.length;
    if(start<0||goal<0)return{points:[],destination:startPoint};
    const cost=new Float64Array(count);cost.fill(Infinity);cost[start]=0;
    const came=new Int32Array(count);came.fill(-1);const closed=new Uint8Array(count),heap=new MinHeap();
    const target=this.point(goal),heuristic=i=>distance(this.point(i),target);heap.push({index:start,score:heuristic(start)});
    let reached=start,bestDistance=heuristic(start);
    while(heap.size){
      const current=heap.pop().index;if(closed[current])continue;closed[current]=1;
      const remaining=heuristic(current);if(remaining<bestDistance){bestDistance=remaining;reached=current;}if(current===goal){reached=goal;break;}
      const cx=current%this.size,cz=Math.floor(current/this.size);
      for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
        if(!dx&&!dz)continue;const x=cx+dx,z=cz+dz;if(x<0||z<0||x>=this.size||z>=this.size)continue;
        const next=z*this.size+x;if(closed[next]||this.blocked[next])continue;
        if(dx&&dz&&(this.blocked[cz*this.size+x]||this.blocked[z*this.size+cx]))continue;
        if(!this._edgeClear(current,next))continue;
        const candidate=cost[current]+this.cell*(dx&&dz?Math.SQRT2:1);
        if(candidate<cost[next]){cost[next]=candidate;came[next]=current;heap.push({index:next,score:candidate+heuristic(next)});}
      }
    }
    const raw=[];for(let i=reached;i!==-1;i=came[i]){raw.push(this.point(i));if(i===start)break;}raw.reverse();
    const finalPoint=reached===goal&&this.segmentClear(this.point(goal),destination)?destination:this.point(reached);raw.push(finalPoint);
    // Connect the exact current location to the first safe grid waypoint.
    const points=[];let anchor=startPoint,index=0;
    while(index<raw.length){let far=index;for(let n=index;n<raw.length;n++)if(this.segmentClear(anchor,raw[n]))far=n;else if(n>index)break;const p=raw[far];if(distance(anchor,p)>.05)points.push(p);anchor=p;index=far+1;}
    return{points,destination:finalPoint};
  }
}
