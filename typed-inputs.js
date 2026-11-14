// The type selector already names the quantity; keep one visible heading.
export function typedInputPairs(fields){
 const pairs=[];
 for(let i=0;i<fields.length;i++){
  const f=fields[i],kind=f.options?.includes('Static pressure')&&f.options.includes('Stagnation pressure')?'pressure':f.options?.includes('Static temperature')&&f.options.includes('Stagnation temperature')?'temperature':f.options?.includes('Mach number')&&f.options.includes('Flow speed')?'velocity':null;
  if(!kind)continue;
  for(let j=i+1;j<fields.length;j++){
   const value=fields[j];if(value.options||value.section||value.type)break;
   if((kind==='pressure'&&/pressure/i.test(value.label))||(kind==='temperature'&&/temperature/i.test(value.label))||(kind==='velocity'&&['M1','inletSpeed'].includes(value.key))){pairs.push([f.key,value.key]);break;}
  }
 }
 return pairs;
}
export function compactTypedInputs(fields,root=document){
 for(const [typeKey,valueKey]of typedInputPairs(fields)){
  const selector=root.getElementById('value-'+typeKey),value=root.getElementById('value-'+valueKey);
  if(!selector||!value)continue;
  const parent=selector.closest('.input-group'),group=value.closest('.input-group'),heading=group?.querySelector('.input-top'),number=group?.querySelector('.number-wrap');
  if(!parent||!group||parent===group||!heading||!number)continue;
  const label=heading.querySelector('label'),unit=heading.querySelector('.unit');
  if(label){label.classList.add('sr-only');group.prepend(label);}
  if(unit?.textContent.trim()){unit.classList.add('typed-value-unit');number.append(unit);}
  heading.remove();group.classList.remove('input-group');group.classList.add('typed-value');parent.classList.add('typed-input-group');parent.append(group);
 }
}
