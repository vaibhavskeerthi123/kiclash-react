import React, { useState, useEffect, useRef } from 'react';
import { ROSTER } from '../game/roster.js';

const rgb=c=>`rgb(${c.map(v=>v*255|0).join(',')})`;
const REVEAL_MS = 22;   // ms per character while typing

// Big facing sprites + bottom dialogue box, layered over the (paused) battle.
// Tap/click advances; if a line is still typing, first tap completes it.
export default function PreBattleDialogue({ mission, playerDef, foeDef, onDone }){
  const lines = mission.dialogue || [];
  const [idx, setIdx] = useState(0);
  const [shown, setShown] = useState('');     // currently revealed substring
  const [done, setDone] = useState(false);    // is the current line fully shown
  const timer = useRef(null);

  const line = lines[idx] || { who:'player', text:'' };
  const speaker = line.who === 'foe' ? foeDef : playerDef;

  // type out the current line
  useEffect(()=>{
    setShown(''); setDone(false);
    let i=0;
    clearInterval(timer.current);
    timer.current = setInterval(()=>{
      i++;
      setShown(line.text.slice(0,i));
      if(i>=line.text.length){ clearInterval(timer.current); setDone(true); }
    }, REVEAL_MS);
    return ()=>clearInterval(timer.current);
  }, [idx]);

  function advance(){
    if(!done){
      // reveal the full line immediately on first tap
      clearInterval(timer.current); setShown(line.text); setDone(true); return;
    }
    if(idx < lines.length-1) setIdx(i=>i+1);
    else onDone();   // finished — start the fight
  }

  // keyboard: any key advances too
  useEffect(()=>{
    const k=(e)=>{ e.preventDefault(); advance(); };
    window.addEventListener('keydown', k);
    return ()=>window.removeEventListener('keydown', k);
  }, [done, idx]);

  const spriteSrc = (def, storyFile)=>storyFile ? `story/${storyFile}` : `portraits/${def.id}.png`;
  const foeSpeaking = line.who === 'foe';

  return (
    <div className="pbd-overlay" onClick={advance}>
      {/* facing sprites */}
      <div className={`pbd-sprite left ${!foeSpeaking?'active':'dim'}`}>
        <SpriteImg def={playerDef} file={mission.playerSprite} />
      </div>
      <div className={`pbd-sprite right ${foeSpeaking?'active':'dim'}`}>
        <SpriteImg def={foeDef} file={mission.foeSprite} flip />
      </div>

      {/* dialogue box */}
      <div className="pbd-box">
        <div className="pbd-name" style={{ color:rgb(speaker.ki) }}>{speaker.name}</div>
        <div className="pbd-text">{shown}<span className={`pbd-caret${done?' hidden':''}`}>▌</span></div>
        <div className="pbd-hint">{done ? 'tap to continue' : ''} {idx+1}/{lines.length}</div>
      </div>

      <button className="pbd-skip" onClick={(e)=>{ e.stopPropagation(); onDone(); }}>SKIP ▶▶</button>
    </div>
  );
}

// sprite with graceful fallback: story sprite -> portrait -> colored badge
function SpriteImg({ def, file, flip }){
  const [stage,setStage]=useState('story'); // story | portrait | badge
  useEffect(()=>{ setStage(file?'story':'portrait'); }, [def.id]);
  const style = flip ? { transform:'scaleX(-1)' } : undefined;
  if(stage==='badge'){
    return <div className="pbd-badge" style={{ background:`radial-gradient(circle at 40% 30%, #fff, ${rgb(def.body)} 60%, #0a0a14)` }}>{def.name[0]}</div>;
  }
  const src = stage==='story' && file ? `story/${file}` : `portraits/${def.id}.png`;
  return <img className="pbd-img" style={style} src={src} alt={def.name}
    onError={()=>setStage(stage==='story'?'portrait':'badge')} />;
}
