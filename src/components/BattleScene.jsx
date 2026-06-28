import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import Stage from './Stage.jsx';
import FighterModel from './FighterModel.jsx';
import Particles from './Particles.jsx';
import Projectiles from './Projectiles.jsx';

const STEP=1/60;
const clamp=(x,a,b)=>x<a?a:x>b?b:x;

export default function BattleScene({ world, stageId, customModels, customStage, customClips, onEnd }){
  const accRef=useRef(0);
  const endedRef=useRef(false);
  const camTarget=useRef(new THREE.Vector3(0,2,0));
  const camPos=useRef(new THREE.Vector3(0,5,18));
  const { camera } = useThree();
  const kiL1=useRef(); const kiL2=useRef();

  useFrame((state, delta)=>{
    let dt=Math.min(delta, 0.1);
    accRef.current += dt;
    let steps=0;
    while(accRef.current >= STEP){
      accRef.current -= STEP;
      world.update(STEP);
      if(++steps>5){ accRef.current=0; break; }
    }
    if(world.done && !endedRef.current){ endedRef.current=true; onEnd && onEnd(world.winner); }

    // dynamic camera
    const [a,b]=world.fighters;
    const mid=(a.pos.x+b.pos.x)/2, sep=Math.abs(a.pos.x-b.pos.x);
    const dist=clamp(13+sep*0.55, 13, 28);
    camTarget.current.lerp(new THREE.Vector3(mid*0.6, 2.4, 0), 1-Math.pow(0.001, dt));
    camPos.current.lerp(new THREE.Vector3(mid*0.5, 4.2+sep*0.1, dist), 1-Math.pow(0.0016, dt));
    camera.position.set(camPos.current.x+world.shake.x, camPos.current.y+world.shake.y, camPos.current.z);
    camera.lookAt(camTarget.current);

    // ki lights track fighters
    if(kiL1.current){ kiL1.current.position.set(a.pos.x, a.pos.y+1.4, a.pos.z);
      kiL1.current.color.setRGB(...a.kiColor);
      kiL1.current.intensity = THREE.MathUtils.lerp(kiL1.current.intensity, (a.transformed||a.state===8)?8:1.5, 0.1); }
    if(kiL2.current){ kiL2.current.position.set(b.pos.x, b.pos.y+1.4, b.pos.z);
      kiL2.current.color.setRGB(...b.kiColor);
      kiL2.current.intensity = THREE.MathUtils.lerp(kiL2.current.intensity, (b.transformed||b.state===8)?8:1.5, 0.1); }
  });

  return (
    <>
      <hemisphereLight args={['#8899ff','#332244', 0.9]} />
      <directionalLight
        position={[8,16,6]} intensity={2.2} castShadow
        shadow-mapSize-width={1024} shadow-mapSize-height={1024}
        shadow-camera-left={-30} shadow-camera-right={30}
        shadow-camera-top={30} shadow-camera-bottom={-30}
        shadow-camera-near={1} shadow-camera-far={80}
      />
      <pointLight ref={kiL1} distance={14} intensity={1.5} />
      <pointLight ref={kiL2} distance={14} intensity={1.5} />

      <Stage id={stageId} customObject={customStage} />
      {world.fighters.map((f,i)=>(
        <FighterModel key={i} fighter={f} customObject={customModels[f.def.id]}
          extraClips={customClips && customClips[f.def.id]} />
      ))}
      <Projectiles world={world} />
      <Particles world={world} />
    </>
  );
}
