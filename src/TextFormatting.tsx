import React, {useEffect, useRef, useState} from 'react';
import {Button, Popover, Select, Tooltip} from 'antd';
import './formatting.css';

export type FormatTool = 'textType'|'font'|'fontSize';
export type TextFormat = Record<FormatTool,string|undefined>;
export const defaultFormat:TextFormat={textType:'Text',font:'Roboto',fontSize:'14'};
export const formatLabels={textType:'Тип текста',font:'Шрифт',fontSize:'Размер шрифта'};
export const formatOptions={textType:['Text','Heading 1','Heading 2','Heading 3','Heading 4','Heading 5'],font:['Roboto','Times New Roman','Open Sans','Noto Sans','Rubik'],fontSize:['10','12','14','16','18','20']};
const Down=()=> <img className="format-down" src="/icons/964af.svg" alt=""/>;

export function FormatSelect({tool,value,onChange,small=false,disabled=false,onOpenChange}:{tool:FormatTool;value?:string;onChange:(v:string)=>void;small?:boolean;disabled?:boolean;onOpenChange?:(open:boolean)=>void}){
 return <Select aria-label={formatLabels[tool]} className={small?`ed-select ed-select-${tool==='textType'?'type':tool==='font'?'font':'size'}`:'format-panel-select'} size={small?'small':'middle'} value={value} disabled={disabled} placeholder="Смешанное" onChange={onChange} onOpenChange={onOpenChange} suffixIcon={<Down/>} virtual={false} listHeight={192} classNames={{popup:{root:`format-options format-options-${tool}`}}} options={formatOptions[tool].map(v=>({value:v,label:v}))} optionRender={option=><span className="format-option"><span>{option.label}</span>{option.value===value&&<img src="/icons/422d3.svg" alt=""/>}</span>}/>;
}

export function FormatPanel({tool,value,onApply,onCancel}:{tool:FormatTool;value?:string;onApply:(v:string)=>void;onCancel:()=>void}){
 const [draft,setDraft]=useState(value);
 const [selectOpen,setSelectOpen]=useState(false);
 return <div className="tool-panel format-panel" role="dialog" aria-label={formatLabels[tool]} onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();if(!selectOpen)onCancel();}}}>
  <h2>{formatLabels[tool]}</h2>
  <FormatSelect tool={tool} value={draft} onChange={setDraft} onOpenChange={setSelectOpen}/>
  <div className="panel-footer"><Button onClick={onCancel}>Отменить</Button><Button type="primary" disabled={!draft} onClick={()=>draft&&onApply(draft)}>Применить</Button></div>
 </div>;
}

export function FormattingControls({compact,disabled,format,onChange,only}:{compact:boolean;disabled:boolean;format:TextFormat;onChange:(tool:FormatTool,value:string)=>void;only?:FormatTool[]}){
 const [open,setOpen]=useState<FormatTool|null>(null);
 const triggers=useRef<Partial<Record<FormatTool,HTMLButtonElement|null>>>({});
 useEffect(()=>{if(disabled)setOpen(null);},[disabled]);
 useEffect(()=>{
  if(!open)return;
  const dismiss=(event:MouseEvent)=>{const target=event.target;if(target instanceof Element&&!triggers.current[open]?.contains(target)&&!target.closest('.formatting-popover'))setOpen(null);};
  const dismissFromEditor=()=>setOpen(null);
  document.addEventListener('click',dismiss,true);
  document.addEventListener('editor-dismiss-popovers',dismissFromEditor);
  return()=>{document.removeEventListener('click',dismiss,true);document.removeEventListener('editor-dismiss-popovers',dismissFromEditor);};
 },[open]);
 return <>{(only??Object.keys(formatLabels) as FormatTool[]).map(tool=>compact?<Popover key={tool} trigger="click" placement="bottom" arrow={{pointAtCenter:true}} open={open===tool&&!disabled} onOpenChange={v=>setOpen(v?tool:null)} destroyOnHidden overlayClassName="editor-popover formatting-popover" content={<FormatPanel key={`${tool}-${open===tool}`} tool={tool} value={format[tool]} onApply={v=>{setOpen(null);onChange(tool,v);}} onCancel={()=>{setOpen(null);triggers.current[tool]?.focus();}}/>}>
  <Tooltip title={open===tool?null:formatLabels[tool]}><button ref={el=>{triggers.current[tool]=el;}} type="button" disabled={disabled} aria-label={formatLabels[tool]} aria-haspopup="dialog" aria-expanded={open===tool&&!disabled} className={`ed-tool format-trigger ${tool==='fontSize'?'ed-size':''}`} onKeyDown={e=>{if(e.key==='Escape')setOpen(null);}}>{tool==='fontSize'?<span>{format.fontSize??'—'}</span>:<img className="ed-icon" src={tool==='textType'?'/icons/0cc42.svg':'/icons/50951.svg'} alt=""/>}<img className="ed-caret" src="/icons/1decc.svg" alt=""/></button></Tooltip>
 </Popover>:<FormatSelect key={tool} tool={tool} small value={format[tool]} onChange={v=>onChange(tool,v)} disabled={disabled}/>)}</>;
}

