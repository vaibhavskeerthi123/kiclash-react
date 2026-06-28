import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import * as THREE from 'three';
import { makeCelMaterial, makeTexturedCelMaterial, makeOutlineMaterial } from '../game/materials.js';

function readSource(mat){
  const m = Array.isArray(mat) ? mat[0] : mat;
  if(!m) return { map:null, color:[1,1,1], vcol:false };
  return { map:m.map||null, color:m.color?[m.color.r,m.color.g,m.color.b]:[1,1,1], vcol:!!m.vertexColors };
}

// zoomed-in 3D portrait, framed on the upper body / face. Keeps real textures.
function PortraitModel({ def, customObject }){
  const ref=useRef();
  const outlineMat = useMemo(()=>makeOutlineMaterial(0.02), [def.id]);
  const outlineMatSkinned = useMemo(()=>makeOutlineMaterial(0.02, true), [def.id]);

  const obj = useMemo(()=>{
    if(customObject){
      const clone=skeletonClone(customObject);
      const adjust=def.modelAdjust||{};
      const orient=new THREE.Group(); orient.add(clone);
      clone.rotation.x += adjust.rotX||0; clone.rotation.y += adjust.rotY||0; clone.rotation.z += adjust.rotZ||0;
      clone.updateMatrixWorld(true);
      if(adjust.autoStand!==false){
        const b=new THREE.Box3().setFromObject(clone); const s=new THREE.Vector3(); b.getSize(s);
        if(s.z>s.y*1.5 && s.z>=s.x) clone.rotation.x-=Math.PI/2;
        else if(s.x>s.y*1.5 && s.x>s.z) clone.rotation.z+=Math.PI/2;
        clone.updateMatrixWorld(true);
      }
      const meshes=[]; clone.traverse(o=>{ if(o.isMesh||o.isSkinnedMesh) meshes.push(o); });
      meshes.forEach(o=>{
        const src = Array.isArray(o.material) ? o.material[0] : o.material;
        const toon = new THREE.MeshToonMaterial({
          map: src && src.map ? src.map : null,
          color: src && src.color ? src.color.clone() : new THREE.Color(...def.body),
        });
        if(toon.map){ toon.map.colorSpace = THREE.SRGBColorSpace; toon.map.needsUpdate=true; }
        // if no texture, tint with the fighter body color so it's not plain white
        if(!toon.map && !(src && src.color)) toon.color.setRGB(...def.body);
        o.material = toon;
        o.geometry.computeVertexNormals && o.geometry.computeVertexNormals();
        if(o.isSkinnedMesh){ const sh=new THREE.SkinnedMesh(o.geometry, outlineMatSkinned); sh.bind(o.skeleton,o.bindMatrix); o.add(sh); }
        else { const sh=new THREE.Mesh(o.geometry, outlineMat); o.add(sh); }
      });
      const box=new THREE.Box3().setFromObject(orient); const size=new THREE.Vector3(); box.getSize(size);
      const h=(isFinite(size.y)&&size.y>0.0001)?size.y:1; orient.scale.multiplyScalar(2.5/h);
      const box2=new THREE.Box3().setFromObject(orient);
      const top=box2.max.y, faceY=top-0.45;
      orient.position.y -= faceY;
      return orient;
    }
    // fallback orb when no model assigned
    const g=new THREE.Group();
    const sphere=new THREE.Mesh(new THREE.SphereGeometry(0.7,20,16), makeCelMaterial(def.body, def.rim));
    g.add(sphere);
    return g;
  }, [customObject, outlineMat, outlineMatSkinned, def.id]);

  useFrame((state,delta)=>{ if(ref.current) ref.current.rotation.y += delta*0.6; });
  return <group ref={ref}><primitive object={obj} /></group>;
}

export default function CharacterPortrait({ def, customObject }){
  return (
    <Canvas camera={{ fov:32, position:[0,0,4] }} gl={{ antialias:true, alpha:true }}
      style={{ width:'100%', height:'100%' }}>
      <hemisphereLight args={['#cfe0ff','#332244', 1.1]} />
      <directionalLight position={[3,5,4]} intensity={2.0} />
      <PortraitModel def={def} customObject={customObject} />
    </Canvas>
  );
}
