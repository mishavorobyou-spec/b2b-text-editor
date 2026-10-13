import React, {useEffect,useRef} from 'react';

const SPACING=25;
const FRAME_MS=1000/30;
const LIGHT=[187,215,255] as const; // #BBD7FF
const WAVE=[22,119,255] as const; // #1677FF

export function DotGridWave(){
 const canvasRef=useRef<HTMLCanvasElement>(null);

 useEffect(()=>{
  const canvas=canvasRef.current;
  const host=canvas?.parentElement;
  const ctx=canvas?.getContext('2d',{alpha:false});
  if(!canvas||!host||!ctx)return;

  const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  const cursor={x:-1000,y:-1000,active:false};
  let width=0,height=0,scale=1,frame=0,lastFrame=0,visible=true;

  const draw=(time:number)=>{
   ctx.fillStyle='#ffffff';
   ctx.fillRect(0,0,width,height);
   const phase=time*.00032;
   const cursorRadius=175;
   for(let y=SPACING/2;y<height;y+=SPACING){
    for(let x=SPACING/2;x<width;x+=SPACING){
     const bendX=Math.sin(y*.006+phase*1.1)*52+Math.sin(y*.015-phase*.7)*19;
     const bendY=Math.sin(x*.005-phase*.9)*45;
     const primary=Math.sin((x+bendX)*.013+(y+bendY)*.009-phase*3.1);
     const secondary=Math.sin((x-bendX*.6)*.006-y*.012+phase*1.3);
     const wave=Math.min(1,Math.pow(Math.max(0,(primary+secondary*.27)/1.1),4));
     const dx=x-cursor.x,dy=y-cursor.y;
     const distance=Math.hypot(dx,dy);
     const lens=cursor.active?Math.exp(-distance*distance/(2*cursorRadius*cursorRadius)):0;
     const ripple=cursor.active?Math.max(0,Math.sin(distance*.052-time*.006))*lens*.3:0;
     const strength=Math.min(1,wave+lens*.72+ripple);
     const radius=.5+.5*Math.min(1,wave+lens*.9+ripple);
     const shift=lens*7;
     const px=x+(distance?dx/distance*shift:0);
     const py=y+(distance?dy/distance*shift:0);
     const r=Math.round(LIGHT[0]+(WAVE[0]-LIGHT[0])*strength);
     const g=Math.round(LIGHT[1]+(WAVE[1]-LIGHT[1])*strength);
     ctx.beginPath();
     ctx.arc(px,py,radius,0,Math.PI*2);
     ctx.fillStyle=`rgb(${r},${g},255)`;
     ctx.fill();
    }
   }
  };

  const resize=()=>{
   const rect=host.getBoundingClientRect();
   width=rect.width;height=rect.height;
   scale=Math.min(window.devicePixelRatio||1,1.5,Math.sqrt(4_000_000/Math.max(1,width*height)));
   canvas.width=Math.max(1,Math.round(width*scale));
   canvas.height=Math.max(1,Math.round(height*scale));
   ctx.setTransform(scale,0,0,scale,0,0);
   draw(performance.now());
  };
  const tick=(time:number)=>{
   if(!visible||document.hidden||motion.matches)return;
   if(time-lastFrame>=FRAME_MS){draw(time);lastFrame=time;}
   frame=requestAnimationFrame(tick);
  };
  const start=()=>{cancelAnimationFrame(frame);if(visible&&!document.hidden&&!motion.matches)frame=requestAnimationFrame(tick);else draw(0);};
  const onPointerMove=(event:PointerEvent)=>{
   const rect=host.getBoundingClientRect();
   cursor.x=event.clientX-rect.left;cursor.y=event.clientY-rect.top;
   cursor.active=cursor.x>=0&&cursor.x<rect.width&&cursor.y>=0&&cursor.y<rect.height;
  };
  const onPointerLeave=()=>{cursor.active=false;};
  const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;start();});
  const resizeObserver=new ResizeObserver(resize);
  observer.observe(host);
  resizeObserver.observe(host);
  document.addEventListener('pointermove',onPointerMove,{passive:true});
  document.addEventListener('pointerleave',onPointerLeave);
  document.addEventListener('visibilitychange',start);
  motion.addEventListener('change',start);
  resize();start();
  return ()=>{
   cancelAnimationFrame(frame);
   observer.disconnect();resizeObserver.disconnect();
   document.removeEventListener('pointermove',onPointerMove);
   document.removeEventListener('pointerleave',onPointerLeave);
   document.removeEventListener('visibilitychange',start);
   motion.removeEventListener('change',start);
  };
 },[]);

 return <div className="dot-grid-wave" aria-hidden="true"><canvas ref={canvasRef}/></div>;
}
