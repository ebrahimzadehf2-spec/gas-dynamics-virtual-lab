import test from 'node:test';
import assert from 'node:assert/strict';
import {readableSceneLabels,textContrast,readableInk} from './scene-labels.js';
test('Plain numeric labels select contrasting ink on saturated and light fields',()=>{
 for(const fill of ['#db2525','#1834b8','#f8fbf6','#20c75a']){
  const svg=readableSceneLabels(`<rect x="0" y="0" width="600" height="200" fill="${fill}"/><text x="50" y="100" fill="#24313c" font-size="12">M₁ = 28.65</text>`);
  const ink=svg.match(/<text[^>]*fill="([^"]*)"/)[1];assert.equal(ink,readableInk(fill));assert.ok(textContrast(ink,fill)>=4.5);assert.match(svg,/font-size="16"/);assert.doesNotMatch(svg,/stroke=|text-shadow/);
 }
});
