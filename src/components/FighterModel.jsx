import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import * as THREE from 'three';
import { makeCelMaterial, makeTexturedCelMaterial, makeOutlineMaterial } from '../game/materials.js';
import { ST } from '../game/roster.js';
import { findBones, poseBones } from './skeleton.js';
import { indexClips, resolveClip, retargetClip, collectBoneNames } from './animations.js';

const clamp=(x,a,b)=>x<a?a:x>b?b:x;

// ---- built-in primitive humanoid (flat tint; only when no model file) ----
function buildPrimitive(hair, material, outlineMat){
  const g=new THREE.Group();
  const box=(w,h,d)=>new THREE.BoxGeometry(w,h,d);
  const add=(geo,x,y,z,sx,sy,sz)=>{
    const m=new THREE.Mesh(geo, material); m.position.set(x,y,z);
    if(sx) m.scale.set(sx,sy,sz); m.castShadow=true;
    const shell=new THREE.Mesh(geo, outlineMat); m.add(shell);
    g.add(m); return m;
  };
  add(box(0.62,0.78,0.34),0,1.30,0); add(box(0.40,0.22,0.30),0,0.84,0);
  add(new THREE.SphereGeometry(0.30,12,10),0,2.02,0);
  add(box(0.17,0.50,0.17),-0.46,1.40,0); add(box(0.15,0.46,0.15),-0.50,0.95,0);
  add(new THREE.SphereGeometry(0.12,8,6),-0.51,0.70,0);
  add(box(0.17,0.50,0.17),0.46,1.40,0); add(box(0.15,0.46,0.15),0.50,0.95,0);
  add(new THREE.SphereGeometry(0.12,8,6),0.51,0.70,0);
  add(box(0.20,0.55,0.22),-0.16,0.45,0); add(box(0.18,0.50,0.20),-0.16,-0.05,0);
  add(box(0.22,0.14,0.34),-0.16,-0.34,0.04);
  add(box(0.20,0.55,0.22),0.16,0.45,0); add(box(0.18,0.50,0.20),0.16,-0.05,0);
  add(box(0.22,0.14,0.34),0.16,-0.34,0.04);
  if(hair==='spiky'){ [[0,.78,-.02,.9,1.4],[-.22,.74,0,.7,1.1],[.22,.74,0,.7,1.1],
      [-.13,.75,-.18,.6,1.0],[.13,.75,-.18,.6,1.0],[0,.7,.2,.6,.9]]
    .forEach(t=>add(box(0.18,0.5,0.18),t[0],2.30+t[1]*.2,t[2],t[3],t[4],t[3])); }
  else if(hair==='flat'){ add(box(0.56,0.30,0.5),0,2.22,-0.02); add(box(0.5,0.18,0.46),0,2.05,-0.16); }
  else { [[0,.85,-.05,1.0,1.6],[-.3,.7,-.02,.8,1.1],[.3,.7,-.02,.8,1.1],[0,.65,.22,.7,1.0]]
    .forEach(t=>add(box(0.2,0.5,0.2),t[0],2.30+t[1]*.2,t[2],t[3],t[4],t[3])); }
  return g;
}

function readSource(mat){
  const m = Array.isArray(mat) ? mat[0] : mat;
  if(!m) return { map:null, color:[1,1,1], vcol:false };
  return { map:m.map||null, color:m.color?[m.color.r,m.color.g,m.color.b]:[1,1,1], vcol:!!m.vertexColors };
}

function prepLoadedModel(root, rim, adjust={}){
  const orient = new THREE.Group();
  orient.add(root);
  root.rotation.x += adjust.rotX || 0;
  root.rotation.y += adjust.rotY || 0;
  root.rotation.z += adjust.rotZ || 0;
  root.updateMatrixWorld(true);
  if(adjust.autoStand !== false){
    const box = new THREE.Box3().setFromObject(root);
    const size = new THREE.Vector3(); box.getSize(size);
    if(size.z > size.y*1.5 && size.z >= size.x){ root.rotation.x -= Math.PI/2; }
    else if(size.x > size.y*1.5 && size.x > size.z){ root.rotation.z += Math.PI/2; }
    root.updateMatrixWorld(true);
  }
  const outlineMat = makeOutlineMaterial(0.03);
  const outlineMatSkinned = makeOutlineMaterial(0.03, true);
  const celMats=[];          // our convertible materials we drive each frame
  const toonMats=[];         // MeshToonMaterial instances that keep real textures
  const meshes=[];
  root.traverse(o=>{ if(o.isMesh || o.isSkinnedMesh) meshes.push(o); });
  for(const o of meshes){
    const src = Array.isArray(o.material) ? o.material[0] : o.material;
    // Build a toon material that REUSES the model's own texture + color so the
    // real skin/clothing texture shows. (MeshToonMaterial auto-skins on a
    // SkinnedMesh; passing a 'skinning' flag is invalid in r160 and breaks it.)
    const toon = new THREE.MeshToonMaterial({
      map: src && src.map ? src.map : null,
      color: src && src.color ? src.color.clone() : new THREE.Color(0xffffff),
    });
    if(toon.map){ toon.map.colorSpace = THREE.SRGBColorSpace; toon.map.needsUpdate = true; }
    toon.gradientMap = makeToonGradient();
    o.material = toon;
    toonMats.push({ mat:toon, hadTexture: !!(src && src.map) });
    o.castShadow = true; o.receiveShadow = true;
    if(o.geometry.attributes.normal == null && o.geometry.computeVertexNormals) o.geometry.computeVertexNormals();
    if(o.isSkinnedMesh){
      // skinned outline shell that deforms with the same skeleton
      const shell = new THREE.SkinnedMesh(o.geometry, outlineMatSkinned);
      shell.bind(o.skeleton, o.bindMatrix); shell.userData.isOutline=true; o.add(shell);
    } else {
      const shell = new THREE.Mesh(o.geometry, outlineMat); shell.userData.isOutline=true; o.add(shell);
    }
  }
  const box=new THREE.Box3().setFromObject(orient);
  const size=new THREE.Vector3(); box.getSize(size);
  const h=(isFinite(size.y) && size.y>0.0001)?size.y:1;
  const s=(2.5/h)*(adjust.scale||1);
  orient.scale.multiplyScalar(s);
  const box2=new THREE.Box3().setFromObject(orient);
  if(isFinite(box2.min.y)) orient.position.y -= box2.min.y;
  orient.position.y += (adjust.yOffset||0);
  return { root:orient, celMats, toonMats };
}

// 4-step grayscale gradient -> MeshToonMaterial reads this for hard cel banding
let _toonGrad=null;
function makeToonGradient(){
  if(_toonGrad) return _toonGrad;
  // RGBA (RGBFormat was removed in recent three.js)
  const steps=[90,160,215,255];
  const data=new Uint8Array(steps.length*4);
  for(let i=0;i<steps.length;i++){ data[i*4]=steps[i]; data[i*4+1]=steps[i]; data[i*4+2]=steps[i]; data[i*4+3]=255; }
  const tex=new THREE.DataTexture(data, steps.length, 1, THREE.RGBAFormat);
  tex.needsUpdate=true; tex.minFilter=THREE.NearestFilter; tex.magFilter=THREE.NearestFilter;
  _toonGrad=tex; return tex;
}

export function loadFighterModel(url){
  const ext=url.split('.').pop().toLowerCase();
  return new Promise((res,rej)=>{
    if(ext==='glb'||ext==='gltf') new GLTFLoader().load(url, g=>{
      const obj=g.scene; obj.userData.animations=g.animations||[]; res(obj);
    }, undefined, rej);
    else if(ext==='fbx') new FBXLoader().load(url, obj=>{
      obj.userData.animations=obj.animations||[]; res(obj);
    }, undefined, rej);
    else rej(new Error('unsupported: '+ext));
  });
}

// map a fighter state -> logical animation name
function stateToAnim(f){
  switch(f.state){
    case ST.IDLE: return 'idle';
    case ST.WALK: return 'walk';
    case ST.DASH: return 'dash';
    case ST.JUMP: return 'jump';
    case ST.ATK: case ST.AIR_ATK:
      return (f.atkName==='H'||f.atkName==='AIR_H') ? 'kick' : 'punch';
    case ST.BLOCK: return 'block';
    case ST.CHARGE: return 'charge';
    case ST.STAGGER: return 'stagger';
    case ST.KNOCK: return 'knock';
    case ST.SPECIAL:
      if(f.specialKind==='ult') return 'ultimate';
      if(f.specialKind==='rush') return 'punch';
      return 'kiblast';   // ki blast
    case ST.DEAD: return 'dead';
    default: return 'idle';
  }
}

export default function FighterModel({ fighter, customObject, extraClips }){
  const rig=useRef();
  const inner=useRef();

  const prim = useMemo(()=>({
    material: makeCelMaterial(fighter.color, fighter.rimColor),
    outlineMat: makeOutlineMaterial(0.035),
  }), [fighter.def.id]);

  const built = useMemo(()=>{
    if(customObject){
      const cloned = skeletonClone(customObject);
      const { root, celMats, toonMats } = prepLoadedModel(cloned, fighter.rimColor, fighter.def.modelAdjust||{});
      const skel = findBones(root);
      const boneNames = collectBoneNames(root);
      const embedded = customObject.userData.animations || [];
      const external = extraClips || [];
      // If we have properly-named external clips (idle, punch, ...), use those and
      // drop the model's embedded generic "mixamo.com" clip so it can't shadow them.
      const namedExternal = external.filter(c=>c && c.name && c.name.toLowerCase()!=='mixamo.com');
      const usableEmbedded = namedExternal.length
        ? embedded.filter(c=>c.name && c.name.toLowerCase()!=='mixamo.com')
        : embedded;
      const rawClips = [...usableEmbedded, ...external];
      const allClips = rawClips.map(c=>retargetClip(c, boneNames));
      const diag = allClips.map(c=>`${c.name}:${c.userData.retargetedTracks}/${c.userData.originalTracks}`);
      let mixer=null, clipMap={};
      if(allClips.length){
        mixer = new THREE.AnimationMixer(root);
        clipMap = indexClips(allClips);
      }
      if(allClips.length && !customObject.userData._loggedAnim){
        customObject.userData._loggedAnim = true;
        console.log(`[anim] ${fighter.def.id}: bones=${boneNames.size}, clips=`, diag);
      }
      // expose for the on-screen debug readout
      if(typeof window!=='undefined'){
        window.__animDiag = window.__animDiag || {};
        window.__animDiag[fighter.def.id] = { bones:boneNames.size, clips:diag,
          clipCount:allClips.length, bound: allClips.some(c=>c.userData.retargetedTracks>0) };
      }
      return { obj:root, celMats, toonMats, skel, mixer, clipMap, hasClips:allClips.length>0,
        animDiag:{ bones:boneNames.size, clips:diag } };
    }
    return { obj:buildPrimitive(fighter.def.hair, prim.material, prim.outlineMat),
      celMats:[prim.material], toonMats:[], skel:null, mixer:null, clipMap:{}, hasClips:false, animDiag:null };
  }, [customObject, prim, fighter.def.hair, fighter.def.id, extraClips]);

  // animation controller: crossfade between actions
  const ctrl = useRef({ current:null, action:null });
  function playAnim(logical){
    const { mixer, clipMap }=built;
    if(!mixer) return;
    if(ctrl.current.current===logical) return;
    const clip = resolveClip(clipMap, logical);
    if(!clip) return;
    const next = mixer.clipAction(clip);
    next.reset();
    // one-shot actions for attacks/hits; loop for idle/walk/etc.
    const oneShot = ['punch','kick','special','stagger','knock','dead','jump'].includes(logical);
    next.setLoop(oneShot ? THREE.LoopOnce : THREE.LoopRepeat);
    next.clampWhenFinished = oneShot;
    next.enabled = true; next.setEffectiveWeight(1).fadeIn(0.12).play();
    if(ctrl.current.action) ctrl.current.action.fadeOut(0.12);
    ctrl.current.action = next;
    ctrl.current.current = logical;
  }

  useEffect(()=>{ if(built.mixer) playAnim('idle'); /* prime idle */ }, [built]);

  function setUniform(name, setter){
    for(const m of built.celMats){ if(m.uniforms && m.uniforms[name]) setter(m.uniforms[name]); }
  }
  // drive MeshToonMaterials (imported models) for hit-flash + transform glow
  const _white=new THREE.Color(1,1,1);
  function driveToon(f){
    if(!built.toonMats || !built.toonMats.length) return;
    const ki=f.kiColor;
    for(const { mat, hadTexture } of built.toonMats){
      // hit flash: briefly push emissive white
      const flash=f.flashHit*0.8;
      // transform / charge: emit a ki glow (pulsing during charge to feel alive)
      const pulse=0.85+0.15*Math.sin(performance.now()*0.012);
      const glow=(f.transformed?0.42:(f.state===ST.CHARGE?0.38*pulse:0));
      mat.emissive.setRGB(ki[0]*glow + flash, ki[1]*glow + flash, ki[2]*glow + flash);
      // if a model has NO texture, tint it with the body color so it's not plain white
      if(!hadTexture){ mat.color.setRGB(...f.color); }
    }
  }

  useFrame((state, delta)=>{
    const f=fighter;
    if(rig.current){
      rig.current.position.set(f.pos.x, f.pos.y, f.pos.z);
      rig.current.rotation.y = f.facing>0 ? Math.PI/2 : -Math.PI/2;
    }
    // custom-shader path (primitive fallback only)
    setUniform('uColor', u=>u.value.setRGB(...f.color));
    setUniform('uRim', u=>u.value.setRGB(...f.rimColor));
    setUniform('uFlash', u=>u.value=f.flashHit*0.7);
    setUniform('uEmissive', u=>u.value=f.transformed?0.5:(f.state===ST.CHARGE?0.3:0));
    setUniform('uRimTint', u=>u.value=(f.transformed||f.state===ST.CHARGE)?1.0:0.0);
    // toon path (imported models with real textures)
    driveToon(f);

    // whole-body pose (subtle weight; reduced when real clips drive the body)
    let lean=0,bob=0,crouch=1,lunge=0,spinX=0; const ph=f.anim; let atkPhase=0;
    switch(f.state){
      case ST.IDLE: bob=Math.sin(ph*3)*0.03; break;
      case ST.WALK: bob=Math.abs(Math.sin(ph*9))*0.06; lean=0.08; break;
      case ST.DASH: lean=0.35; break;
      case ST.ATK: { const tot=f.atk?f.atk.startup+f.atk.active+f.atk.recovery:.3;
        atkPhase=clamp(f.t/tot,0,1); lunge=Math.sin(atkPhase*Math.PI)*0.4; lean=0.15; break; }
      case ST.AIR_ATK: { const tot=f.atk?f.atk.startup+f.atk.active+f.atk.recovery:.3;
        atkPhase=clamp(f.t/tot,0,1); lunge=0.3; spinX=0.25; break; }
      case ST.BLOCK: crouch=0.94; lean=-0.08; break;
      case ST.CHARGE: bob=Math.sin(ph*10)*0.04; crouch=0.96; break;
      case ST.STAGGER: lean=-0.25; break;
      case ST.KNOCK: spinX=f.t*5; break;
      case ST.JUMP: crouch=1.04; break;
      case ST.DEAD: spinX=Math.PI/2; bob=-0.6; break;
      default: break;
    }
    const clipsDrive = built.hasClips;
    if(inner.current){
      // when real clips animate the limbs, keep body offsets gentle so we don't fight them
      const k = clipsDrive ? 0.35 : 1.0;
      inner.current.position.set(0, bob*k, lunge*k);
      inner.current.rotation.x=(lean*0.5+spinX)*k;
      inner.current.scale.set(1, clipsDrive?1:crouch, 1);
    }

    if(built.mixer){
      playAnim(stateToAnim(f));     // crossfade to the right clip
      built.mixer.update(delta);
    } else if(built.skel){
      // procedural fallback when there are bones but no clips
      const offs={};
      const swing=Math.sin(atkPhase*Math.PI);
      const isHeavy=f.atkName==='H'||f.atkName==='AIR_H';
      if(f.state===ST.ATK || f.state===ST.AIR_ATK){
        if(isHeavy){ offs.rThigh=[-1.4*swing,0,0]; offs.rShin=[1.0*swing,0,0];
          offs.lUpperArm=[0,0,0.4*swing]; offs.spine=[0,0.3*swing,0]; }
        else { offs.rUpperArm=[-1.5*swing,0,0]; offs.rForeArm=[-0.3*swing,0,0];
          offs.lUpperArm=[0.5*swing,0,0]; offs.spine=[0,-0.4*swing,0]; }
      } else if(f.state===ST.BLOCK){ offs.rUpperArm=[-0.9,0,0]; offs.lUpperArm=[-0.9,0,0];
        offs.rForeArm=[-1.3,0,0]; offs.lForeArm=[-1.3,0,0]; }
      else if(f.state===ST.CHARGE){ const c=Math.sin(ph*12)*0.1;
        offs.rUpperArm=[0.3+c,0,0.5]; offs.lUpperArm=[0.3+c,0,-0.5]; }
      else if(f.state===ST.WALK){ const w=Math.sin(ph*9);
        offs.rThigh=[0.4*w,0,0]; offs.lThigh=[-0.4*w,0,0];
        offs.rUpperArm=[-0.3*w,0,0]; offs.lUpperArm=[0.3*w,0,0]; }
      else if(f.state===ST.IDLE){ const b=Math.sin(ph*3)*0.05;
        offs.rUpperArm=[b,0,0]; offs.lUpperArm=[-b,0,0]; }
      else if(f.state===ST.SPECIAL){ offs.rUpperArm=[-1.2,0,0]; offs.lUpperArm=[-1.2,0,0];
        offs.rForeArm=[-0.2,0,0]; offs.lForeArm=[-0.2,0,0]; }
      poseBones(built.skel, offs);
    }
  });

  return (
    <group ref={rig}>
      <group ref={inner}>
        <primitive object={built.obj} />
      </group>
    </group>
  );
}
