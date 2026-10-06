import React, {useState} from 'react';
import {Popover} from 'antd';
import {Node, NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps} from '@tiptap/react';
import {VideoPanel} from './ToolPanels';
import {VideoPlayer} from './VideoPlayer';
import {alignMediaAtBlockStart,convertVideoToCenterWrap} from './CenterImageWrap';
import type {ImageAlignment,ImageLayout} from './EditorImage';

export type EditorVideoData={src:string;width:number|null;height:number|null;originalSize:boolean;layout:ImageLayout;align:ImageAlignment;muted:boolean;kind:'video'};

const dimension=(value:string|null)=>value&&Number.isFinite(Number(value))&&Number(value)>0?Number(value):null;

function EditorVideoView({node,editor,getPos,updateAttributes,selected}:NodeViewProps){
 const attrs=node.attrs as EditorVideoData;
 const [open,setOpen]=useState(false);
 return <NodeViewWrapper as="span" className={`editor-video${selected?' is-selected':''}${open?' is-settings-open':''}`} data-editor-video="" data-layout={attrs.layout} data-align={attrs.align} contentEditable={false} draggable="true" style={{width:attrs.originalSize?200:attrs.width??200,height:attrs.originalSize?200:attrs.height??200}}>
  <VideoPlayer src={attrs.src} muted={attrs.muted} onMutedChange={muted=>updateAttributes({muted})}/>
  <span className="editor-video-overlay" aria-hidden="true"/>
  <span className="editor-video-drag" data-drag-handle draggable="true" title="Переместить видео"><img src="/icons/image-drag.svg" alt="" draggable={false}/></span>
  <Popover trigger="click" placement="bottom" arrow={{pointAtCenter:true}} open={open} onOpenChange={setOpen} destroyOnHidden overlayClassName="editor-popover panel-video" content={<div role="dialog" aria-label="Настройка видео" onKeyDown={event=>{if(event.key==='Escape'){event.stopPropagation();setOpen(false);}}}><VideoPanel close={()=>setOpen(false)} actions={{selected:attrs,insert:data=>data.layout==='wrap'&&data.align==='center'?convertVideoToCenterWrap(editor,getPos,data):data.layout==='wrap'?alignMediaAtBlockStart(editor,getPos,data,'editorVideo'):(updateAttributes(data),true)}}/></div>}>
   <button type="button" className="editor-video-settings" aria-label="Настроить видео" aria-expanded={open} onMouseDown={event=>event.preventDefault()} onClick={event=>event.stopPropagation()}><img src={open?'/icons/image-settings-active.svg':'/icons/image-settings.svg'} alt=""/></button>
  </Popover>
 </NodeViewWrapper>;
}

export const EditorVideo=Node.create({
 name:'editorVideo',group:'inline',inline:true,atom:true,selectable:true,draggable:true,
 addAttributes(){return {
  src:{default:'',parseHTML:element=>element.getAttribute('data-src')??''},
  width:{default:null,parseHTML:element=>dimension(element.getAttribute('data-width'))},
  height:{default:null,parseHTML:element=>dimension(element.getAttribute('data-height'))},
  originalSize:{default:true,parseHTML:element=>element.getAttribute('data-original-size')!=='false'},
  layout:{default:'inline',parseHTML:element=>element.getAttribute('data-layout')??'inline'},
  align:{default:'left',parseHTML:element=>element.getAttribute('data-align')??'left'},
  muted:{default:false,parseHTML:element=>element.getAttribute('data-muted')==='true'},
  kind:{default:'video',parseHTML:()=> 'video'},
 };},
 parseHTML(){return [{tag:'span[data-editor-video]'}];},
 renderHTML({node}){const a=node.attrs as EditorVideoData;return ['span',{class:'editor-video','data-editor-video':'','data-src':a.src,'data-width':a.width,'data-height':a.height,'data-original-size':String(a.originalSize),'data-layout':a.layout,'data-align':a.align,'data-muted':String(a.muted),contenteditable:'false'},['a',{href:a.src,target:'_blank',rel:'noopener noreferrer'},'Видео']];},
 addNodeView(){return ReactNodeViewRenderer(EditorVideoView);},
});
