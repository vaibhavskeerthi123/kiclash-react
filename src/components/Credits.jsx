import React from 'react';

// Placeholder credits — edit freely.
const CREDITS = [
  { role:'Game Design', names:['Placeholder Dev One'] },
  { role:'Programming', names:['Placeholder Dev Two','Placeholder Dev Three'] },
  { role:'Character Art', names:['Placeholder Artist'] },
  { role:'Characters', names:['Nitish','Krish','Aarush','Zain','Disha'] },
  { role:'Music & Audio', names:['Placeholder Composer'] },
  { role:'Special Thanks', names:['You, the player'] },
];

export default function Credits({ onBack }){
  return (
    <div className="screen title-bg credits-screen" style={{ backgroundImage:'url(/backgrounds/title.jpg)' }}>
      <div className="bg-dim" />
      <div className="seltitle">CREDITS</div>
      <div className="credits-scroll">
        {CREDITS.map((c,i)=>(
          <div key={i} className="credit-block">
            <div className="credit-role">{c.role}</div>
            {c.names.map((n,j)=><div key={j} className="credit-name">{n}</div>)}
          </div>
        ))}
        <div className="credit-block"><div className="credit-role">BUNTY’S CATHARSIS</div></div>
      </div>
      <div className="sel-actions">
        <button className="startbtn" onClick={onBack}>← BACK</button>
      </div>
    </div>
  );
}
