import React, { useState, useRef, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { STAGES } from '../game/roster.js';
import Stage from './Stage.jsx';

// auto-frames the camera on whatever the stage group contains
function AutoFrame({ targetRef }){
  const { camera, controls } = useThree();
  useEffect(()=>{
    const id=setTimeout(()=>{
      if(!targetRef.current) return;
      const box=new THREE.Box3().setFromObject(targetRef.current);
      if(box.isEmpty()) return;
      const size=new THREE.Vector3(); box.getSize(size);
      const center=new THREE.Vector3(); box.getCenter(center);
      const maxDim=Math.max(size.x, size.y, size.z) || 30;
      camera.position.set(center.x+maxDim*0.7, center.y+maxDim*0.5, center.z+maxDim*0.9);
      camera.lookAt(center);
      if(controls){ controls.target.copy(center); controls.update(); }
    }, 120);
    return ()=>clearTimeout(id);
  });
  return null;
}

function StagePreview({ id, customStage }){
  const groupRef=useRef();
  return (
    <Canvas shadows camera={{ fov:50, position:[0,12,40] }} gl={{ antialias:true }}
      style={{ width:'100%', height:'100%' }}>
      <hemisphereLight args={['#8899ff','#332244', 0.9]} />
      <directionalLight position={[8,16,6]} intensity={2.0} castShadow />
      <group ref={groupRef}>
        <Stage id={id} customObject={customStage} />
      </group>
      <OrbitControls makeDefault enablePan={false} autoRotate autoRotateSpeed={0.5}
        minPolarAngle={Math.PI*0.15} maxPolarAngle={Math.PI*0.49} />
      <AutoFrame targetRef={groupRef} />
    </Canvas>
  );
}

export default function StageSelect({ onDone, onBack, customStages }){
  const [sel,setSel]=useState('wasteland');
  return (
    <div className="screen select-bg stage-page">
      <div className="seltitle">SELECT STAGE</div>

      <div className="stage-preview">
        {/* key forces a clean preview remount when switching stages */}
        <StagePreview key={sel + (customStages[sel]?'-c':'')} id={sel} customStage={customStages[sel]} />
        <div className="stage-preview-label">
          {STAGES.find(s=>s.id===sel)?.label}{customStages[sel] ? '  · CUSTOM' : ''}
        </div>
      </div>

      <div className="stage-cards">
        {STAGES.map(s=>(
          <div key={s.id} className={`stage-card${sel===s.id?' sel':''}`} onClick={()=>setSel(s.id)}>
            <div className="stage-card-thumb" data-stage={s.id} />
            <div className="stage-card-name">{s.label}</div>
            {customStages[s.id] && <div className="stage-card-tag">CUSTOM</div>}
          </div>
        ))}
      </div>

      <div className="sel-actions stage-actions">
        <button className="startbtn ghost-btn" onClick={onBack}>← BACK</button>
        <button className="startbtn" onClick={()=>onDone(sel)}>START BATTLE</button>
      </div>
    </div>
  );
}
