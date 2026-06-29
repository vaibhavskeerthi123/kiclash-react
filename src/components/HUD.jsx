import React, { useRef, useEffect } from 'react';

const TAU=Math.PI*2;
const clamp=(x,a,b)=>x<a?a:x>b?b:x;
const lerp=(a,b,t)=>a+(b-a)*t;

// 2D overlay HUD that reads live from the World each animation frame.
export default function HUD({ world }){
  const canvasRef=useRef();
  const hudHp=useRef([1,1]);
  const portraits=useRef({});   // id -> HTMLImageElement (or null while loading)

  // preload placeholder portrait images for the two fighters
  useEffect(()=>{
    world.fighters.forEach(f=>{
      const id=f.def.id;
      if(portraits.current[id]!==undefined) return;
      portraits.current[id]=null;
      const img=new Image();
      img.onload=()=>{ portraits.current[id]=img; };
      img.onerror=()=>{ portraits.current[id]='missing'; };
      img.src=`portraits/${id}.png`;   // drop your own at public/portraits/<id>.png
    });
  }, [world]);

  useEffect(()=>{
    const canvas=canvasRef.current;
    const ux=canvas.getContext('2d');
    let raf, DPR=Math.min(devicePixelRatio||1,2);
    // size from the canvas's own client box (set by CSS to fill the viewport).
    // Falls back to innerWidth if the box hasn't laid out yet.
    let CW=innerWidth, CH=innerHeight;
    function resize(){ DPR=Math.min(devicePixelRatio||1,2);
      const r=canvas.getBoundingClientRect();
      CW=Math.round(r.width)||innerWidth; CH=Math.round(r.height)||innerHeight;
      canvas.width=CW*DPR; canvas.height=CH*DPR; ux.setTransform(DPR,0,0,DPR,0,0); }
    resize();
    addEventListener('resize', resize);
    const onOrient=()=>{ resize(); setTimeout(resize, 250); setTimeout(resize, 600); };
    addEventListener('orientationchange', onOrient);

    // draw a character portrait box (image if present, else colored badge)
    function drawPortrait(f, px, py, size){
      const img=portraits.current[f.def.id];
      ux.save();
      // frame
      ux.beginPath(); ux.rect(px,py,size,size);
      ux.fillStyle='#0c1020'; ux.fill();
      if(img && img!=='missing'){
        // cover-fit the image
        const ar=img.width/img.height; let dw=size,dh=size,dx=px,dy=py;
        if(ar>1){ dh=size; dw=size*ar; dx=px-(dw-size)/2; } else { dw=size; dh=size/ar; dy=py-(dh-size)/2; }
        ux.save(); ux.beginPath(); ux.rect(px,py,size,size); ux.clip();
        ux.drawImage(img,dx,dy,dw,dh); ux.restore();
      } else {
        // placeholder badge: gradient + initial
        const g=ux.createRadialGradient(px+size*0.4,py+size*0.35,2,px+size*0.5,py+size*0.5,size*0.7);
        const c=f.def.body; g.addColorStop(0,'#fff'); g.addColorStop(0.55,`rgb(${c.map(v=>v*255|0).join(',')})`); g.addColorStop(1,'#0a0a14');
        ux.fillStyle=g; ux.fillRect(px,py,size,size);
        ux.fillStyle='rgba(255,255,255,.92)'; ux.font=`900 ${Math.round(size*0.5)}px Trebuchet MS`;
        ux.textAlign='center'; ux.textBaseline='middle';
        ux.fillText(f.def.name[0], px+size/2, py+size/2+1);
        ux.textBaseline='alphabetic';
      }
      // border, glow with ki color
      const kc=f.kiColor;
      ux.strokeStyle=`rgb(${kc.map(v=>v*255|0).join(',')})`; ux.lineWidth=2.5;
      ux.shadowColor=ux.strokeStyle; ux.shadowBlur=10; ux.strokeRect(px,py,size,size);
      ux.restore();
    }

    function skewBar(x,y,w,h,frac,fill,right,sk){
      ux.save(); ux.fillStyle=fill; ux.beginPath(); const fw=w*frac;
      if(right){ const x1=x+w; ux.moveTo(x1,y); ux.lineTo(x1-fw,y); ux.lineTo(x1-fw-sk,y+h); ux.lineTo(x1-sk,y+h); }
      else { ux.moveTo(x+sk,y); ux.lineTo(x+sk+fw,y); ux.lineTo(x+fw,y+h); ux.lineTo(x,y+h); }
      ux.closePath(); ux.fill(); ux.restore();
    }
    function skewFrame(x,y,w,h,right,sk){
      ux.save(); ux.strokeStyle='rgba(255,255,255,.6)'; ux.lineWidth=2; ux.beginPath();
      if(right){ const x1=x+w; ux.moveTo(x1,y); ux.lineTo(x1-w,y); ux.lineTo(x1-w-sk,y+h); ux.lineTo(x1-sk,y+h); }
      else { ux.moveTo(x+sk,y); ux.lineTo(x+sk+w,y); ux.lineTo(x+w,y+h); ux.lineTo(x,y+h); }
      ux.closePath(); ux.stroke(); ux.restore();
    }

    function draw(){
      const VW=CW, VH=CH;
      ux.clearRect(0,0,VW,VH);
      const F=world.fighters;
      // responsive sizing: smaller bars + padding on narrow screens; reserve skew room
      const small = VW < 720;
      const pad = small ? 8 : 18;
      const skew = small ? 8 : 16;
      const barH = small ? 14 : 22;
      const portrait = small ? 38 : 60;     // character portrait box size
      const gap = small ? 6 : 10;
      // width must leave room for pad + portrait + skew on each side
      const barW = Math.max(60, Math.min(VW*0.40 - skew - portrait - gap, 420));
      const tnow=performance.now()/1000;
      for(let s=0;s<2;s++){
        const f=F[s], right=s===1;
        // portrait sits at the outer edge; bars sit inward of it
        const portX = right ? VW-pad-portrait : pad;
        const x = right ? VW-pad-portrait-gap-barW : pad+portrait+gap;
        const y = pad;
        drawPortrait(f, portX, y, portrait);
        const hpf=clamp(f.hp/f.maxhp,0,1); hudHp.current[s]=lerp(hudHp.current[s],hpf,0.12);
        // soft glow under the bar
        ux.save(); ux.shadowColor='rgba(60,200,255,.5)'; ux.shadowBlur=small?6:14;
        skewBar(x,y,barW,barH,hudHp.current[s],'#f4d23a',right,skew);
        ux.restore();
        // health fill: green->yellow->red by amount, with low-health pulse
        let grad;
        if(hpf>0.35){ grad=ux.createLinearGradient(x,0,x+barW,0); grad.addColorStop(0,'#37d6ff'); grad.addColorStop(1,'#37ff8b'); }
        else { const pulse=0.55+0.45*Math.sin(tnow*8); grad=`rgba(255,${Math.round(60+60*pulse)},40,1)`; }
        skewBar(x,y,barW,barH,hpf,grad,right,skew);
        // segment notches across the bar
        ux.save(); ux.strokeStyle='rgba(0,0,0,.35)'; ux.lineWidth=1.5;
        const notches=8;
        for(let i=1;i<notches;i++){ const fx = right ? x+barW - (barW/notches)*i : x+(barW/notches)*i;
          ux.beginPath(); ux.moveTo(fx + (right?-skew:skew)*0, y); ux.lineTo(fx - skew, y+barH); ux.stroke(); }
        ux.restore();
        skewFrame(x,y,barW,barH,right,skew);
        // ki bar
        skewBar(x,y+barH+5,barW*0.9,9,clamp(f.ki/f.maxki,0,1),'#ff9a2e',right,12);
        skewFrame(x,y+barH+5,barW*0.9,9,right,12);
        // blast pips
        const segs=5, sw=(barW*0.55)/segs;
        for(let i=0;i<segs;i++){ const on=(f.blast/100)*segs>i;
          const bx=right?VW-pad-(i+1)*sw:x+i*sw;
          if(on){ ux.save(); ux.shadowColor='#ffd23f'; ux.shadowBlur=8; }
          ux.fillStyle=on?'#ffd23f':'rgba(255,255,255,.14)';
          ux.beginPath(); ux.ellipse(bx+sw/2,y+barH+24,sw*0.32,5,0,0,TAU); ux.fill();
          if(on) ux.restore(); }
        // name + ready-to-ult indicator (anchored to the bar's inner edge)
        ux.fillStyle='#fff'; ux.font=`900 ${small?12:18}px Trebuchet MS`; ux.textAlign=right?'right':'left';
        const label=f.def.name+(f.transformed?' \u26a1':'')+(f.blast>=100?'  \u25c6 ULT':'');
        const nameX = right ? VW-pad-portrait-gap : pad+portrait+gap;
        ux.fillText(label, nameX, y+barH+(small?30:48));
      }
      // timer node
      ux.fillStyle='#0d1830'; ux.beginPath(); ux.arc(VW/2,pad+16,18,0,TAU); ux.fill();
      ux.strokeStyle='#37d6ff'; ux.lineWidth=3; ux.stroke();
      ux.fillStyle='#fff'; ux.font='900 22px Trebuchet MS'; ux.textAlign='center'; ux.textBaseline='middle';
      ux.fillText(Math.ceil(world.timer), VW/2, pad+16); ux.textBaseline='alphabetic';
      // combo counters
      for(let s=0;s<2;s++){ const f=F[s];
        if(f.combo>=2){ const a=clamp(f.comboTimer/2,0,1); ux.save(); ux.globalAlpha=a; ux.textAlign='center';
          const cx=s===0?VW*0.3:VW*0.7, sc=1+(1-a)*0.4+world.comboFlash*0.3;
          ux.translate(cx,VH*0.32); ux.scale(sc,sc);
          ux.fillStyle='#ffd23f'; ux.font='900 52px Trebuchet MS'; ux.fillText(f.combo,0,0);
          ux.fillStyle='#fff'; ux.font='900 18px Trebuchet MS'; ux.fillText('HITS',0,24); ux.restore(); } }
      // screen flash + hit vignette
      if(world.flash.a>0){ const c=world.flash.col;
        ux.fillStyle=`rgba(${c[0]*255|0},${c[1]*255|0},${c[2]*255|0},${world.flash.a})`; ux.fillRect(0,0,VW,VH); }
      for(let s=0;s<2;s++){ if(F[s].flashHit>0.1){
        const g=ux.createRadialGradient(VW/2,VH/2,VH*0.3,VW/2,VH/2,VH*0.75);
        g.addColorStop(0,'rgba(255,40,40,0)'); g.addColorStop(1,`rgba(255,30,30,${F[s].flashHit*0.4})`);
        ux.fillStyle=g; ux.fillRect(0,0,VW,VH); } }

      raf=requestAnimationFrame(draw);
    }
    draw();
    return ()=>{ cancelAnimationFrame(raf); removeEventListener('resize', resize); removeEventListener('orientationchange', onOrient); };
  }, [world]);

  return <canvas ref={canvasRef} className="hud" />;
}
