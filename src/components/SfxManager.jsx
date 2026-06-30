import { useEffect, useRef } from 'react';

// Combat sound effects. Drains world.sfx each frame and plays short samples.
// Files live in public/audio/sfx/ and are fully swappable. Missing files are
// simply skipped (no error).
const SFX_FILES = {
  hit:       'audio/sfx/hit.mp3',        // light punch/kick impact
  hit_heavy: 'audio/sfx/hit_heavy.mp3',  // heavy impact
  block:     'audio/sfx/block.mp3',      // guarded hit
  jump:      'audio/sfx/jump.mp3',
  charge:    'audio/sfx/charge.mp3',     // powering up
  ki:        'audio/sfx/ki.mp3',         // ki blast fired
  transform: 'audio/sfx/transform.mp3',
};

export default function SfxManager({ world, muted=false, volume=0.7 }){
  const pools = useRef({});   // name -> array of <audio> for overlap
  const raf = useRef(0);

  // preload a small pool per sound so rapid hits can overlap
  useEffect(()=>{
    const POOL=4;
    Object.entries(SFX_FILES).forEach(([name,src])=>{
      pools.current[name] = Array.from({length:POOL}, ()=>{
        const a=new Audio(src); a.preload='auto'; a.volume=volume; return a;
      });
    });
  }, []);

  // update volume/mute live
  useEffect(()=>{
    Object.values(pools.current).flat().forEach(a=>{ a.volume=volume; a.muted=muted; });
  }, [muted, volume]);

  // drain the world's sfx queue each animation frame and play
  useEffect(()=>{
    if(!world) return;
    let alive=true;
    function play(name){
      const pool=pools.current[name]; if(!pool) return;
      // find a free (or oldest) audio element in the pool
      const a = pool.find(x=>x.paused || x.ended) || pool[0];
      try{ a.currentTime=0; if(!muted) a.play().catch(()=>{}); }catch(_){}
    }
    function loop(){
      if(!alive) return;
      if(world.drainSfx){
        const events=world.drainSfx();
        for(const e of events) play(e);
      }
      raf.current=requestAnimationFrame(loop);
    }
    raf.current=requestAnimationFrame(loop);
    return ()=>{ alive=false; cancelAnimationFrame(raf.current); };
  }, [world, muted]);

  return null;
}
