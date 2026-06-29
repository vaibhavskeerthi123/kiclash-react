import React, { useState, useEffect } from 'react';
import { ROSTER } from '../game/roster.js';
import CharacterPortrait from './CharacterPortrait.jsx';

const rgb=c=>`rgb(${c.map(v=>v*255|0).join(',')})`;

// Token = a small PLACEHOLDER IMAGE (public/portraits/<id>.png) if present,
// else a colored badge with the initial. NOT a 3D viewer (those are heavy).
function Token({ def, selected, onClick, onHover }){
  const [hasImg,setHasImg]=useState(false);
  useEffect(()=>{
    const img=new Image();
    img.onload=()=>setHasImg(true);
    img.onerror=()=>setHasImg(false);
    img.src=`portraits/${def.id}.png`;
  },[def.id]);
  return (
    <button className={`tok${selected?' sel':''}`} style={{ '--kc':rgb(def.ki) }}
         onClick={onClick} onMouseEnter={onHover}>
      {hasImg
        ? <img className="tok-img" src={`portraits/${def.id}.png`} alt={def.name} />
        : <div className="tok-badge"
            style={{ background:`radial-gradient(circle at 38% 32%, #fff, ${rgb(def.body)} 62%, rgba(0,0,0,.4))` }}>
            <span className="tok-letter">{def.name[0]}</span>
          </div>}
    </button>
  );
}

// Big side panel = LIVE 3D MODEL VIEWER of the shown character.
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
  const leftShow  = p1!=null ? p1 : hoverL;
  const rightShow = p2!=null ? p2 : hoverR;

  return (
    <div className="screen select-bg cs-grid" style={{ backgroundImage:'url(/backgrounds/select.jpg)' }}>
      <div className="bg-dim" />

      {/* row 1: title */}
      <div className="cs-title-row">
        <div className="nametag p1"><small>1P</small>{p1!=null?ROSTER[p1].name:'—'}</div>
        <div className="seltitle">SELECT CHARACTERS</div>
        <div className="nametag p2"><small>2P · COM</small>{p2!=null?ROSTER[p2].name:'—'}</div>
      </div>

      {/* row 2: [P1 panel] [P1 tokens] [VS] [P2 tokens] [P2 panel] */}
      <div className="cs-main">
        <RenderPanel side="left" idx={leftShow} customModels={customModels} />

        <div className="tok-col">
          {ROSTER.map((c,idx)=>(
            <Token key={c.id} def={c} selected={p1===idx}
              onClick={()=>pick(idx)} onHover={()=>{ if(p1==null) setHoverL(idx); }} />
          ))}
        </div>

        <div className="vs">VS</div>

        <div className="tok-col">
          {ROSTER.map((c,idx)=>(
            <Token key={c.id} def={c} selected={p2===idx}
              onClick={()=>pick(idx)} onHover={()=>{ if(p2==null) setHoverR(idx); }} />
          ))}
        </div>

        <RenderPanel side="right" idx={rightShow} customModels={customModels} />
      </div>

      {/* row 3: model-assign + actions */}
      <div className="cs-footer">
        <div className="model-menu">
          {ROSTER.map(c=>(
            <div key={c.id} className={`mbtn${armed===c.id?' armed':''}`}
                 onClick={()=>{ setArmed(c.id); onAssignModel && onAssignModel(c.id); }}>
              {customModels[c.id]?'✓ ':''}Model → {c.name}
            </div>
          ))}
        </div>
        <div className="sel-actions">
          {(p1!=null) && <button className="startbtn ghost-btn" onClick={()=>{ setP1(null); setP2(null); setPhase(0); }}>RESET</button>}
          {(p1!=null && p2!=null) && <button className="startbtn" onClick={()=>onDone({ p1, p2 })}>NEXT: STAGE →</button>}
        </div>
        <div className="selhint">
          {phase===0 ? 'Player 1: pick a fighter' : (p2==null ? 'Player 2 (CPU): pick a fighter' : 'Ready! Press NEXT')}
          {' · '}drop a .glb/.fbx to add your own
        </div>
      </div>
    </div>
  );
}
