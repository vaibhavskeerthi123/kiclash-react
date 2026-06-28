import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Skeleton helpers: find common humanoid bones in an imported model by name,
// so we can swing arms/legs for punches & kicks WITHOUT the user rigging
// anything. Works with most Mixamo / standard humanoid naming. If no bones are
// found, posing falls back to whole-body rigid motion.
// ---------------------------------------------------------------------------

// match a bone name loosely (case-insensitive, ignores prefixes like "mixamorig:")
function matches(name, patterns){
  const n = name.toLowerCase().replace(/[^a-z]/g,'');
  return patterns.some(p => n.includes(p));
}

export function findBones(root){
  const bones = {};
  const all = [];
  root.traverse(o=>{ if(o.isBone || o.type==='Bone') all.push(o); });
  if(all.length===0) return null; // no skeleton => rigid fallback

  const pick = (key, includes, sideHint)=>{
    for(const b of all){
      const n=b.name.toLowerCase();
      if(matches(b.name, includes)){
        if(sideHint){
          const isLeft = /left|_l|l_|\bl\b|\.l/.test(n) || n.endsWith('l');
          const isRight= /right|_r|r_|\br\b|\.r/.test(n) || n.endsWith('r');
          if(sideHint==='left' && !isLeft) continue;
          if(sideHint==='right' && !isRight) continue;
        }
        if(!bones[key]) bones[key]=b;
      }
    }
  };

  pick('rUpperArm', ['upperarmr','rightarm','armr','rightupperarm','shoulderr'], 'right');
  pick('lUpperArm', ['upperarml','leftarm','arml','leftupperarm','shoulderl'], 'left');
  pick('rForeArm',  ['forearmr','rightforearm','lowerarmr','elbowr'], 'right');
  pick('lForeArm',  ['forearml','leftforearm','lowerarml','elbowl'], 'left');
  pick('rThigh',    ['uplegr','rightupleg','thighr','rightthigh','hipr'], 'right');
  pick('lThigh',    ['uplegl','leftupleg','thighl','leftthigh','hipl'], 'left');
  pick('rShin',     ['legr','rightleg','shinr','calfr','kneer'], 'right');
  pick('lShin',     ['legl','leftleg','shinl','calfl','kneel'], 'left');
  pick('spine',     ['spine','chest','spine1','spine2']);
  pick('head',      ['head','neck']);

  // store rest (bind) rotations so we can add offsets and restore
  const rest = {};
  for(const k in bones){ rest[k]=bones[k].rotation.clone(); }

  const count = Object.keys(bones).length;
  return count>=2 ? { bones, rest } : null;
}

const _e = new THREE.Euler();
// apply additive rotation offsets (radians) to bones, relative to rest pose
export function poseBones(skel, offsets){
  if(!skel) return;
  const { bones, rest } = skel;
  for(const key in bones){
    const b=bones[key], r=rest[key];
    const off=offsets[key];
    if(off){ b.rotation.set(r.x+(off[0]||0), r.y+(off[1]||0), r.z+(off[2]||0)); }
    else { b.rotation.copy(r); }
  }
}
