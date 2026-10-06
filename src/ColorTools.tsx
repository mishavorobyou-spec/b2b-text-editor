import React, {useState} from 'react';
import {Input} from 'antd';
import {icons} from './all-assets';
import {panelAssets} from './panel-assets';
import type {ColorTool} from './useTextDocument';
import './color-tools.css';

const swatches=['#000000','#1F1F1F','#595959','#8C8C8C','#BFBFBF','#D9D9D9','#E8E8E8','#EEEEEE','#F5F5F5','#FFFFFF','#FF4D4F','#FA8C16','#FADB14','#A0D911','#52C41A','#13C2C2','#1677FF','#2F54EB','#722ED1','#EB2F96','#FFCCC7','#FFE7BA','#FFF1B8','#EAFF8F','#D9F7BE','#B5F5EC','#BAE0FF','#D6E4FF','#EFDBFF','#FFD6E7'];
const asset=panelAssets['6716:88899'];
let recentColors:string[]=[];
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
const toHex=(value:number)=>Math.round(value).toString(16).padStart(2,'0').toUpperCase();
function hsvToHex(h:number,s:number,v:number){
 const f=(n:number)=>{const k=(n+h/60)%6;return (v-v*s*Math.max(Math.min(k,4-k,1),0))*255;};
 return `#${toHex(f(5))}${toHex(f(3))}${toHex(f(1))}`;
}
function hexToHsv(hex:string){
 const channels=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
 const [r,g,b]=channels,max=Math.max(...channels),min=Math.min(...channels),d=max-min;
 let h=0;if(d){if(max===r)h=((g-b)/d)%6;else if(max===g)h=(b-r)/d+2;else h=(r-g)/d+4;h=(h*60+360)%360;}
 return {h,s:max?d/max:0,v:max};
}
function parseColor(color:string|null){
 if(!color)return {hex:'#1677FF',alpha:100};
 const full=/^#([0-9a-f]{6})$/i.exec(color),short=/^#([0-9a-f]{3})$/i.exec(color);
 if(full)return {hex:color.toUpperCase(),alpha:100};
 if(short)return {hex:'#'+short[1].split('').map(c=>c+c).join('').toUpperCase(),alpha:100};
 const rgba=/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/i.exec(color);
 if(rgba)return {hex:'#'+toHex(Number(rgba[1]))+toHex(Number(rgba[2]))+toHex(Number(rgba[3])),alpha:rgba[4]?Math.round(Number(rgba[4])*100):100};
 return {hex:'#1677FF',alpha:100};
}
function withAlpha(hex:string,alpha:number){
 if(alpha===100)return hex;
 const [r,g,b]=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
 return `rgba(${r}, ${g}, ${b}, ${Number((alpha/100).toFixed(2))})`;
}

export function ColorPanel({tool,value,onApply,deferred=false,onDone}:{tool:ColorTool;value:string|null;onApply:(tool:ColorTool,color:string|null)=>void;deferred?:boolean;onDone?:()=>void}){
 const initial=parseColor(value);
 const [hex,setHex]=useState(initial.hex),[hexDraft,setHexDraft]=useState(initial.hex.slice(1));
 const [alpha,setAlpha]=useState(initial.alpha),[hue,setHue]=useState(hexToHsv(initial.hex).h);
 const [draftColor,setDraftColor]=useState<string|null>(value);
 const [recommendedOpen,setRecommendedOpen]=useState(true),[recentOpen,setRecentOpen]=useState(true);
 const [recent,setRecent]=useState(recentColors);
 const hsv=hexToHsv(hex);
 const commit=(nextHex:string,nextAlpha=alpha,keepHue?:number)=>{
  setHex(nextHex);setHexDraft(nextHex.slice(1));setHue(keepHue??hexToHsv(nextHex).h);setAlpha(nextAlpha);
  const color=withAlpha(nextHex,nextAlpha);setDraftColor(color);
  if(!deferred){onApply(tool,color);recentColors=[color,...recentColors.filter(item=>item!==color)].slice(0,10);setRecent(recentColors);}
 };
 const chooseHex=()=>{const raw=hexDraft.replace(/^#/,'').trim();const normalized=/^[0-9a-f]{3}$/i.test(raw)?raw.split('').map(c=>c+c).join(''):/^[0-9a-f]{6}$/i.test(raw)?raw:null;if(normalized)commit('#'+normalized.toUpperCase());else setHexDraft(hex.slice(1));};
 const changePalette=(event:React.PointerEvent<HTMLDivElement>)=>{
  const rect=event.currentTarget.getBoundingClientRect();
  const s=clamp((event.clientX-rect.left)/rect.width,0,1),v=1-clamp((event.clientY-rect.top)/rect.height,0,1);
  commit(hsvToHex(hue,s,v),alpha,hue);
 };
 return <div className="tool-panel color-panel" onMouseDown={event=>{if(!(event.target instanceof HTMLInputElement))event.preventDefault();}}>
  <div className="panel-title-row"><h2>{tool==='color'?'Цвет текста':tool==='highlight'?'Цвет подчеркивания':'Цвет фона ячейки'}</h2><button type="button" className="clear-color" aria-label="Сбросить цвет" onClick={()=>{setDraftColor(null);if(!deferred)onApply(tool,null);setHex('#1677FF');setHexDraft('1677FF');setAlpha(100);setHue(210);}}><img src={asset.imgColor} alt=""/></button></div>
  <div className="color-palette" role="slider" tabIndex={0} aria-label="Палитра цвета" aria-valuetext={hex} style={{backgroundColor:`hsl(${hue} 100% 50%)`}} onPointerDown={event=>{event.currentTarget.setPointerCapture(event.pointerId);changePalette(event);}} onPointerMove={event=>{if(event.buttons)changePalette(event);}} onKeyDown={event=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();const nextS=clamp(hsv.s+(event.key==='ArrowLeft'?-.05:event.key==='ArrowRight'?.05:0),0,1);const nextV=clamp(hsv.v+(event.key==='ArrowDown'?-.05:event.key==='ArrowUp'?.05:0),0,1);commit(hsvToHex(hue,nextS,nextV));}}}><span className="color-palette-cursor" style={{left:`${hsv.s*100}%`,top:`${(1-hsv.v)*100}%`}}/></div>
  <div className="color-controls"><div className="color-sliders"><input className="color-hue-input" type="range" min="0" max="360" value={hue} aria-label="Оттенок" onChange={event=>{const next=Number(event.target.value);commit(hsvToHex(next,hsv.s,hsv.v),alpha,next);}}/><input className="color-alpha-input" type="range" min="0" max="100" value={alpha} aria-label="Непрозрачность" style={{'--current-color':hex} as React.CSSProperties} onChange={event=>commit(hex,Number(event.target.value),hue)}/></div><span className="color-preview" style={{backgroundColor:withAlpha(hex,alpha)}}/></div>
  <div className="color-values"><span>HEX <img src={icons.imgIconDownOutlined} alt=""/></span><Input size="small" value={hexDraft} prefix="#" aria-label="HEX цвета" maxLength={7} onChange={event=>setHexDraft(event.target.value.replace(/^#/,'').toUpperCase())} onBlur={chooseHex} onPressEnter={chooseHex}/><Input size="small" type="number" min={0} max={100} value={alpha} aria-label="Непрозрачность в процентах" onChange={event=>{const next=clamp(Number(event.target.value)||0,0,100);commit(hex,next);}}/></div>
  <div className="color-presets"><button type="button" className="color-caption" aria-expanded={recommendedOpen} onClick={()=>setRecommendedOpen(!recommendedOpen)}><img src={icons.imgIconDownOutlined} alt=""/>Recommended</button>{recommendedOpen&&<div className="color-swatches">{swatches.map(color=><button key={color} type="button" aria-label={`Цвет ${color}`} aria-pressed={draftColor?.toUpperCase()===color} style={{backgroundColor:color}} onClick={()=>commit(color,100)}>{hex===color&&alpha===100&&<img src={asset.imgCheck} alt=""/>}</button>)}</div>}<button type="button" className="color-caption" aria-expanded={recentOpen} onClick={()=>setRecentOpen(!recentOpen)}><img src={icons.imgIconDownOutlined} alt=""/>Recent</button>{recentOpen&&(recent.length?<div className="color-swatches color-recent">{recent.map(color=><button key={color} type="button" aria-label={`Недавний цвет ${color}`} style={{backgroundColor:color}} onClick={()=>{const parsed=parseColor(color);commit(parsed.hex,parsed.alpha);}}/>)}</div>:<span className="color-empty">Empty</span>)}</div>
  {deferred&&<div className="color-panel-footer"><button type="button" onClick={onDone}>Отменить</button><button type="button" className="color-apply" onClick={()=>{onApply(tool,draftColor);if(draftColor){recentColors=[draftColor,...recentColors.filter(item=>item!==draftColor)].slice(0,10);setRecent(recentColors);}onDone?.();}}>Применить</button></div>}
 </div>;
}
