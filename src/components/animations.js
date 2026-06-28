import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// ---------------------------------------------------------------------------
// External / Mixamo animation support with retargeting + diagnostics.
// ---------------------------------------------------------------------------

export const STATE_CLIP = {
  idle:    ['idle','idle.001','breathing idle','tpose'],
  walk:    ['walk','walking','run','running'],
  dash:    ['run','running','walk','walking'],
  jump:    ['jump','jumping','jump up'],
  punch:   ['punch','punching','jab','cross','attack','hook'],
  kick:    ['kick','kicking','roundhouse','attack'],
  block:   ['block','blocking','guard','idle'],
  charge:  ['charge','charging','power up','powering up','idle'],
  stagger: ['hit','hit reaction','impact','stagger'],
  knock:   ['knockdown','falling back','fall','hit reaction'],
  special: ['cast','casting','throw','attack','punch'],
  dead:    ['death','dying','knockout','knockdown'],
};

const fbx = new FBXLoader();
const gltf = new GLTFLoader();

// normalize a bone/track name: strip "mixamorig:" prefixes and lowercase
function normBone(name){
  return name.replace(/^.*?:/,'').replace(/[^a-zA-Z0-9]/g,'').toLowerCase();
}

// Build a lookup of a model's bone names so we can retarget clips onto it.
export function collectBoneNames(root){
  const set = new Map(); // normalized -> actual track-prefix name
  root.traverse(o=>{
    if(o.isBone || o.type==='Bone'){ set.set(normBone(o.name), o.name); }
  });
  return set;
}

// Retarget a clip's track names to match the target model's bone names.
// Mixamo tracks look like "mixamorig:RightArm.quaternion"; the model bone may
// be "RightArm" or "mixamorig1:RightArm" — we match on the normalized core.
export function retargetClip(clip, boneNameMap){
  const tracks = [];
  for(const track of clip.tracks){
    const dot = track.name.lastIndexOf('.');
    const boneRaw = track.name.substring(0, dot);
    const prop = track.name.substring(dot); // ".quaternion" / ".position" / ".scale"
    const target = boneNameMap.get(normBone(boneRaw));
    if(!target) continue; // bone not in this model -> drop track
    const t = track.clone();
    t.name = target + prop;
    tracks.push(t);
  }
  const out = new THREE.AnimationClip(clip.name, clip.duration, tracks);
  out.userData = { retargetedTracks: tracks.length, originalTracks: clip.tracks.length };
  return out;
}

export function loadClip(url, name){
  const ext = url.split('.').pop().toLowerCase();
  return new Promise((res,rej)=>{
    const handle = (clips)=>{
      if(!clips || !clips.length){ rej(new Error('no clips in '+url)); return; }
      const clip = clips[0]; clip.name = name; res(clip);
    };
    if(ext==='fbx') fbx.load(url, obj=>handle(obj.animations), undefined, rej);
    else gltf.load(url, g=>handle(g.animations), undefined, rej);
  });
}

// Try to auto-load named clips for a fighter id from
// public/models/<id>_anims/<clip>.fbx . Returns { clips:{name:clip}, log:[...] }.
export async function autoLoadClips(id, names=['idle','walk','punch','kick','jump','block','charge','hit','death','cast']){
  const out = {};
  const log = [];
  for(const n of names){
    let found = false;
    for(const ext of ['fbx','glb']){
      const url = `models/${id}_anims/${n}.${ext}`;
      try{
        const head = await fetch(url, { method:'HEAD' });
        const ct = head.headers.get('content-type')||'';
        if(head.ok && !ct.includes('text/html')){
          out[n] = await loadClip(url, n);
          log.push(`✓ ${n}.${ext}`);
          found = true;
          break;
        }
      }catch(_){}
    }
    if(!found) log.push(`✗ ${n} (not found)`);
  }
  return { clips: out, log };
}

export function indexClips(clipArray){
  const map = {};
  (clipArray||[]).forEach(c=>{ map[c.name.toLowerCase()] = c; });
  return map;
}

export function resolveClip(clipMap, logical){
  const candidates = STATE_CLIP[logical] || [logical];
  for(const name of candidates){
    if(clipMap[name]) return clipMap[name];
    const hit = Object.keys(clipMap).find(k=>k.includes(name));
    if(hit) return clipMap[hit];
  }
  // Fallback: if we have ANY clips but none matched by name (e.g. a single
  // Mixamo clip literally named "mixamo.com"), use the first one for idle/walk
  // so the model at least moves instead of staying in T-pose.
  const keys = Object.keys(clipMap);
  if(keys.length && (logical==='idle' || logical==='walk')){
    return clipMap[keys[0]];
  }
  return null;
}
