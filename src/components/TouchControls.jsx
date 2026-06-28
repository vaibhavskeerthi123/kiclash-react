import React, { useRef } from 'react';

// On-screen controls for touch devices. Each button dispatches the SAME
// key codes the keyboard uses, so combat logic needs no changes.
const BTNS = [
  { id:'left',  label:'◀',  code:'KeyA',  pos:{ left:18,  bottom:24  }, size:'big' },
  { id:'right', label:'▶',  code:'KeyD',  pos:{ left:96,  bottom:24  }, size:'big' },
  { id:'jump',  label:'JMP', code:'Space', pos:{ left:57,  bottom:104 }, size:'sm'  },
  { id:'light', label:'J',   code:'KeyJ',  pos:{ right:18,  bottom:96  }, size:'big' },
  { id:'heavy', label:'K',   code:'KeyK',  pos:{ right:96,  bottom:60  }, size:'big' },
  { id:'blast', label:'KI',  code:'KeyL',  pos:{ right:18,  bottom:178 }, size:'sm'  },
  { id:'rush',  label:'RSH', code:'KeyO',  pos:{ right:90,  bottom:150 }, size:'sm'  },
  { id:'block', label:'BLK', code:'KeyI',  pos:{ right:162, bottom:96  }, size:'sm'  },
  { id:'charge',label:'CHG', code:'KeyU',  pos:{ right:162, bottom:24  }, size:'sm'  },
  { id:'trans', label:'TR',  code:'KeyT',  pos:{ right:18,  bottom:256 }, size:'sm'  },
  { id:'ult',   label:'ULT', code:'KeyP',  pos:{ right:90,  bottom:228 }, size:'sm'  },
];

function fire(code, type){
  // include both code and key so handlers relying on either still work
  window.dispatchEvent(new KeyboardEvent(type, { code, key:code, bubbles:true }));
}

function Btn({ label, code, pos, size }){
  const held=useRef(false);
  const down=(e)=>{ e.preventDefault(); e.stopPropagation(); if(!held.current){ held.current=true; fire(code,'keydown'); } };
  const up=(e)=>{ e.preventDefault(); e.stopPropagation(); if(held.current){ held.current=false; fire(code,'keyup'); } };
  return (
    <button className={`tc-btn ${size}`} style={pos}
      onPointerDown={down} onPointerUp={up} onPointerCancel={up} onPointerLeave={up}
      onContextMenu={(e)=>e.preventDefault()}>
      {label}
    </button>
  );
}

export default function TouchControls({ enabled, onPause }){
  if(!enabled) return null;
  return (
    <div className="touch-controls">
      <button className="tc-btn tc-pause"
        onPointerDown={(e)=>{ e.preventDefault(); e.stopPropagation(); onPause && onPause(); }}>
        ❚❚ PAUSE
      </button>
      {BTNS.map(b=> <Btn key={b.id} {...b} />)}
    </div>
  );
}
