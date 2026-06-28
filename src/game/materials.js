import * as THREE from 'three';

// Flat-tint cel material (used for the built-in primitive fighters).
export function makeCelMaterial(color, rim){
  return new THREE.ShaderMaterial({
    uniforms:{
      uColor:{ value:new THREE.Color(...color) },
      uRim:{ value:new THREE.Color(...rim) },
      uLightDir:{ value:new THREE.Vector3(0.4,1.0,0.5).normalize() },
      uEmissive:{ value:0.0 },
      uFlash:{ value:0.0 },
    },
    vertexShader:`
      varying vec3 vN; varying vec3 vWorld;
      void main(){
        vec4 w=modelMatrix*vec4(position,1.0);
        vWorld=w.xyz;
        vN=normalize(mat3(modelMatrix)*normal);
        gl_Position=projectionMatrix*viewMatrix*w;
      }`,
    fragmentShader:`
      precision highp float;
      varying vec3 vN; varying vec3 vWorld;
      uniform vec3 uColor,uRim,uLightDir; uniform float uEmissive,uFlash;
      void main(){
        vec3 N=normalize(vN);
        float ndl=dot(N,normalize(uLightDir));
        float t = ndl>0.5 ? 1.0 : (ndl>0.0 ? 0.7 : 0.45);
        vec3 col=uColor*t;
        vec3 V=normalize(cameraPosition-vWorld);
        float rim=pow(1.0-max(dot(N,V),0.0),2.4);
        col += uRim*rim*0.8;
        col += uColor*uEmissive*0.55;
        col = mix(col, vec3(1.0), uFlash);
        gl_FragColor=vec4(col,1.0);
      }`,
  });
}

// Texture-preserving cel material: keeps the model's OWN texture/vertex colors,
// just applies a soft toon ramp + rim glow on top. This is what imported models use
// so their real textures show instead of a flat tint.
export function makeTexturedCelMaterial(map, baseColor, rim, useVertexColors){
  return new THREE.ShaderMaterial({
    uniforms:{
      uMap:{ value:map||null },
      uHasMap:{ value:map?1:0 },
      uBase:{ value:new THREE.Color(...(baseColor||[1,1,1])) },
      uRim:{ value:new THREE.Color(...rim) },
      uLightDir:{ value:new THREE.Vector3(0.4,1.0,0.5).normalize() },
      uEmissive:{ value:0.0 },
      uFlash:{ value:0.0 },
      uRimTint:{ value:0.0 },   // 0 = no transform tint, 1 = full ki tint on rim
    },
    vertexShader:`
      varying vec3 vN; varying vec3 vWorld; varying vec2 vUv; varying vec3 vColor;
      void main(){
        vec4 w=modelMatrix*vec4(position,1.0);
        vWorld=w.xyz; vUv=uv;
        #ifdef USE_VCOL
          vColor=color;
        #else
          vColor=vec3(1.0);
        #endif
        vN=normalize(mat3(modelMatrix)*normal);
        gl_Position=projectionMatrix*viewMatrix*w;
      }`,
    fragmentShader:`
      precision highp float;
      varying vec3 vN; varying vec3 vWorld; varying vec2 vUv; varying vec3 vColor;
      uniform sampler2D uMap; uniform float uHasMap;
      uniform vec3 uBase,uRim,uLightDir; uniform float uEmissive,uFlash,uRimTint;
      void main(){
        vec3 albedo = uBase * vColor;
        if(uHasMap>0.5){ vec4 t=texture2D(uMap,vUv); albedo*=t.rgb; }
        vec3 N=normalize(vN);
        float ndl=dot(N,normalize(uLightDir));
        // gentle 3-band toon ramp that PRESERVES texture detail
        float band = ndl>0.5 ? 1.0 : (ndl>0.0 ? 0.82 : 0.62);
        vec3 col=albedo*band;
        vec3 V=normalize(cameraPosition-vWorld);
        float rim=pow(1.0-max(dot(N,V),0.0),2.6);
        col += mix(vec3(rim*0.4), uRim*rim*0.9, uRimTint);
        col += albedo*uEmissive*0.4;
        col = mix(col, vec3(1.0), uFlash);
        gl_FragColor=vec4(col,1.0);
      }`,
    vertexColors: !!useVertexColors,
    defines: useVertexColors ? { USE_VCOL:'' } : {},
  });
}

// Inverted-hull outline: expand along normal, render back faces dark.
// `skinned` builds a variant with GPU skinning so the outline follows bones.
export function makeOutlineMaterial(thick=0.04, skinned=false){
  if(skinned){
    // Use Three.js skinning shader chunks so the outline deforms with the skeleton.
    return new THREE.ShaderMaterial({
      uniforms:{ uThick:{ value:thick } },
      vertexShader:`
        uniform float uThick;
        #include <common>
        #include <skinning_pars_vertex>
        void main(){
          #include <skinbase_vertex>
          #include <beginnormal_vertex>
          #include <skinnormal_vertex>
          #include <begin_vertex>
          #include <skinning_vertex>
          // expand along the (skinned) normal in local space, then to world
          vec3 n = normalize(objectNormal);
          transformed += n * uThick;
          vec4 wp = modelMatrix * vec4(transformed, 1.0);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }`,
      fragmentShader:`void main(){ gl_FragColor=vec4(0.03,0.03,0.06,1.0); }`,
      side:THREE.BackSide,
    });
  }
  return new THREE.ShaderMaterial({
    uniforms:{ uThick:{ value:thick } },
    vertexShader:`
      uniform float uThick;
      void main(){
        vec3 wn = normalize(mat3(modelMatrix)*normal);
        vec4 wp = modelMatrix*vec4(position,1.0);
        wp.xyz += wn*uThick;
        gl_Position = projectionMatrix*viewMatrix*wp;
      }`,
    fragmentShader:`void main(){ gl_FragColor=vec4(0.03,0.03,0.06,1.0); }`,
    side:THREE.BackSide,
  });
}
