import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const MAX=24;

// Renders active projectiles from world.projectiles as glowing spheres.
export default function Projectiles({ world }){
  const refs=useRef([]);
  useFrame(()=>{
    const ps=world.projectiles;
    for(let i=0;i<MAX;i++){
      const mesh=refs.current[i]; if(!mesh) continue;
      const p=ps[i];
      if(p && p.kind!=='beam'){
        mesh.visible=true;
        mesh.position.set(p.pos.x, p.pos.y, p.pos.z);
        mesh.scale.setScalar(p.r);
        mesh.material.color.setRGB(...p.col);
      } else mesh.visible=false;
    }
  });
  return (
    <group>
      {Array.from({length:MAX}).map((_,i)=>(
        <mesh key={i} ref={el=>refs.current[i]=el} visible={false}>
          <sphereGeometry args={[1,16,12]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
    </group>
  );
}
