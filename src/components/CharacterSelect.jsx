import React, { useState } from 'react';
import { ROSTER } from '../game/roster.js';
import CharacterPortrait from './CharacterPortrait.jsx'; // used by the big render panels

const TAU=Math.PI*2;
const rgb=c=>`rgb(${c.map(v=>v*255|0).join(',')})`;

// circular token in the wheel. Uses a CHEAP representation (no live 3D canvas)
// so the select screen doesn't spawn many WebGL contexts and crash with
// "Context Lost". Live 3D is reserved for the two big render panels.
function Token({ def, customModels, selected, onClick, onHover }){
  return (
    <div className={`tok${selected?' sel':''}`} style={{ '--kc':rgb(def.ki) }}
         onClick={onClick} onMouseEnter={onHover}>
      <div className="tok-badge"
        style={{ background:`radial-gradient(circle at 38% 32%, #fff, ${rgb(def.body)} 62%, rgba(0,0,0,.4))` }}>
        <span className="tok-letter">{def.name[0]}</span>
      </div>
    </div>
  );
}

// arc of tokens down one side of the screen (like the reference wheel halves)
function TokenArc({ side, selected, locked, onPick, onHover, onLeave, customModels }){
  const n=ROSTER.length;
  return (
    <div className={`arc ${side}`} onMouseLeave={onLeave}>
      {ROSTER.map((c,idx)=>{
        // place tokens on a vertical arc; left side bulges right, right side bulges left
        const t = n>1 ? idx/(n-1) : 0.5;            // 0..1 top->bottom
        const ang = (t-0.5) * 1.5;                  // radians spread
        const bulge = side==='left' ? 1 : -1;
        const cx = 50 + bulge * Math.cos(ang) * 16; // % from arc container center
        const cy = 50 + Math.sin(ang) * 42;
        return (
          <div key={c.id} className="tok-slot" style={{ left:`${cx}%`, top:`${cy}%` }}>
            <Token def={c} customModels={customModels} selected={selected===idx}
              onClick={()=>onPick(idx)} onHover={()=>onHover && onHover(idx)} />
          </div>
        );
      })}
    </div>
  );
}

// big framed render of the shown character on each side
function RenderPanel({ side, idx, customModels }){
  const def = idx!=null ? ROSTER[idx] : null;
  return (
    <div className={`render ${side}`}>
      {def ? (
        <>
          <div className="render-frame">
            <CharacterPortrait def={def} customObject={customModels[def.id]} />
          </div>
          <div className="render-name" style={{ color:rgb(def.ki) }}>{def.name}</div>
          <div className="render-arch">{def.arch}</div>
        </>
      ) : (
        <div className="render-empty">{side==='left'?'PLAYER 1':'PLAYER 2 · CPU'}<small>choose a fighter</small></div>
      )}
    </div>
  );
}

export default function CharacterSelect({ onDone, customModels, onAssignModel }){
  const [p1,setP1]=useState(null);
  const [p2,setP2]=useState(null);
  const [phase,setPhase]=useState(0);
  const [armed,setArmed]=useState(null);
  const [hoverL,setHoverL]=useState(null);
  const [hoverR,setHoverR]=useState(null);

  function pick(idx){
    if(phase===0){ setP1(idx); setPhase(1); setHoverL(null); }
    else { setP2(idx); setHoverR(null); }
  }
  // once locked, hover does NOT change the shown render
  const leftShow  = p1!=null ? p1 : hoverL;
  const rightShow = p2!=null ? p2 : hoverR;

  return (
    <div className="screen select-bg cs-layout">
      <div className="seltitle">SELECT CHARACTERS</div>

      <div className="nametag p1"><small>1P</small>{p1!=null?ROSTER[p1].name:'—'}</div>
      <div className="nametag p2"><small>2P · COM</small>{p2!=null?ROSTER[p2].name:'—'}</div>

      {/* left half: P1 render + token arc */}
      <RenderPanel side="left"  idx={leftShow}  customModels={customModels} />
      <TokenArc side="left"  selected={p1} locked={p1!=null} onPick={pick}
        onHover={(i)=>{ if(p1==null) setHoverL(i); }} onLeave={()=>setHoverL(null)} customModels={customModels} />

      <div className="vs">VS</div>

      {/* right half: P2 render + token arc */}
      <TokenArc side="right" selected={p2} locked={p2!=null} onPick={pick}
        onHover={(i)=>{ if(p2==null) setHoverR(i); }} onLeave={()=>setHoverR(null)} customModels={customModels} />
      <RenderPanel side="right" idx={rightShow} customModels={customModels} />

      <div className="cs-bottom">
        <div className="model-menu">
          {ROSTER.map(c=>(
            <div key={c.id} className={`mbtn${armed===c.id?' armed':''}`}
                 title="Click, then drop a .glb/.fbx to assign it to this fighter"
                 onClick={()=>{ setArmed(c.id); onAssignModel && onAssignModel(c.id); }}>
              {customModels[c.id]?'✓ ':''}Model → {c.name}
            </div>
          ))}
        </div>
        <div className="selhint">
          {phase===0 ? 'Player 1: pick a fighter' : (p2==null ? 'Player 2 (CPU): pick a fighter' : 'Ready!')}
          {' · '}drop a .glb/.fbx to add your own
        </div>
        <div className="sel-actions">
          {(p1!=null) && <button className="startbtn ghost-btn" onClick={()=>{ setP1(null); setP2(null); setPhase(0); }}>RESET</button>}
          {(p1!=null && p2!=null) && <button className="startbtn" onClick={()=>onDone({ p1, p2 })}>NEXT: STAGE →</button>}
        </div>
      </div>
    </div>
  );
}
