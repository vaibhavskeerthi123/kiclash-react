import React from 'react';
import { MISSIONS } from '../game/story.js';
import { ROSTER } from '../game/roster.js';

const rgb=c=>`rgb(${c.map(v=>v*255|0).join(',')})`;
const defOf=(id)=>ROSTER.find(c=>c.id===id)||ROSTER[0];

// Mission select. `progress` = number of missions completed (index unlocked).
export default function StoryMode({ progress=0, onBack, onPlay }){
  return (
    <div className="screen select-bg story-screen" style={{ backgroundImage:'url(/backgrounds/select.jpg)' }}>
      <div className="bg-dim" />
      <div className="seltitle">STORY MODE</div>

      <div className="mission-list">
        {MISSIONS.map((m,i)=>{
          const unlocked = i<=progress;      // first is always unlocked
          const cleared = i<progress;
          const foe=defOf(m.foe);
          return (
            <button key={m.id} className={`mission-card${unlocked?'':' locked'}${cleared?' cleared':''}`}
              disabled={!unlocked} onClick={()=>unlocked && onPlay(m)}>
              <div className="mission-badge" style={{ background:`radial-gradient(circle at 40% 30%, #fff, ${rgb(foe.body)} 60%, #0a0a14)` }}>
                {unlocked ? foe.name[0] : '🔒'}
              </div>
              <div className="mission-info">
                <div className="mission-title">{m.title}</div>
                <div className="mission-sub">vs {foe.name}{cleared ? '  ·  CLEARED' : (unlocked ? '' : '  ·  LOCKED')}</div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="sel-actions">
        <button className="startbtn ghost-btn" onClick={onBack}>← BACK</button>
      </div>
    </div>
  );
}
