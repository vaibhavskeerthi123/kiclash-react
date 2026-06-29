import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { ROSTER } from './game/roster.js';
import { World } from './game/World.js';
import { loadFighterModel } from './components/FighterModel.jsx';
import { autoLoadClips } from './components/animations.js';
import CharacterSelect from './components/CharacterSelect.jsx';
import StageSelect from './components/StageSelect.jsx';
import BattleScene from './components/BattleScene.jsx';
import HUD from './components/HUD.jsx';
import TouchControls from './components/TouchControls.jsx';
import AudioManager from './components/AudioManager.jsx';

const rgb=c=>`rgb(${c.map(v=>v*255|0).join(',')})`;
const isTouch = (typeof window!=='undefined') &&
  ('ontouchstart' in window || navigator.maxTouchPoints>0);

export default function App(){
  const [scene,setScene]=useState('loading');   // loading | title | select | stage | battle | pause | result
  const [loadProgress,setLoadProgress]=useState({ done:0, total:0, label:'Starting…' });
  const [world,setWorld]=useState(null);
  const [stageId,setStageId]=useState('wasteland');
  const [winner,setWinner]=useState(null);
  const [customModels,setCustomModels]=useState({});  // id -> THREE.Object3D
  const [customStages,setCustomStages]=useState({});   // stageId -> THREE.Object3D
  const [customClips,setCustomClips]=useState({});     // fighterId -> [AnimationClip]
  const [dropActive,setDropActive]=useState(false);
  const [toast,setToast]=useState('');
  const [matchKey,setMatchKey]=useState(0);   // bump to force a clean BattleScene remount
  const [showAnimDiag,setShowAnimDiag]=useState(false);
  const [muted,setMuted]=useState(false);
  const armedRef=useRef(null);
  const pendingPick=useRef({p1:0,p2:1});   // remembers character picks between select -> stage
  const lastPick=useRef({ p1:0, p2:1, stage:'wasteland' });

  const showToast=(m)=>{ setToast(m); setTimeout(()=>setToast(''),2600); };

  // global keys: enter to start, esc/p to pause
  useEffect(()=>{
    const onKey=(e)=>{
      if(scene==='title' && (e.code==='Enter'||e.code==='Space')) setScene('select');
      else if(scene==='battle' && e.code==='Escape') setScene('pause');
      else if(scene==='pause' && e.code==='Escape') setScene('battle');
      if(e.code==='KeyF') setShowAnimDiag(v=>!v);   // toggle animation diagnostic
    };
    window.addEventListener('keydown', onKey);
    return ()=>window.removeEventListener('keydown', onKey);
  }, [scene]);

  // actually freeze/unfreeze the simulation when paused
  useEffect(()=>{
    if(world) world.paused = (scene==='pause');
  }, [scene, world]);

  // auto-load fighters/stages/animations, tracking progress for the loading screen
  useEffect(()=>{
    (async()=>{
      const okBinary = (head)=>{
        const ct=(head.headers.get('content-type')||'');
        return head.ok && !ct.includes('text/html');
      };
      // total steps = fighters + stages + anim sets
      const total = ROSTER.length + 3 + ROSTER.length;
      let done = 0;
      const step = (label)=>{ done++; setLoadProgress({ done, total, label }); };
      setLoadProgress({ done:0, total, label:'Loading fighters…' });

      const loaded={};
      for(const c of ROSTER){
        setLoadProgress(p=>({ ...p, label:`Loading fighter: ${c.name}` }));
        let got=false;
        for(const ext of ['glb','fbx']){
          const url=`models/${c.id}.${ext}`;
          try{ const head=await fetch(url,{method:'HEAD'});
            if(okBinary(head)){ loaded[c.id]=await loadFighterModel(url); got=true; break; }
          }catch(_){}
        }
        step(got?`Loaded ${c.name}`:`${c.name}: using default`);
      }
      if(Object.keys(loaded).length) setCustomModels(m=>({ ...m, ...loaded }));

      const stages={};
      for(const id of ['wasteland','lava','island']){
        setLoadProgress(p=>({ ...p, label:`Loading stage: ${id}` }));
        for(const ext of ['glb','fbx']){
          const url=`stages/${id}.${ext}`;
          try{ const head=await fetch(url,{method:'HEAD'});
            if(okBinary(head)){ stages[id]=await loadFighterModel(url); break; }
          }catch(_){}
        }
        step(`Stage: ${id}`);
      }
      if(Object.keys(stages).length) setCustomStages(s=>({ ...s, ...stages }));

      const clips={};
      for(const c of ROSTER){
        setLoadProgress(p=>({ ...p, label:`Loading animations: ${c.name}` }));
        try{
          const { clips:set, log } = await autoLoadClips(c.id);
          const names = Object.keys(set);
          if(names.length) clips[c.id] = Object.values(set);
          console.log(`[anim-load] ${c.id}:`, log);
          if(typeof window!=='undefined'){ window.__animLoad = window.__animLoad || {}; window.__animLoad[c.id] = log; }
        }catch(err){ console.warn(`[anim-load] ${c.id} failed`, err); }
        step(`Animations: ${c.name}`);
      }
      if(Object.keys(clips).length) setCustomClips(cl=>({ ...cl, ...clips }));

      setLoadProgress(p=>({ ...p, done:total, label:'Ready!' }));
      setTimeout(()=>setScene('title'), 400);
    })();
  }, []);

  // drag & drop model loading
  useEffect(()=>{
    const over=(e)=>{ e.preventDefault(); setDropActive(true); };
    const leave=(e)=>{ e.preventDefault(); if(!e.relatedTarget) setDropActive(false); };
    const drop=async(e)=>{
      e.preventDefault(); setDropActive(false);
      const file=[...e.dataTransfer.files].find(f=>/\.(glb|gltf|fbx)$/i.test(f.name));
      if(!file) return;
      const url=URL.createObjectURL(file);
      try{
        const obj=await loadFighterModel(url);
        const id=armedRef.current || ROSTER[Object.keys(customModels).length%ROSTER.length].id;
        armedRef.current=null;
        setCustomModels(m=>({ ...m, [id]:obj }));
        showToast(`Loaded ${file.name} \u2192 ${ROSTER.find(r=>r.id===id).name}`);
      }catch(err){ showToast('Failed: '+err.message); console.error(err); }
    };
    window.addEventListener('dragover', over);
    window.addEventListener('dragleave', leave);
    window.addEventListener('drop', drop);
    return ()=>{ window.removeEventListener('dragover', over);
      window.removeEventListener('dragleave', leave); window.removeEventListener('drop', drop); };
  }, [customModels]);

  const startBattle=useCallback(({ p1, p2, stage })=>{
    lastPick.current={ p1, p2, stage };
    setWorld(prev=>{ if(prev) prev.dispose(); return new World(ROSTER[p1], ROSTER[p2]); });
    setStageId(stage); setWinner(null); setMatchKey(k=>k+1); setScene('battle');
  }, []);

  const rematch=useCallback(()=>{
    const { p1, p2, stage }=lastPick.current;
    startBattle({ p1, p2, stage });
  }, [startBattle]);

  const onEnd=useCallback((w)=>{
    setWinner(w);
    setTimeout(()=>setScene('result'), 1400);
  }, []);

  const toTitle=useCallback(()=>{
    setWorld(prev=>{ if(prev) prev.dispose(); return null; });
    setScene('title');
  }, []);

  return (
    <>
      {/* 3D canvas only mounts during battle/pause/result so the world exists */}
      {world && (
        <Canvas shadows={!isTouch} camera={{ fov:55, position:[0,5,18] }}
          gl={{ antialias:!isTouch, powerPreference:'default', failIfMajorPerformanceCaveat:false, preserveDrawingBuffer:false }}
          dpr={[1, isTouch ? 1.25 : 2]}
          resize={{ scroll:false, debounce:{ scroll:0, resize:80 } }}
          style={{ position:'fixed', top:0, left:0, width:'100vw', height:'100vh' }}
          onCreated={({ gl })=>{
            const canvas=gl.domElement;
            canvas.addEventListener('webglcontextlost', (e)=>{ e.preventDefault(); console.warn('WebGL context lost — will restore'); }, false);
            canvas.addEventListener('webglcontextrestored', ()=>{ console.warn('WebGL context restored'); }, false);
          }}>
          <BattleScene key={matchKey} world={world} stageId={stageId} customModels={customModels}
            customStage={customStages[stageId]} customClips={customClips} onEnd={onEnd} />
        </Canvas>
      )}

      {(scene==='battle'||scene==='pause'||scene==='result') && world && <HUD world={world} />}

      {/* animation diagnostic (toggle with the F key) */}
      {scene==='battle' && showAnimDiag && <AnimDiagPanel />}

      {/* on-screen controls during battle on touch devices */}
      <TouchControls enabled={isTouch && scene==='battle'} onPause={()=>setScene('pause')} />

      {/* scene-based music (files in public/audio/, swappable) */}
      <AudioManager scene={scene} muted={muted} volume={0.5} />
      {scene!=='loading' && (
        <button className="mute-btn" onClick={()=>setMuted(m=>!m)}
          title={muted?'Unmute':'Mute'}>{muted?'🔇':'🔊'}</button>
      )}

      {scene==='loading' && (
        <div className="screen title-bg loading-screen" style={{ backgroundImage:'url(/backgrounds/title.jpg)' }}>
          <div className="bg-dim" />
          <div className="logo logo-bbb">BANG BANG<span className="sub">BANGALORE</span></div>
          <div className="load-bar"><div className="load-fill" style={{
            width: `${loadProgress.total ? Math.round(loadProgress.done/loadProgress.total*100) : 0}%` }} /></div>
          <div className="load-label">{loadProgress.label}</div>
          <div className="load-pct">{loadProgress.total ? Math.round(loadProgress.done/loadProgress.total*100) : 0}%</div>
        </div>
      )}

      {scene==='title' && (
        <div className="screen title-bg" onClick={()=>setScene('select')}
             style={{ backgroundImage:'url(/backgrounds/title.jpg)' }}>
          <div className="bg-dim" />
          <div className="logo logo-bbb">BANG BANG<span className="sub">BANGALORE</span></div>
          <div className="prompt">PRESS ENTER / TAP TO BEGIN</div>
          <div className="hint">
            P1: WASD move · J/K light/heavy · L blast · O rush · U charge · I block · Space jump/dash · T transform · P ultimate
          </div>
        </div>
      )}

      {scene==='select' && (
        <CharacterSelect
          onDone={({p1,p2})=>{ pendingPick.current={p1,p2}; setScene('stage'); }}
          customModels={customModels}
          onAssignModel={(id)=>{ armedRef.current=id; }}
        />
      )}

      {scene==='stage' && (
        <StageSelect
          customStages={customStages}
          onBack={()=>setScene('select')}
          onDone={(stage)=>{ const { p1, p2 }=pendingPick.current; startBattle({ p1, p2, stage }); }}
        />
      )}

      {scene==='pause' && (
        <div className="screen menu-bg">
          <div className="logo" style={{ fontSize:'clamp(28px,6vw,64px)' }}>PAUSED</div>
          <div className="controls-card">
            <div className="controls-title">CONTROLS — PLAYER 1</div>
            <div className="controls-grid">
              <span>Move</span><b>A / D</b>
              <span>Jump</span><b>Space</b>
              <span>Dash</span><b>Dir + Space</b>
              <span>Light attack</span><b>J</b>
              <span>Heavy attack</span><b>K</b>
              <span>Ki blast</span><b>L</b>
              <span>Rush</span><b>O</b>
              <span>Charge ki</span><b>U (hold)</b>
              <span>Block</span><b>I (hold)</b>
              <span>Transform</span><b>T</b>
              <span>Ultimate</span><b>P</b>
              <span>Pause</span><b>Esc</b>
            </div>
            <div className="controls-combos">
              <b>Combos:</b> J,J,J launches · in air J,J,K · build the blast gauge then P for the beam
            </div>
          </div>
          <button className="pill" onClick={()=>setScene('battle')}>RESUME</button>
          <button className="pill ghost" onClick={toTitle}>QUIT TO TITLE</button>
        </div>
      )}

      {scene==='result' && (
        <div className="screen menu-bg">
          <div className="logo" style={{ fontSize:'clamp(34px,8vw,96px)' }}>K.O.</div>
          <div className="resname" style={{ color: winner?rgb(winner.kiColor):'#fff' }}>
            {winner ? `${winner.def.name} WINS` : 'DRAW'}
          </div>
          <div className="xp">+{Math.floor(120+Math.random()*140)} XP {winner&&winner.hp>winner.maxhp*0.8?'· PERFECT!':''}</div>
          <button className="pill" onClick={rematch}>REMATCH</button>
          <button className="pill ghost" onClick={toTitle}>TITLE SCREEN</button>
        </div>
      )}

      {dropActive && <div className="dropzone">DROP .GLB / .FBX TO LOAD FIGHTER</div>}
      {toast && (
        <div style={{ position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)',
          background:'rgba(10,14,28,.85)', color:'#9fe', padding:'8px 18px', borderRadius:8,
          fontSize:13, zIndex:60 }}>{toast}</div>
      )}
    </>
  );
}

// Reads window.__animDiag (set by FighterModel) and shows whether Mixamo clips
// actually bound to each model's bones. Toggle with the F key during a battle.
function AnimDiagPanel(){
  const [, force]=useState(0);
  useEffect(()=>{ const id=setInterval(()=>force(v=>v+1), 500); return ()=>clearInterval(id); }, []);
  const diag = (typeof window!=='undefined' && window.__animDiag) || {};
  const ids = Object.keys(diag);
  return (
    <div style={{ position:'fixed', left:8, bottom:8, zIndex:70,
      maxWidth:'min(92vw,360px)', maxHeight:'40vh', overflowY:'auto',
      background:'rgba(8,10,20,.92)', border:'1px solid #2a3550', borderRadius:8,
      padding:'10px 12px', font:'11px/1.5 monospace', color:'#cde' }}>
      <div style={{ color:'#ffd23f', fontWeight:700, marginBottom:4 }}>ANIM DIAGNOSTIC (press F to hide)</div>
      {ids.length===0 && <div style={{ color:'#f88' }}>No animation clips loaded for any fighter.<br/>
        Put files at <b>public/models/&lt;id&gt;_anims/idle.fbx</b> etc.</div>}
      {ids.map(id=>{
        const d=diag[id];
        const ok = d.bound;
        const loadLog = (typeof window!=='undefined' && window.__animLoad && window.__animLoad[id]) || null;
        return (
          <div key={id} style={{ marginTop:6 }}>
            <span style={{ color: ok?'#6f6':'#f88' }}>{ok?'✓':'✗'} {id}</span>
            {' '}— bones: {d.bones}, clips: {d.clipCount}
            <div style={{ color:'#9ab', paddingLeft:12 }}>
              {d.clips.map((c,i)=><div key={i}>{c}</div>)}
            </div>
            {loadLog && <div style={{ color:'#789', paddingLeft:12, fontSize:11 }}>
              {loadLog.map((l,i)=><div key={i} style={{ color: l.startsWith('✓')?'#6c9':'#a66' }}>{l}</div>)}
            </div>}
            {d.clipCount<=1 && <div style={{ color:'#fa6', paddingLeft:12 }}>
              Only {d.clipCount} clip found. Put separate files at
              <b> public/models/{id}_anims/idle.fbx, punch.fbx, walk.fbx</b> …
            </div>}
          </div>
        );
      })}
    </div>
  );
}
