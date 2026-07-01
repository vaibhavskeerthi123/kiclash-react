import { Fighter, clamp, lerp } from './Fighter.js';
import { ROSTER, ATTACKS, ST } from './roster.js';
import { Input, MAP_P1 } from './input.js';

const rand=(a,b)=>a+Math.random()*(b-a);
const TAU=Math.PI*2;
const GRAV=26;

// A pooled particle the renderer reads each frame.
class ParticlePool {
  constructor(max){
    this.max=max; this.head=0;
    this.pos=new Float32Array(max*3);
    this.vel=new Float32Array(max*3);
    this.col=new Float32Array(max*3);
    this.size=new Float32Array(max);
    this.life=new Float32Array(max);   // 0..1
    this.maxLife=new Float32Array(max);
    this.drag=new Float32Array(max);
    this.grav=new Float32Array(max);
  }
  spawn(p, v, col, size, ml, dr=0.96, gr=0){
    const i=this.head; this.head=(this.head+1)%this.max;
    this.pos[i*3]=p.x; this.pos[i*3+1]=p.y; this.pos[i*3+2]=p.z;
    this.vel[i*3]=v[0]; this.vel[i*3+1]=v[1]; this.vel[i*3+2]=v[2];
    this.col[i*3]=col[0]; this.col[i*3+1]=col[1]; this.col[i*3+2]=col[2];
    this.size[i]=size; this.life[i]=1; this.maxLife[i]=ml; this.drag[i]=dr; this.grav[i]=gr;
  }
  update(dt){
    for(let i=0;i<this.max;i++){
      if(this.life[i]<=0) continue;
      this.life[i]-=dt/this.maxLife[i];
      if(this.life[i]<=0){ this.life[i]=0; continue; }
      const d=Math.pow(this.drag[i], dt*60);
      this.vel[i*3]*=d; this.vel[i*3+1]=this.vel[i*3+1]*d-this.grav[i]*dt; this.vel[i*3+2]*=d;
      this.pos[i*3]+=this.vel[i*3]*dt; this.pos[i*3+1]+=this.vel[i*3+1]*dt; this.pos[i*3+2]+=this.vel[i*3+2]*dt;
    }
  }
}

export class World {
  constructor(p1Def, p2Def){
    this.fighters=[ new Fighter(p1Def,-5,1,false), new Fighter(p2Def,5,-1,true) ];
    this.particles=new ParticlePool(1400);
    this.projectiles=[];               // {pos,vel,owner,life,r,col,kind,dmg,kb}
    this.timer=99; this.winner=null; this.done=false; this.paused=false;
    this.slowmo=1; this.slowTimer=0; this.comboFlash=0;
    this.shake={t:0,mag:0,x:0,y:0};
    this.flash={col:[1,1,1],a:0};
    this.sfx=[];   // queue of sound event names; drained by the SFX player each frame
    this.input=new Input();
    // expose fx hooks on fighters
    this.fighters.forEach(f=>{
      f.onDash=()=>this.dashTrail(f);
      f.onTransform=()=>{ this.transformBurst(f); this.emit('transform'); };
      f.onJump=()=>this.emit('jump');
      f.onHit=(blocked,heavy)=>this.emit(blocked?'block':(heavy?'hit_heavy':'hit'));
    });
  }
  emit(name){ this.sfx.push(name); }
  drainSfx(){ const s=this.sfx; this.sfx=[]; return s; }
  dispose(){ this.input.dispose(); }

  doShake(m,t){ this.shake.mag=Math.max(this.shake.mag,m); this.shake.t=Math.max(this.shake.t,t); }
  doFlash(c,a){ this.flash.col=c; this.flash.a=Math.max(this.flash.a,a); }

  /* --- particle fx --- */
  V(x,y,z){ return {x,y,z}; }
  spawnAura(f){ const c=f.kiColor, n=f.transformed?3:1;
    for(let k=0;k<n;k++){ const a=rand(0,TAU), r=rand(.3,.6);
      this.particles.spawn(this.V(f.pos.x+Math.cos(a)*r, f.pos.y+rand(0,.4), f.pos.z+Math.sin(a)*r*.4),
        [rand(-.4,.4),rand(2.5,4.5),rand(-.4,.4)], c, rand(.4,.8), rand(.4,.7), .9, 0); } }
  spawnCharge(f){ const c=f.kiColor;
    for(let k=0;k<4;k++){ const a=rand(0,TAU), r=rand(1.2,2);
      this.particles.spawn(this.V(f.pos.x+Math.cos(a)*r, f.pos.y+rand(.2,2), f.pos.z+Math.sin(a)*r*.5),
        [-Math.cos(a)*5, rand(2,5), -Math.sin(a)*5], c, rand(.5,.9), rand(.25,.4), .85, 0); } }
  spawnImpact(p, col, big){ const n=big?34:16;
    for(let k=0;k<n;k++){ const dx=rand(-1,1),dy=rand(-1,1),dz=rand(-1,1),l=Math.hypot(dx,dy,dz)||1,s=rand(6,big?20:12);
      this.particles.spawn({...p},[dx/l*s,dy/l*s,dz/l*s],col,rand(.3,big?1.1:.6),rand(.25,.5),.86,18); }
    this.particles.spawn({...p},[0,0,0],[1,1,1],big?2.4:1.2,.18,.7,0); }
  dashTrail(f){ for(let k=0;k<8;k++)
    this.particles.spawn(this.V(f.pos.x-f.facing*rand(0,1.2),f.pos.y+rand(.3,1.8),f.pos.z),[0,0,0],[.8,.9,1],rand(.3,.6),.22,.8,0); }
  transformBurst(f){ const c=f.def.trans.ki;
    for(let k=0;k<90;k++){ const dx=rand(-1,1),dy=rand(-.2,1),dz=rand(-1,1),l=Math.hypot(dx,dy,dz)||1,s=rand(8,22);
      this.particles.spawn(this.V(f.pos.x,f.pos.y+1,f.pos.z),[dx/l*s,dy/l*s,dz/l*s],c,rand(.5,1.3),rand(.4,.8),.84,8); }
    this.doShake(1.4,.5); this.doFlash(c,.5); }

  spawnBlast(owner){ const dir=owner.facing;
    this.projectiles.push({ pos:this.V(owner.pos.x+dir*.7,owner.pos.y+1.3,owner.pos.z),
      vel:{x:dir*28,y:0,z:0}, owner, life:2.2, r:.5, col:owner.kiColor.slice(), kind:'blast', dmg:60, kb:7 }); }
  spawnBeam(owner){ const dir=owner.facing;
    this.projectiles.push({ pos:this.V(owner.pos.x+dir*1,owner.pos.y+1.3,owner.pos.z),
      vel:{x:dir*42,y:0,z:0}, owner, life:1.0, r:1.4, col:owner.kiColor.slice(), kind:'beam', dmg:280, kb:14 }); }

  /* --- input + AI --- */
  pollControls(f, map){
    if(f.state===ST.DEAD) return; const k=this.input;
    // FAILSAFE: if we're standing in a neutral grounded state, no special can be
    // in progress, so lockMove must be false. This defeats any edge case where a
    // special was interrupted and left the lock stuck true (which would disable
    // all attacks while still allowing movement/jump).
    if(f.lockMove && f.grounded && [ST.IDLE,ST.WALK].includes(f.state)){ f.lockMove=false; f.specialKind=null; }
    const locked=[ST.STAGGER,ST.KNOCK,ST.DASH,ST.SPECIAL].includes(f.state)||f.lockMove;
    let mvx=0;
    if(!locked && f.state!==ST.ATK && f.state!==ST.AIR_ATK){
      if(k.down(map.left)) mvx-=1; if(k.down(map.right)) mvx+=1;
      if(f.grounded){
        if(mvx!==0 && [ST.IDLE,ST.WALK].includes(f.state)){ f.vel.x=mvx*f.def.speed; f.enter(ST.WALK); }
        else if(mvx===0 && f.state===ST.WALK) f.enter(ST.IDLE);
      } else { f.vel.x=lerp(f.vel.x, mvx*f.def.speed, .1); }
    }
    f.startBlock(k.down(map.block) && !locked && f.grounded);
    f.startCharge(k.down(map.charge) && !locked && !k.down(map.block) && f.grounded);
    const id=f.isP2?'p2':'p1';
    if(k.pressed(id+'L', map.light)) f.startAttack(false);
    if(k.pressed(id+'H', map.heavy)) f.startAttack(true);
    if(k.pressed(id+'S', map.special)) f.fireSpecial('blast');
    if(k.pressed(id+'R', map.rush)) f.fireSpecial('rush');
    if(k.pressed(id+'U', map.ult)) f.fireUltimate();
    if(k.pressed(id+'T', map.trans)) f.transform();
    if(k.pressed(id+'J', map.jump)){
      if(k.down(map.left)) f.dash(-1); else if(k.down(map.right)) f.dash(1); else f.jump();
    }
  }
  aiControl(f, foe, dt){
    if(f.state===ST.DEAD) return;
    if(f.lockMove && f.grounded && [ST.IDLE,ST.WALK].includes(f.state)){ f.lockMove=false; f.specialKind=null; }
    const locked=[ST.STAGGER,ST.KNOCK,ST.DASH,ST.SPECIAL,ST.ATK,ST.AIR_ATK].includes(f.state)||f.lockMove;
    const dx=foe.pos.x-f.pos.x, dist=Math.abs(dx), dir=Math.sign(dx)||1;
    if([ST.IDLE,ST.WALK,ST.BLOCK,ST.CHARGE].includes(f.state)) f.facing=dir;
    if(locked) return;
    const foeAtk=(foe.state===ST.ATK||foe.state===ST.AIR_ATK)&&dist<2.4;
    if(foeAtk && Math.random()<.5){ f.startBlock(true); return; } else f.startBlock(false);
    f._ai=(f._ai||0)-dt; if(f._ai>0) return; f._ai=rand(.16,.5);
    if(f.blast>=100 && dist<10){ f.fireUltimate(); return; }
    if(f.ki>=60 && Math.random()<.15 && !f.transformed){ f.transform(); return; }
    if(dist>7){
      if(f.ki>40 && Math.random()<.45) f.fireSpecial('blast');
      else { f.vel.x=dir*f.def.speed; f.enter(ST.WALK); }
    } else if(dist>2.2){
      if(f.ki>40 && Math.random()<.3) f.fireSpecial('rush');
      else if(f.ki>14 && Math.random()<.5) f.dash(dir);
      else { f.vel.x=dir*f.def.speed; f.enter(ST.WALK); }
    } else {
      if(f.ki<25 && Math.random()<.25){ f.startCharge(true); setTimeout(()=>f.startCharge(false),350); }
      else f.startAttack(Math.random()<.4);
    }
  }

  /* --- per-fighter physics + state --- */
  stepFighter(f, foe, dt){
    f.anim+=dt; f.t+=dt;
    // Absolute invariant: lockMove is only valid during a SPECIAL. If we're in
    // any other state, the special is over (or was interrupted) — clear the lock
    // so attacks can never be permanently disabled. This is the definitive fix
    // for "can move/jump but can't attack after taking damage".
    if(f.lockMove && f.state!==ST.SPECIAL){ f.lockMove=false; f.specialKind=null; f._fired=false; }
    if(f.flashHit>0) f.flashHit=Math.max(0,f.flashHit-dt*4);
    if(f.invuln>0) f.invuln-=dt;
    if(f.comboTimer>0){ f.comboTimer-=dt; if(f.comboTimer<=0) f.combo=0; }
    if([ST.IDLE,ST.WALK,ST.BLOCK,ST.CHARGE].includes(f.state)) f.facing=Math.sign(foe.pos.x-f.pos.x)||f.facing;

    if(f.state===ST.CHARGE){ f.ki=Math.min(f.maxki,f.ki+f.def.kiRegen*2.4*dt); this.spawnCharge(f); this.doShake(.15,.05);
      if(!f._chargeSfx){ this.emit('charge'); f._chargeSfx=true; } }
    else { f.ki=Math.min(f.maxki,f.ki+f.def.kiRegen*0.35*dt); f._chargeSfx=false; }
    if(f.guardMeter<100 && f.state!==ST.BLOCK) f.guardMeter=Math.min(100,f.guardMeter+30*dt);
    if(f.transformed || f.state===ST.CHARGE) this.spawnAura(f);

    f.vel.x*=Math.pow(0.0001,dt);
    if(!f.grounded) f.vel.y-=GRAV*dt;
    f.pos.x+=f.vel.x*dt; f.pos.y+=f.vel.y*dt;
    if(f.pos.y<=0){ f.pos.y=0; if(!f.grounded){ f.grounded=true; this.spawnImpact(this.V(f.pos.x,0,f.pos.z),[.7,.7,.8],false);
      if([ST.JUMP,ST.KNOCK,ST.AIR_ATK].includes(f.state)) f.enter(ST.IDLE); } f.vel.y=0; }
    const B=46; if(Math.abs(f.pos.x)>B){ f.pos.x=Math.sign(f.pos.x)*B; f.vel.x*=-.3; }

    switch(f.state){
      case ST.WALK: if(Math.abs(f.vel.x)<.4) f.enter(ST.IDLE); break;
      case ST.DASH: if(f.t>.22) f.enter(ST.IDLE); break;
      case ST.ATK: case ST.AIR_ATK: this.stepAttack(f,foe); break;
      case ST.STAGGER: if(f.t>=(f.staggerT||0.3)) f.enter(f.grounded?ST.IDLE:ST.JUMP); break;
      case ST.KNOCK: if(f.grounded && f.t>.1) f.enter(ST.IDLE); else if(f.t>2.5) f.enter(ST.IDLE); break;
      case ST.SPECIAL: this.stepSpecial(f); break;
      default: break;
    }
  }
  stepAttack(f, foe){
    const m=f.atk; const total=m.startup+m.active+m.recovery;
    const active=f.t>=m.startup && f.t<m.startup+m.active;
    if(active && !f.hitThisSwing){
      const hx=f.pos.x+f.facing*(.5+m.reach*.5), hy=f.pos.y+1.3;
      const dx=Math.abs(foe.pos.x-hx), dy=Math.abs((foe.pos.y+1.3)-hy);
      if(dx<m.reach && dy<1.6 && foe.state!==ST.DEAD){
        const blocked=foe.state===ST.BLOCK && Math.sign(f.pos.x-foe.pos.x)===foe.facing;
        if(foe.takeHit(m, f.facing, blocked)){
          f.hitThisSwing=true; f.ki=Math.min(f.maxki,f.ki+m.kiGain); f.blast=Math.min(f.maxblast,f.blast+m.dmg*.05);
          const ip=this.V((hx+foe.pos.x)/2, hy, 0);
          this.spawnImpact(ip, blocked?[.6,.8,1]:[1,.9,.4], m.dmg>60);
          this.emit(blocked?'block':(m.dmg>60?'hit_heavy':'hit'));
          if(!blocked){ f.combo++; f.comboTimer=2; foe.combo=0; this.comboFlash=Math.max(this.comboFlash,1);
            this.doShake(m.dmg>60?1:.5,.18); if(m.dmg>60){ this.slowmo=.35; this.slowTimer=.12; } }
          else this.doShake(.25,.1);
        }
      }
    }
    if(f.t>=total) f.enter(f.grounded?ST.IDLE:ST.JUMP);
  }
  stepSpecial(f){
    if(f.specialKind==='blast'){
      if(f.t>.18 && !f._fired){ this.spawnBlast(f); f._fired=true; this.doShake(.5,.15); this.emit('ki'); }
      if(f.t>.45){ f.lockMove=false; f.enter(ST.IDLE); }
    } else if(f.specialKind==='rush'){
      const foe=this.fighters.find(x=>x!==f);
      if(f.t<.5 && foe){ f.facing=Math.sign(foe.pos.x-f.pos.x)||f.facing;
        f.pos.x=lerp(f.pos.x, foe.pos.x-f.facing*1.2, .25); this.dashTrail(f); }
      if(f.t>.5 && !f._fired && foe){ f._fired=true;
        for(let h=0;h<5;h++) setTimeout(()=>{ if(foe.state!==ST.DEAD){
          foe.takeHit({dmg:28,kb:h===4?10:2,stun:.2,launch:h===4}, f.facing, false);
          this.spawnImpact(this.V(foe.pos.x,foe.pos.y+1.3,0), f.kiColor, h===4); this.doShake(.5,.1); } }, h*70); }
      if(f.t>1.0){ f.lockMove=false; f.enter(ST.IDLE); }
    } else if(f.specialKind==='ult'){
      if(f.t<.6){ this.slowmo=.4; this.slowTimer=.05; this.spawnCharge(f); }
      if(f.t>.6 && !f._fired){ this.spawnBeam(f); f._fired=true; this.doShake(2.2,.6); this.doFlash(f.kiColor,.7); }
      if(f.t>1.3){ f.lockMove=false; f.enter(ST.IDLE); }
    }
  }
  stepProjectiles(dt){
    for(let i=this.projectiles.length-1;i>=0;i--){
      const p=this.projectiles[i]; p.life-=dt;
      p.pos.x+=p.vel.x*dt; p.pos.y+=p.vel.y*dt;
      this.particles.spawn({...p.pos},[rand(-1,1),rand(-1,1),rand(-1,1)],p.col,p.r*(p.kind==='beam'?2.2:1.4),.25,.8,0);
      const foe=this.fighters.find(x=>x!==p.owner);
      if(foe && foe.state!==ST.DEAD){
        const dx=Math.abs(foe.pos.x-p.pos.x), dy=Math.abs((foe.pos.y+1.3)-p.pos.y);
        if(dx<p.r+.5 && dy<1.6){
          foe.takeHit({dmg:p.dmg,kb:p.kb,stun:.3,launch:p.kind==='beam'}, Math.sign(p.vel.x), foe.state===ST.BLOCK);
          this.spawnImpact({...p.pos}, p.col, true); this.doShake(p.kind==='beam'?1.6:.7,.25);
          if(p.kind!=='beam'){ this.projectiles.splice(i,1); continue; }
        }
      }
      if(Math.abs(p.pos.x)>50 || p.life<=0){
        if(p.life<=0 && p.kind!=='beam') this.spawnImpact({...p.pos}, p.col, false);
        this.projectiles.splice(i,1);
      }
    }
  }

  // main fixed-step update
  update(dt){
    if(this.paused){ return; }   // hard pause: nothing advances, not even particles
    if(this.done){ this.particles.update(dt); return; }
    if(this.slowTimer>0){ this.slowTimer-=dt; if(this.slowTimer<=0) this.slowmo=1; }
    if(this.comboFlash>0) this.comboFlash=Math.max(0,this.comboFlash-dt*3);
    if(this.flash.a>0) this.flash.a=Math.max(0,this.flash.a-dt*2.5);
    if(this.shake.t>0){ this.shake.t-=dt; const m=this.shake.mag;
      this.shake.x=rand(-1,1)*m*.35; this.shake.y=rand(-1,1)*m*.35; if(this.shake.t<=0) this.shake.mag=0; }
    else { this.shake.x*=.6; this.shake.y*=.6; }

    const sdt=dt*this.slowmo;
    const [a,b]=this.fighters;
    this.pollControls(a, MAP_P1);
    this.aiControl(b, a, sdt);
    this.stepFighter(a, b, sdt);
    this.stepFighter(b, a, sdt);
    this.stepProjectiles(sdt);
    const gap=Math.abs(a.pos.x-b.pos.x);
    if(gap<1.3){ const push=(1.3-gap)/2*Math.sign(a.pos.x-b.pos.x||1); a.pos.x+=push; b.pos.x-=push; }
    this.particles.update(sdt);

    this.timer-=sdt;
    if(a.state===ST.DEAD || b.state===ST.DEAD){ a._kot+=sdt;
      if(a._kot>1.6){ this.winner = (a.hp<=0&&b.hp<=0)?(a.hp>b.hp?a:b):(a.hp<=0?b:a); this.done=true; } }
    if(this.timer<=0){ this.timer=0; this.winner = a.hp>b.hp?a:(b.hp>a.hp?b:null); this.done=true; }
  }
}

export { rand, clamp, lerp, TAU };
