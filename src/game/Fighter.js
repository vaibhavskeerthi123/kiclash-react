import { ATTACKS, ST } from './roster.js';

const clamp=(x,a,b)=>x<a?a:x>b?b:x;
const lerp=(a,b,t)=>a+(b-a)*t;

// Pure logic fighter. Holds position/state; the renderer reads from it.
export class Fighter {
  constructor(def, x, facing, isP2){
    this.def=def; this.isP2=isP2;
    this.pos={x, y:0, z:0}; this.vel={x:0,y:0,z:0};
    this.facing=facing;
    this.hp=def.hp; this.maxhp=def.hp;
    this.ki=40; this.maxki=100; this.blast=0; this.maxblast=100;
    this.state=ST.IDLE; this.t=0; this.atk=null; this.atkName=null;
    this.hitThisSwing=false; this.combo=0; this.comboTimer=0;
    this.invuln=0; this.transformed=false; this.grounded=true;
    this.anim=0; this.flashHit=0; this.guardMeter=100; this.lockMove=false;
    this.specialKind=null; this._fired=false; this._kot=0; this.staggerT=0;
  }
  get color(){ return this.transformed?this.def.trans.body:this.def.body; }
  get kiColor(){ return this.transformed?this.def.trans.ki:this.def.ki; }
  get rimColor(){ return this.transformed?this.def.trans.rim:this.def.rim; }
  enter(s){ this.state=s; this.t=0; this.hitThisSwing=false; }

  startAttack(heavy){
    if([ST.STAGGER,ST.KNOCK,ST.DEAD,ST.SPECIAL].includes(this.state) || this.lockMove) return;
    if(!this.grounded){
      if(this.state===ST.AIR_ATK) return;
      this.atkName=heavy?'AIR_H':'AIR_L'; this.atk=ATTACKS[this.atkName]; this.enter(ST.AIR_ATK); return;
    }
    if(this.state===ST.ATK){
      const cur=this.atk;
      if(cur && cur.next && this.t>cur.startup+cur.active*0.5){
        this.atkName=heavy?'H':cur.next; this.atk=ATTACKS[this.atkName]; this.enter(ST.ATK);
      }
      return;
    }
    if(![ST.IDLE,ST.WALK,ST.DASH].includes(this.state)) return;
    this.atkName=heavy?'H':'L1'; this.atk=ATTACKS[this.atkName]; this.enter(ST.ATK);
  }
  startBlock(on){ if(on){ if([ST.IDLE,ST.WALK].includes(this.state)) this.enter(ST.BLOCK); } else if(this.state===ST.BLOCK) this.enter(ST.IDLE); }
  startCharge(on){ if(on){ if([ST.IDLE,ST.WALK].includes(this.state)) this.enter(ST.CHARGE); } else if(this.state===ST.CHARGE) this.enter(ST.IDLE); }
  dash(dir){
    if(this.ki<12 || [ST.STAGGER,ST.KNOCK,ST.DEAD,ST.SPECIAL].includes(this.state)) return;
    this.ki-=12; this.invuln=0.22; this.vel.x=dir*this.def.speed*3.4; this.enter(ST.DASH);
    this.onDash && this.onDash();
  }
  jump(){ if(this.grounded && [ST.IDLE,ST.WALK].includes(this.state)){ this.vel.y=12; this.grounded=false; this.enter(ST.JUMP); this.onJump&&this.onJump(); } }
  fireSpecial(kind){
    if(this.lockMove) return false;
    const cost = kind==='rush'?40:30;
    if(this.ki<cost || [ST.STAGGER,ST.KNOCK,ST.DEAD].includes(this.state)) return false;
    this.ki-=cost; this.enter(ST.SPECIAL); this.specialKind=kind; this.lockMove=true; this._fired=false; return true;
  }
  fireUltimate(){
    if(this.blast<100 || this.lockMove) return false;
    this.blast=0; this.enter(ST.SPECIAL); this.specialKind='ult'; this.lockMove=true; this._fired=false; return true;
  }
  transform(){ if(this.transformed || this.ki<60) return; this.ki-=60; this.transformed=true; this.onTransform && this.onTransform(); }

  takeHit(m, fromDir, blocked){
    if(this.invuln>0 && !blocked) return false;
    this.flashHit=1;
    if(blocked){
      this.hp-=m.dmg*0.12; this.guardMeter-=m.dmg*0.5; this.vel.x=fromDir*(m.kb||3)*0.4;
      this.blast=Math.min(this.maxblast,this.blast+3);
      if(this.guardMeter<=0){ this.guardMeter=100; this.enter(ST.STAGGER); this.staggerT=0.5; }
      return true;
    }
    const dmg=m.dmg*(this.transformed?0.85:1)/this.def.def;
    this.hp-=dmg; this.blast=Math.min(this.maxblast,this.blast+dmg*0.08);
    this.vel.x=fromDir*(m.kb||4);
    if(m.spike){ this.vel.y=-14; this.enter(ST.KNOCK); }
    else if(m.launch || (m.kb||0)>6){ this.vel.y=9; this.grounded=false; this.enter(ST.KNOCK); }
    else { this.enter(ST.STAGGER); this.staggerT=m.stun; }
    if(this.hp<=0){ this.hp=0; this.enter(ST.DEAD); }
    return true;
  }
}

export { clamp, lerp };
