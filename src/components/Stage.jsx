import React, { useMemo } from 'react';
import * as THREE from 'three';

const rand=(a,b)=>a+Math.random()*(b-a);
const TAU=Math.PI*2;

// Render a user-supplied GLB/FBX stage, auto-scaled so the play area (~90 units
// wide) sits on its surface. Fighters move in x roughly -46..46.
function CustomStage({ object }){
  const prepared=useMemo(()=>{
    const root=object.clone(true);
    // fit the stage so it's about 120 units across (covers the fight area + margin)
    const box=new THREE.Box3().setFromObject(root);
    const size=new THREE.Vector3(); box.getSize(size);
    const span=Math.max(size.x, size.z) || 1;
    const s=120/span;
    root.scale.multiplyScalar(s);
    const box2=new THREE.Box3().setFromObject(root);
    // put the stage's top surface near y=0 (where fighters stand)
    root.position.y -= box2.max.y;
    root.traverse(o=>{ if(o.isMesh){ o.receiveShadow=true; o.castShadow=true; } });
    return root;
  }, [object]);
  return (
    <group>
      <color attach="background" args={['#1a1f33']} />
      <fog attach="fog" args={['#1a1f33', 60, 200]} />
      <primitive object={prepared} />
    </group>
  );
}

function Rocks({ color, count, area }){
  const meshes=useMemo(()=>{
    const arr=[];
    for(let i=0;i<count;i++){
      const s=rand(0.6,3.2);
      const geo=new THREE.IcosahedronGeometry(s,0);
      const pos=geo.attributes.position;
      for(let k=0;k<pos.count;k++) pos.setXYZ(k, pos.getX(k)*rand(.7,1.2), pos.getY(k)*rand(.6,1.3), pos.getZ(k)*rand(.7,1.2));
      geo.computeVertexNormals();
      const a=rand(0,TAU), r=rand(area*0.4,area);
      arr.push({ geo, pos:[Math.cos(a)*r, s*0.3, Math.sin(a)*r], rot:rand(0,TAU) });
    }
    return arr;
  }, [count, area]);
  return meshes.map((m,i)=>(
    <mesh key={i} geometry={m.geo} position={m.pos} rotation={[0,m.rot,0]} castShadow receiveShadow>
      <meshStandardMaterial color={color} flatShading roughness={1} />
    </mesh>
  ));
}

export default function Stage({ id, customObject }){
  if(customObject) return <CustomStage object={customObject} />;
  if(id==='lava'){
    const rings=useMemo(()=>Array.from({length:8},()=>({ r:rand(8,40), w:rand(0.4,1.4) })),[]);
    return (
      <group>
        <color attach="background" args={['#3a1408']} />
        <fog attach="fog" args={['#5a1604', 30, 95]} />
        <mesh rotation={[-Math.PI/2,0,0]} receiveShadow>
          <circleGeometry args={[60,64]} />
          <meshStandardMaterial color="#331a14" roughness={1} emissive="#441100" emissiveIntensity={0.3} />
        </mesh>
        {rings.map((ring,i)=>(
          <mesh key={i} rotation={[-Math.PI/2,0,0]} position={[0,0.05,0]}>
            <ringGeometry args={[ring.r, ring.r+ring.w, 32]} />
            <meshBasicMaterial color="#ff5511" side={THREE.DoubleSide} transparent opacity={0.85} />
          </mesh>
        ))}
        <mesh position={[-40,18,-55]}>
          <coneGeometry args={[28,40,24]} />
          <meshStandardMaterial color="#2a1208" flatShading roughness={1} />
        </mesh>
        <Rocks color="#221008" count={20} area={52} />
      </group>
    );
  }
  if(id==='island'){
    const trees=useMemo(()=>Array.from({length:14},()=>{ const a=rand(0,TAU), r=rand(28,52);
      return { pos:[Math.cos(a)*r,0,Math.sin(a)*r] }; }),[]);
    return (
      <group>
        <color attach="background" args={['#7ec8ff']} />
        <fog attach="fog" args={['#9fd8ff', 60, 160]} />
        <mesh rotation={[-Math.PI/2,0,0]} receiveShadow>
          <circleGeometry args={[60,64]} />
          <meshStandardMaterial color="#4f9e3a" roughness={1} />
        </mesh>
        <mesh rotation={[-Math.PI/2,0,0]} position={[0,-1.2,0]}>
          <circleGeometry args={[400,48]} />
          <meshStandardMaterial color="#2a7fd0" roughness={0.3} metalness={0.1} transparent opacity={0.95} />
        </mesh>
        {trees.map((t,i)=>(
          <group key={i} position={t.pos}>
            <mesh position={[0,2,0]} castShadow><cylinderGeometry args={[0.4,0.6,4,6]} /><meshStandardMaterial color="#6b4a2a" roughness={1} /></mesh>
            <mesh position={[0,5,0]} castShadow><icosahedronGeometry args={[2.4,0]} /><meshStandardMaterial color="#2f7a2a" flatShading roughness={1} /></mesh>
          </group>
        ))}
        <Rocks color="#6b6050" count={8} area={50} />
      </group>
    );
  }
  // wasteland
  return (
    <group>
      <color attach="background" args={['#2a3550']} />
      <fog attach="fog" args={['#2a3550', 40, 110]} />
      <mesh rotation={[-Math.PI/2,0,0]} receiveShadow>
        <circleGeometry args={[60,64]} />
        <meshStandardMaterial color="#6b5a44" roughness={1} />
      </mesh>
      <Rocks color="#5a4a38" count={24} area={52} />
    </group>
  );
}
