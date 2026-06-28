import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Renders the World.particles pool as instanced additive billboards.
export default function Particles({ world }){
  const meshRef=useRef();
  const max=world.particles.max;

  const { geometry, material } = useMemo(()=>{
    const geo=new THREE.PlaneGeometry(1,1);
    const col=new Float32Array(max*3), siz=new Float32Array(max), lif=new Float32Array(max);
    geo.setAttribute('iColor', new THREE.InstancedBufferAttribute(col,3));
    geo.setAttribute('iSize', new THREE.InstancedBufferAttribute(siz,1));
    geo.setAttribute('iLife', new THREE.InstancedBufferAttribute(lif,1));
    const mat=new THREE.ShaderMaterial({
      transparent:true, depthWrite:false, blending:THREE.AdditiveBlending,
      vertexShader:`
        attribute vec3 iColor; attribute float iSize; attribute float iLife;
        varying vec2 vUv; varying vec3 vCol; varying float vLife;
        void main(){
          vUv=uv; vCol=iColor; vLife=iLife;
          vec3 cpos=(modelViewMatrix*instanceMatrix*vec4(0.0,0.0,0.0,1.0)).xyz;
          float s=iSize*(0.4+0.6*iLife);
          vec3 p=cpos+vec3(position.x*s, position.y*s, 0.0);
          gl_Position=projectionMatrix*vec4(p,1.0);
        }`,
      fragmentShader:`
        varying vec2 vUv; varying vec3 vCol; varying float vLife;
        void main(){ float r=length(vUv-0.5)*2.0; float a=smoothstep(1.0,0.0,r); a*=a;
          gl_FragColor=vec4(vCol*a*vLife*1.6, a*vLife); }`,
    });
    return { geometry:geo, material:mat };
  }, [max]);

  const tmp=useMemo(()=>new THREE.Matrix4(), []);

  useFrame(()=>{
    const m=meshRef.current; if(!m) return;
    const P=world.particles;
    const cAttr=geometry.attributes.iColor, sAttr=geometry.attributes.iSize, lAttr=geometry.attributes.iLife;
    for(let i=0;i<max;i++){
      if(P.life[i]<=0){ tmp.makeScale(0,0,0); m.setMatrixAt(i,tmp); lAttr.array[i]=0; continue; }
      tmp.makeTranslation(P.pos[i*3], P.pos[i*3+1], P.pos[i*3+2]); m.setMatrixAt(i,tmp);
      cAttr.array[i*3]=P.col[i*3]; cAttr.array[i*3+1]=P.col[i*3+1]; cAttr.array[i*3+2]=P.col[i*3+2];
      sAttr.array[i]=P.size[i]; lAttr.array[i]=P.life[i];
    }
    m.instanceMatrix.needsUpdate=true;
    cAttr.needsUpdate=true; sAttr.needsUpdate=true; lAttr.needsUpdate=true;
  });

  return <instancedMesh ref={meshRef} args={[geometry, material, max]} frustumCulled={false} />;
}
