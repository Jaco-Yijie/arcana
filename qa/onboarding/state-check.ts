import assert from 'node:assert/strict'

const values = new Map<string, string>()
let blocked = false
Object.defineProperty(globalThis, 'window', {value:{localStorage:{
  getItem:(key:string)=>values.get(key) ?? null,
  setItem:(key:string,value:string)=>{if(blocked)throw new Error('Storage unavailable');values.set(key,value)},
  removeItem:(key:string)=>values.delete(key),
}}, configurable:true})
const {needsOnboarding,hasCompletedOnboarding,completeOnboarding,ONBOARDING_KEY}=await import('../../src/features/onboarding/state')
assert.equal(needsOnboarding(),true)
for(const [key,value] of [
 ['arcana:guidance',{completedOnce:true}],
 ['arcana:active-session',{id:'existing-session'}],
 ['arcana:journal',[{id:'existing-entry'}]],
] as const){
 values.set(key,JSON.stringify(value));assert.equal(needsOnboarding(),false);values.clear()
}
values.set('arcana:journal','{}');values.set('arcana:guidance','null');assert.equal(needsOnboarding(),true)
values.set(ONBOARDING_KEY,'true');assert.equal(hasCompletedOnboarding(),true);assert.equal(needsOnboarding(),false);values.clear()
assert.equal(completeOnboarding(),true);assert.equal(values.get(ONBOARDING_KEY),'true')
blocked=true;assert.equal(completeOnboarding(),false);values.clear();assert.equal(hasCompletedOnboarding(),true)
console.log('Onboarding: new/returning users, stored completion, malformed storage and unavailable storage checks passed')
