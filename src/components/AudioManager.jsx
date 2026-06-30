import { useEffect, useRef } from 'react';

// Plays a different looping track per scene. Files live in public/audio/ and are
// fully swappable. Browsers block autoplay until the first user interaction, so
// we start/unlock playback on the first click/keypress/touch.
const TRACKS = {
  loading: 'audio/title.mp3',
  title:   'audio/title.mp3',
  select:  'audio/select.mp3',
  stage:   'audio/select.mp3',
  cutscene:'audio/battle.mp3',
  battle:  'audio/battle.mp3',
  pause:   'audio/select.mp3',
  result:  'audio/select.mp3',
};

export default function AudioManager({ scene, muted=false, volume=0.5 }){
  const audioRef = useRef(null);
  const unlocked = useRef(false);
  const currentSrc = useRef(null);

  // create the audio element once
  useEffect(()=>{
    const a = new Audio();
    a.loop = true; a.volume = volume; a.preload = 'auto';
    audioRef.current = a;
    return ()=>{ try{ a.pause(); }catch(_){} };
  }, []);

  // unlock audio on first user gesture (autoplay policy)
  useEffect(()=>{
    const unlock = ()=>{
      unlocked.current = true;
      if(audioRef.current && currentSrc.current){
        audioRef.current.play().catch(()=>{});
      }
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    window.addEventListener('touchstart', unlock);
    return ()=>{
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };
  }, []);

  // swap track when the scene's track changes
  useEffect(()=>{
    const a = audioRef.current; if(!a) return;
    const src = TRACKS[scene] || TRACKS.title;
    if(src !== currentSrc.current){
      currentSrc.current = src;
      a.src = src;
      if(unlocked.current && !muted){ a.play().catch(()=>{}); }
    }
  }, [scene, muted]);

  // volume / mute
  useEffect(()=>{
    const a = audioRef.current; if(!a) return;
    a.muted = muted; a.volume = volume;
    if(!muted && unlocked.current && a.paused && currentSrc.current){ a.play().catch(()=>{}); }
  }, [muted, volume]);

  return null;
}
