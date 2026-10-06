import React, {useState} from 'react';
import {Popover} from 'antd';
import {Node, NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps} from '@tiptap/react';
import {ImagePanel} from './ToolPanels';
import {alignMediaAtBlockStart,convertImageToCenterWrap} from './CenterImageWrap';

export type ImageLayout='break'|'inline'|'wrap';
export type ImageAlignment='left'|'center'|'right';
export type EditorImageData={
 src:string;
 name:string;
 width:number|null;
 height:number|null;
 href:string;
 originalSize:boolean;
 layout:ImageLayout;
 align:ImageAlignment;
};

const dimension=(value:string|null)=>value&&Number.isFinite(Number(value))&&Number(value)>0?Number(value):null;

function EditorImageView({node,editor,getPos,updateAttributes,selected}:NodeViewProps){
 const [open,setOpen]=useState(false);
 const attrs=node.attrs as EditorImageData;
 const picture=<img src={attrs.src} alt={attrs.name||'Изображение'} draggable={false} style={attrs.originalSize?undefined:{...(attrs.width?{width:attrs.width}:{}),...(attrs.height?{height:attrs.height}:{})}}/>;
 return <NodeViewWrapper as="span" className={`editor-image${selected?' is-selected':''}${open?' is-settings-open':''}`} data-editor-image="" data-layout={attrs.layout} data-align={attrs.align} contentEditable={false} draggable="true">
   <span className="editor-image-media">{attrs.href?<a href={attrs.href} target="_blank" rel="noopener noreferrer">{picture}</a>:picture}</span>
   <span className="editor-image-overlay" aria-hidden="true"/>
   <span className="editor-image-drag" data-drag-handle draggable="true" title="Переместить изображение"><img src="/icons/image-drag.svg" alt="" draggable={false}/></span>
   <Popover trigger="click" placement="bottom" arrow={{pointAtCenter:true}} open={open} onOpenChange={setOpen} destroyOnHidden overlayClassName="editor-popover panel-image" content={<div role="dialog" aria-label="Настройка изображения" onKeyDown={event=>{if(event.key==='Escape'){event.stopPropagation();setOpen(false);}}}><ImagePanel close={()=>setOpen(false)} actions={{selected:attrs,insert:data=>data.layout==='wrap'&&data.align==='center'?convertImageToCenterWrap(editor,getPos,data):data.layout==='wrap'?alignMediaAtBlockStart(editor,getPos,data,'editorImage'):(updateAttributes(data),true)}}/></div>}>
    <button type="button" className="editor-image-settings" aria-label="Настроить изображение" aria-expanded={open} onMouseDown={event=>event.preventDefault()} onClick={event=>event.stopPropagation()}><img src={open?'/icons/image-settings-active.svg':'/icons/image-settings.svg'} alt=""/></button>
   </Popover>
 </NodeViewWrapper>;
}

export const EditorImage=Node.create({
 name:'editorImage',group:'inline',inline:true,atom:true,selectable:true,draggable:true,
 addAttributes(){return {
  src:{default:'',parseHTML:element=>element.querySelector('img')?.getAttribute('src')??''},
  name:{default:'',parseHTML:element=>element.getAttribute('data-name')??''},
  width:{default:null,parseHTML:element=>dimension(element.getAttribute('data-width'))},
  height:{default:null,parseHTML:element=>dimension(element.getAttribute('data-height'))},
  href:{default:'',parseHTML:element=>element.querySelector('a')?.getAttribute('href')??''},
  originalSize:{default:true,parseHTML:element=>element.getAttribute('data-original-size')!=='false'},
  layout:{default:'inline',parseHTML:element=>element.getAttribute('data-layout')??'inline'},
  align:{default:'left',parseHTML:element=>element.getAttribute('data-align')??'left'},
 };},
 parseHTML(){return [{tag:'span[data-editor-image]'}];},
 renderHTML({node}){
  const attrs=node.attrs as EditorImageData;
  const image=['img',{src:attrs.src,alt:attrs.name||'Изображение',draggable:'false',...(attrs.originalSize?{}:{style:[attrs.width?`width:${attrs.width}px`:'',attrs.height?`height:${attrs.height}px`:''].filter(Boolean).join(';')})}];
  const content=attrs.href?['a',{href:attrs.href,target:'_blank',rel:'noopener noreferrer'},image]:image;
  return ['span',{class:'editor-image','data-editor-image':'','data-name':attrs.name,'data-layout':attrs.layout,'data-align':attrs.align,'data-original-size':String(attrs.originalSize),...(attrs.width?{'data-width':attrs.width}:{}),...(attrs.height?{'data-height':attrs.height}:{}),contenteditable:'false'},content];
 },
 addNodeView(){return ReactNodeViewRenderer(EditorImageView);},
});
