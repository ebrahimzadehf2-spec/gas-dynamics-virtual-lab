import test from 'node:test';
import assert from 'node:assert/strict';
import {regionLabelPosition,pointInPolygon} from './region-labels.js';
import {solveInteraction} from './wave-interaction.js';
test('Region label ignores artificial cell divisions and stays far from the true boundary',()=>{
 const cells=Array.from({length:20},(_,i)=>[[i*5,0],[(i+1)*5,0],[(i+1)*5,100],[i*5,100]]),r=regionLabelPosition(cells);
 assert.ok(Math.abs(r.point[0]-50)<.1&&Math.abs(r.point[1]-50)<.1);assert.ok(r.clearance>49);assert.equal(r.callout,false);
});
test('A narrow region receives a callout with its target strictly inside',()=>{
 const p=[[[0,0],[100,0],[100,5]]],r=regionLabelPosition(p);assert.equal(r.callout,true);assert.ok(pointInPolygon(r.point,p[0]));assert.ok(r.clearance<3);
});
test('Both interaction topologies keep every label target inside its own region',()=>{
 for(const interactionType of ['Opposing shocks','Same-direction shocks'])for(const turns of [[10,10],[8,9],[10,20]]){
  const r=solveInteraction({interactionType,M1:4,thetaUpper:turns[0],thetaLower:turns[1]}),z=r.geometry,points=z.domain,x0=z.startX,x1=z.endX,y0=Math.min(...points.map(p=>p[1])),y1=Math.max(...points.map(p=>p[1])),scale=Math.min(580/(x1-x0),190/(y1-y0));
  for(const state of Object.values(r.regions)){
   const polys=z.fields.filter(c=>c.state===state).map(c=>c.poly.map(([x,y])=>[x*scale,y*scale]));
   assert.ok(polys.length);const label=regionLabelPosition(polys);assert.ok(label);assert.ok(polys.some(p=>pointInPolygon(label.point,p)));if(!label.callout)assert.ok(label.clearance>=12);
  }
 }
});

test('Both downstream regions always have distinct visible callouts in opposing custom geometry',async()=>{
 const {sceneSVG}=await import('./graphics.js');
 for(const [thetaUpper,thetaLower] of [[12.5,8],[10,20],[20,10],[10,10]]){
  const x={M1:4,thetaUpper,thetaLower,geometryMode:'Custom geometry',channelHeight:1.5,cornerSpacing:.5,gamma:1.4},r=solveInteraction(x),v=sceneSVG({kind:'collision',...r},x);
  for(const n of ['4','5'])assert.equal([...v.svg.matchAll(new RegExp(`data-region-callout="${n}"`,'g'))].length,1);
  assert.match(v.svg,/<text x="602" y="110"[^>]*>5<\/text>/);assert.match(v.svg,/<text x="602" y="200"[^>]*>4<\/text>/);
 }
});
