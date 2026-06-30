import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { makeCelMaterial, makeOutlineMaterial } from '../game/materials.js';
import { indexClips, resolveClip, retargetClip, collectBoneNames } from './animations.js';

const SECONDS_PER_LINE = 1.6;   // each subtitle line shows this long

// builds a face-framed 3D view of one fighter that plays a clip and slow-pans
function CutsceneFighter({ def, customObject, extraClips }){
  const rig = useRef();
  const ctrl = useRef({ action:null });

  const built = useMemo(()=>{
    if(!customObject){
      // simple stand-in head if no model: a glowing sphere
      const g = new THREE.Group();
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.7,24,18),
        makeCelMaterial(def.body, def.rim));
      head.position.y = 2.0; g.add(head);
      return { obj:g, mixer:null, clipMap:{} };
    }
    const cloned = skeletonClone(customObject);
    const outline = makeOutlineMaterial(0.02, true);
    // collect meshes FIRST, then mutate — adding a shell inside traverse()
    // makes traverse re-visit the shell forever (stack overflow / black screen).
    const meshes=[];
    cloned.traverse(o=>{ if((o.isMesh || o.isSkinnedMesh) && !o.userData.isOutline) meshes.push(o); });
    for(const o of meshes){
      const src = Array.isArray(o.material)?o.material[0]:o.material;
      const toon = new THREE.MeshToonMaterial({ map:src&&src.map?src.map:null,
        color:src&&src.color?src.color.clone():new THREE.Color(...def.body) });
      if(toon.map) toon.map.colorSpace = THREE.SRGBColorSpace;
      o.material = toon;
      if(o.isSkinnedMesh){ const sh=new THREE.SkinnedMesh(o.geometry, outline); sh.bind(o.skeleton,o.bindMatrix); sh.userData.isOutline=true; o.add(sh); }
    }
    // normalize size/stand
    const box=new THREE.Box3().setFromObject(cloned); const size=new THREE.Vector3(); box.getSize(size);
    const h=(isFinite(size.y)&&size.y>0.001)?size.y:1; cloned.scale.multiplyScalar(2.6/h);
    const box2=new THREE.Box3().setFromObject(cloned); if(isFinite(box2.min.y)) cloned.position.y-=box2.min.y;

    const boneNames = collectBoneNames(cloned);
    const raw = [...(customObject.userData.animations||[]), ...(extraClips||[])];
    const clips = raw.map(c=>retargetClip(c, boneNames));
    let mixer=null, clipMap={};
    if(clips.length){ mixer=new THREE.AnimationMixer(cloned); clipMap=indexClips(clips); }
    return { obj:cloned, mixer, clipMap };
  }, [customObject, def, extraClips]);

  useEffect(()=>{
    if(!built.mixer) return;
    // prefer the character's intro pose clip, else charge/idle
    const clip = resolveClip(built.clipMap, def.intro?.pose||'charge')
              || resolveClip(built.clipMap, 'idle');
    if(clip){ const a=built.mixer.clipAction(clip); a.reset().play(); ctrl.current.action=a; }
  }, [built, def]);

  useFrame((_, dt)=>{
    if(built.mixer) built.mixer.update(dt);
    if(rig.current) rig.current.rotation.y += dt*0.15; // slow turn
  });

  return <group ref={rig}><primitive object={built.obj} /></group>;
}

// slow dolly-in on the face
function CutsceneCamera(){
  const { camera } = useThree();
  const t = useRef(0);
  useFrame((_, dt)=>{
    t.current += dt;
    const z = 4.4 - Math.min(t.current,3)*0.35;   // ease in
    camera.position.set(Math.sin(t.current*0.3)*0.4, 2.1, z);
    camera.lookAt(0, 2.0, 0);
  });
  return null;
}

// One fighter's intro beat. onComplete fires when its lines are done.
function IntroBeat({ def, customObject, extraClips, onComplete }){
  const lines = def.intro?.lines || [`${def.name} enters the arena.`];
  const [lineIdx, setLineIdx] = useState(0);

  // play this fighter's voice clip once at the start of their beat
  useEffect(()=>{
    const a = new Audio(`audio/voice/${def.id}.mp3`);  // swappable; missing = silent
    a.volume = 0.9;
    a.play().catch(()=>{});
    return ()=>{ try{ a.pause(); }catch(_){} };
  }, [def.id]);

  useEffect(()=>{
    const id = setTimeout(()=>{
      if(lineIdx < lines.length-1) setLineIdx(i=>i+1);
      else onComplete();
    }, SECONDS_PER_LINE*1000);
    return ()=>clearTimeout(id);
  }, [lineIdx]);

  return (
    <>
      <Canvas camera={{ fov:34, position:[0,2.1,4.4] }} gl={{ antialias:true }}
        style={{ position:'absolute', inset:0 }}>
        <hemisphereLight args={['#cfe0ff','#221133', 1.1]} />
        <directionalLight position={[3,5,4]} intensity={2.2} />
        <directionalLight position={[-3,2,-2]} intensity={0.8} color="#88aaff" />
        <CutsceneFighter def={def} customObject={customObject} extraClips={extraClips} />
        <CutsceneCamera />
      </Canvas>
      <div className="cut-vignette" />
      <div className="cut-namebar" style={{ color:`rgb(${def.ki.map(v=>v*255|0).join(',')})` }}>{def.name}</div>
      <div className="cut-subtitle">{lines[lineIdx]}</div>
    </>
  );
}

// Plays both fighters' intros in sequence, then calls onDone.
export default function CutsceneIntro({ p1Def, p2Def, customModels, customClips, onDone }){
  const [which, setWhich] = useState(0); // 0 = p1, 1 = p2
  const defs = [p1Def, p2Def];
  const def = defs[which];

  function nextBeat(){
    if(which < 1) setWhich(1);
    else onDone();
  }

  return (
    <div className="screen cutscene-screen">
      <IntroBeat key={which} def={def}
        customObject={customModels[def.id]}
        extraClips={customClips && customClips[def.id]}
        onComplete={nextBeat} />
      <button className="cut-skip" onClick={onDone}>SKIP ▶▶</button>
      <div className="cut-progress">
        <span className={which===0?'on':''} />
        <span className={which===1?'on':''} />
      </div>
    </div>
  );
}
