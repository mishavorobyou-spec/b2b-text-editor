import React, {useEffect, useState} from 'react';
import {Popover} from 'antd';
import {Node, NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, type Editor, type NodeViewProps} from '@tiptap/react';
import {DOMSerializer, Fragment, type ResolvedPos} from '@tiptap/pm/model';
import {closeHistory} from '@tiptap/pm/history';
import {Plugin, TextSelection} from '@tiptap/pm/state';
import {ImagePanel, VideoPanel} from './ToolPanels';
import type {EditorImageData} from './EditorImage';
import type {EditorVideoData} from './EditorVideo';
import {VideoPlayer} from './VideoPlayer';

type CenterMediaData=(EditorImageData&{kind?:'image'})|EditorVideoData;
const isCenterWrap=(data:CenterMediaData)=>data.layout==='wrap'&&data.align==='center';

function paragraphRun(at:ResolvedPos){
 const depth=at.depth,parent=at.node(depth-1),index=at.index(depth-1);
 let first=index,last=index+1,from=at.before(depth),to=from+at.parent.nodeSize;
 while(first>0&&parent.child(first-1).type.name==='paragraph'&&parent.child(first-1).content.size){first--;from-=parent.child(first).nodeSize;}
 while(last<parent.childCount&&parent.child(last).type.name==='paragraph'&&parent.child(last).content.size){to+=parent.child(last).nodeSize;last++;}
 const hardBreak=at.doc.type.schema.nodes.hardBreak.create();
 let content=Fragment.empty,offset=0;
 for(let i=first;i<last;i++){
  if(i>first)content=content.append(Fragment.from(hardBreak));
  if(i===index)offset=content.size+at.parentOffset;
  content=content.append(parent.child(i).content);
 }
 return {parent,first,last,from,to,content,offset,attrs:parent.child(first).attrs};
}

function convertMediaToCenterWrap(editor:Editor,getPos:()=>number|undefined,data:CenterMediaData,mediaType:'editorImage'|'editorVideo'){
 const pos=getPos();if(typeof pos!=='number')return false;
 const {state}=editor,at=state.doc.resolve(pos),depth=at.depth;
 if(at.parent.type.name!=='paragraph'||depth<1||state.doc.nodeAt(pos)?.type.name!==mediaType)return false;
 const run=paragraphRun(at);
 const wrapType=state.schema.nodes.centerImageWrap;
 if(!run.parent.canReplaceWith(run.first,run.last,wrapType))return false;
 const offset=run.offset;
 const content=run.content.cut(0,offset).append(run.content.cut(offset+1));
 const left=state.schema.nodes.paragraph.create(run.attrs,content);
 const right=state.schema.nodes.paragraph.create(run.attrs);
 const below=state.schema.nodes.paragraph.create();
 const replacement=wrapType.create(data,[left,right,below]);
 const transaction=state.tr.replaceWith(run.from,run.to,replacement);
 transaction.setSelection(TextSelection.create(transaction.doc,run.from+2+Math.min(offset,left.content.size)));
 editor.view.dispatch(transaction);
 return true;
}
export const convertImageToCenterWrap=(editor:Editor,getPos:()=>number|undefined,data:EditorImageData)=>convertMediaToCenterWrap(editor,getPos,{...data,kind:'image'},'editorImage');
export const convertVideoToCenterWrap=(editor:Editor,getPos:()=>number|undefined,data:EditorVideoData)=>convertMediaToCenterWrap(editor,getPos,data,'editorVideo');

export function alignMediaAtBlockStart(editor:Editor,getPos:()=>number|undefined,data:CenterMediaData,mediaType:'editorImage'|'editorVideo'){
 const pos=getPos();if(typeof pos!=='number')return false;
 const {state}=editor,at=state.doc.resolve(pos),depth=at.depth;
 if(depth<1||at.parent.type.name!=='paragraph'||state.doc.nodeAt(pos)?.type.name!==mediaType)return false;
 const paragraph=at.parent,paragraphPos=at.before(depth),offset=pos-paragraphPos-1;
 const media=state.schema.nodes[mediaType].create(data);
 const content=Fragment.from(media).append(paragraph.content.cut(0,offset)).append(paragraph.content.cut(offset+1));
 const next=state.schema.nodes.paragraph.create(paragraph.attrs,content);
 const transaction=state.tr.replaceWith(paragraphPos,paragraphPos+paragraph.nodeSize,next);
 transaction.setSelection(TextSelection.create(transaction.doc,paragraphPos+2));
 editor.view.dispatch(transaction);
 return true;
}

function convertCenterWrapToMedia(editor:Editor,getPos:()=>number|undefined,data:CenterMediaData){
 const pos=getPos();if(typeof pos!=='number')return false;
 const {state}=editor,node=state.doc.nodeAt(pos);
 if(!node||node.type.name!=='centerImageWrap')return false;
 const [left,right,below]=[node.child(0),node.child(1),node.child(2)];
 const media=state.schema.nodes[data.kind==='video'?'editorVideo':'editorImage'].create(data);
 const atStart=data.layout==='wrap';
 const content=atStart?Fragment.from(media).append(left.content).append(right.content).append(below.content):left.content.append(Fragment.from(media)).append(right.content).append(below.content);
 const paragraph=state.schema.nodes.paragraph.create(left.attrs,content);
 const transaction=state.tr.replaceWith(pos,pos+node.nodeSize,paragraph);
 transaction.setSelection(TextSelection.create(transaction.doc,pos+1+(atStart?media.nodeSize:left.content.size+media.nodeSize)));
 editor.view.dispatch(transaction);
 return true;
}

function CenterImageWrapView({node,editor,getPos,updateAttributes,selected}:NodeViewProps){
 const attrs=node.attrs as CenterMediaData;
 const isVideo=attrs.kind==='video';
 const [open,setOpen]=useState(false);
 const [size,setSize]=useState({width:attrs.width??200,height:attrs.height??200});
 useEffect(()=>{if(!attrs.originalSize&&attrs.width&&attrs.height)setSize({width:attrs.width,height:attrs.height});},[attrs.originalSize,attrs.width,attrs.height]);
 const style={'--center-image-width':`${size.width}px`,'--center-image-height':`${size.height}px`} as React.CSSProperties;
 const save=(data:CenterMediaData)=>isCenterWrap(data)?(updateAttributes(data),true):convertCenterWrapToMedia(editor,getPos,data);
 const loaded=(event:React.SyntheticEvent<HTMLImageElement>)=>{const rect=event.currentTarget.getBoundingClientRect();setSize({width:rect.width,height:rect.height});requestAnimationFrame(()=>rebalance(editor.view));};
 const drag=(event:React.DragEvent<HTMLDivElement>)=>{
  if(!(event.target as Element).closest('[data-drag-handle]')){event.preventDefault();return;}
  const pos=getPos();if(typeof pos!=='number')return;
  event.dataTransfer.setData('application/x-b2b-center-image',String(pos));
  event.dataTransfer.effectAllowed='move';
  event.stopPropagation();
 };
 const remove=()=>{const pos=getPos();if(typeof pos!=='number')return;editor.view.dispatch(editor.state.tr.replaceWith(pos,pos+node.nodeSize,node.content));setOpen(false);editor.view.focus();};
 return <NodeViewWrapper as="div" className={`center-image-wrap${isVideo?' center-video-wrap':''}${selected?' is-selected':''}${open?' is-settings-open':''}`} data-center-image-wrap="" style={style}>
  <NodeViewContent as="div" className="center-image-wrap-content"/>
  <div className="center-image-wrap-picture" contentEditable={false} onDragStart={drag}>
   {isVideo?<VideoPlayer src={attrs.src} muted={attrs.muted} onMutedChange={muted=>updateAttributes({muted})}/>:attrs.href?<a href={attrs.href} target="_blank" rel="noopener noreferrer"><img src={attrs.src} alt={attrs.name||'Изображение'} draggable={false} style={attrs.originalSize?undefined:{...(attrs.width?{width:attrs.width}:{}),...(attrs.height?{height:attrs.height}:{})}} onLoad={loaded}/></a>:<img src={attrs.src} alt={attrs.name||'Изображение'} draggable={false} style={attrs.originalSize?undefined:{...(attrs.width?{width:attrs.width}:{}),...(attrs.height?{height:attrs.height}:{})}} onLoad={loaded}/>}
   <span className="editor-image-overlay" aria-hidden="true"/>
   <span className="editor-image-drag" data-drag-handle draggable="true" title={isVideo?'Переместить видео':'Переместить изображение'}><img src="/icons/image-drag.svg" alt="" draggable={false}/></span>
   {!isVideo&&<button type="button" className="editor-image-delete" aria-label="Удалить изображение" title="Удалить изображение" onMouseDown={event=>event.preventDefault()} onClick={event=>{event.stopPropagation();remove();}}><img src="/icons/image-delete.svg" alt="" draggable={false}/></button>}
   <Popover trigger="click" placement="bottom" arrow={{pointAtCenter:true}} open={open} onOpenChange={setOpen} destroyOnHidden overlayClassName={`editor-popover panel-${isVideo?'video':'image'}`} content={<div role="dialog" aria-label={isVideo?'Настройка видео':'Настройка изображения'} onKeyDown={event=>{if(event.key==='Escape'){event.stopPropagation();setOpen(false);}}}>{isVideo?<VideoPanel close={()=>setOpen(false)} actions={{selected:attrs,insert:save}}/>:<ImagePanel close={()=>setOpen(false)} actions={{selected:attrs,insert:save}}/>}</div>}>
    <button type="button" className="editor-image-settings" aria-label={isVideo?'Настроить видео':'Настроить изображение'} aria-expanded={open} onMouseDown={event=>event.preventDefault()} onClick={event=>event.stopPropagation()}><img src={open?'/icons/image-settings-active.svg':'/icons/image-settings.svg'} alt=""/></button>
   </Popover>
  </div>
 </NodeViewWrapper>;
}

function fittingOffset(fragment:Fragment,width:number,height:number,reference:HTMLElement,serializer:DOMSerializer){
 if(!fragment.size||width<8||height<16)return 0;
 const computed=getComputedStyle(reference);
 const sample=document.createElement('div');
 sample.style.cssText=`position:absolute;visibility:hidden;pointer-events:none;left:-10000px;top:0;width:${width}px;font:${computed.font};line-height:${computed.lineHeight};letter-spacing:${computed.letterSpacing};white-space:pre-wrap;overflow-wrap:anywhere;box-sizing:border-box`;
 document.body.appendChild(sample);
 let low=0,high=fragment.size;
 while(low<high){
  const middle=Math.ceil((low+high)/2);
  sample.replaceChildren(serializer.serializeFragment(fragment.cut(0,middle)));
  if(sample.getBoundingClientRect().height<=height+1)low=middle;else high=middle-1;
 }
 sample.remove();
 if(low===fragment.size||low===0)return low;
 const text=fragment.textBetween(0,low,'\n');
 const boundary=Math.max(text.lastIndexOf(' '),text.lastIndexOf('\n'))+1;
 return boundary>low-24?boundary:low;
}

function balancedLeftOffset(fragment:Fragment,capacity:number){
 if(capacity<=0)return 0;
 const halfway=Math.round(fragment.size/2);
 if(capacity<halfway)return capacity;
 let nearestBreak:number|undefined,nearestSpace:number|undefined;
 const closer=(current:number|undefined,candidate:number)=>candidate>0&&candidate<=capacity&&candidate<fragment.size&&(current===undefined||Math.abs(candidate-halfway)<Math.abs(current-halfway))?candidate:current;
 fragment.forEach((node,offset)=>{
  if(node.type.name==='hardBreak')nearestBreak=closer(nearestBreak,offset+1);
  const value=node.text??'';
  for(let i=0;i<value.length;i++)if(/\s/.test(value[i]))nearestSpace=closer(nearestSpace,offset+i+1);
 });
 if(nearestBreak!==undefined&&Math.abs(nearestBreak-halfway)<=Math.max(24,fragment.size/4))return nearestBreak;
 return nearestSpace??Math.min(capacity,halfway);
}

function rebalance(view:Editor['view']){
 if(view.composing)return;
 let change:{pos:number;node:ReturnType<typeof view.state.doc.nodeAt>;left:number;right:number}|undefined;
 view.state.doc.descendants((node,pos)=>{
  if(change||node.type.name!=='centerImageWrap')return !change;
  const dom=view.nodeDOM(pos);
  if(!(dom instanceof HTMLElement))return false;
  const picture=dom.querySelector<HTMLElement>('.center-image-wrap-picture');
  const columns=dom.querySelectorAll<HTMLElement>('.center-image-wrap-content > [data-node-view-content-react] > p');
  if(!picture||columns.length!==3)return false;
  const height=picture.getBoundingClientRect().height;
  if(!height)return false;
  const combined=node.child(0).content.append(node.child(1).content).append(node.child(2).content);
  const serializer=DOMSerializer.fromSchema(view.state.schema);
  const leftCapacity=fittingOffset(combined,columns[0].getBoundingClientRect().width,height,columns[0],serializer);
  const left=balancedLeftOffset(combined,leftCapacity);
  const right=left+fittingOffset(combined.cut(left),columns[1].getBoundingClientRect().width,height,columns[1],serializer);
  if(left!==node.child(0).content.size||right!==node.child(0).content.size+node.child(1).content.size)change={pos,node,left,right};
  return false;
 });
 if(!change||!change.node)return;
 const {pos,node,left,right}=change;
 const [before,middle,after]=[node.child(0),node.child(1),node.child(2)];
 const combined=before.content.append(middle.content).append(after.content);
 const paragraph=view.state.schema.nodes.paragraph;
 const next=node.type.create(node.attrs,[paragraph.create(before.attrs,combined.cut(0,left)),paragraph.create(middle.attrs,combined.cut(left,right)),paragraph.create(after.attrs,combined.cut(right))]);
 const selection=view.state.selection;
 let textOffset:number|undefined,sourceColumn=0;
 if(selection.empty&&selection.from>pos&&selection.from<pos+node.nodeSize){
  const starts=[pos+2,pos+2+before.nodeSize,pos+2+before.nodeSize+middle.nodeSize];
  for(let i=0;i<3;i++)if(selection.from>=starts[i]&&selection.from<=starts[i]+node.child(i).content.size){sourceColumn=i;textOffset=selection.from-starts[i]+(i===0?0:i===1?before.content.size:before.content.size+middle.content.size);break;}
 }
 const tr=view.state.tr.replaceWith(pos,pos+node.nodeSize,next).setMeta('addToHistory',false);
 if(textOffset!==undefined){
  const target=textOffset<left||(textOffset===left&&sourceColumn===0)?pos+2+textOffset:textOffset<right||(textOffset===right&&sourceColumn===1)?pos+2+next.child(0).nodeSize+textOffset-left:pos+2+next.child(0).nodeSize+next.child(1).nodeSize+textOffset-right;
  tr.setSelection(TextSelection.create(tr.doc,target));
 }
 view.dispatch(tr);
}

function moveCenterImage(view:Editor['view'],event:DragEvent){
 const raw=event.dataTransfer?.getData('application/x-b2b-center-image');
 if(!raw)return false;
 event.preventDefault();event.stopPropagation();
 const source=Number(raw),node=view.state.doc.nodeAt(source);
 const hit=view.posAtCoords({left:event.clientX,top:event.clientY});
 if(!Number.isInteger(source)||!node||node.type.name!=='centerImageWrap'||!hit)return true;
 const [left,right,below]=[node.child(0),node.child(1),node.child(2)];
 const text=left.content.append(right.content).append(below.content);
 const paragraphType=view.state.schema.nodes.paragraph;
 const paragraph=paragraphType.create(left.attrs,text);
 const transaction=view.state.tr.replaceWith(source,source+node.nodeSize,paragraph);
 let target=transaction.mapping.map(hit.pos);
 if(hit.pos>source&&hit.pos<source+node.nodeSize){
  const starts=[source+2,source+2+left.nodeSize,source+2+left.nodeSize+right.nodeSize];
  const parts=[left,right,below];
  for(let index=0;index<3;index++)if(hit.pos>=starts[index]&&hit.pos<=starts[index]+parts[index].content.size){target=source+1+(index===0?0:index===1?left.content.size:left.content.size+right.content.size)+hit.pos-starts[index];break;}
 }
 let resolved=transaction.doc.resolve(Math.max(0,Math.min(target,transaction.doc.content.size)));
 if(resolved.parent.type.name!=='paragraph'){
  const nearby=TextSelection.near(resolved).$from;
  if(nearby.parent.type.name!=='paragraph')return true;
  resolved=nearby;
  target=nearby.pos;
 }
 const run=paragraphRun(resolved);
 if(!run.parent.canReplaceWith(run.first,run.last,node.type))return true;
 const before=paragraphType.create(run.attrs,run.content);
 const replacement=node.type.create(node.attrs,[before,paragraphType.create(run.attrs),paragraphType.create()]);
 transaction.replaceWith(run.from,run.to,replacement);
 transaction.setSelection(TextSelection.create(transaction.doc,run.from+2+Math.min(run.offset,before.content.size)));
 view.dispatch(closeHistory(transaction));
 return true;
}

function moveInlineWrap(view:Editor['view'],event:DragEvent){
 const raw=event.dataTransfer?.getData('application/x-b2b-inline-wrap');
 if(!raw)return false;
 event.preventDefault();event.stopPropagation();
 const [type,position]=raw.split(':');
 const source=Number(position),node=view.state.doc.nodeAt(source);
 const hit=view.posAtCoords({left:event.clientX,top:event.clientY});
 if(!Number.isInteger(source)||!node||node.type.name!==type||node.attrs.layout!=='wrap'||!hit)return true;
 const transaction=view.state.tr.delete(source,source+node.nodeSize);
 const mapped=transaction.mapping.map(hit.pos);
 let resolved=transaction.doc.resolve(Math.max(0,Math.min(mapped,transaction.doc.content.size)));
 if(resolved.parent.type.name!=='paragraph')resolved=TextSelection.near(resolved).$from;
 if(resolved.parent.type.name!=='paragraph')return true;
 const run=paragraphRun(resolved),first=run.parent.child(run.first);
 if(!first.canReplaceWith(0,0,node.type))return true;
 const insertAt=run.from+1;
 transaction.insert(insertAt,node);
 transaction.setSelection(TextSelection.create(transaction.doc,insertAt+node.nodeSize));
 view.dispatch(closeHistory(transaction));
 return true;
}

function startInlineWrapDrag(view:Editor['view'],event:DragEvent){
 const media=(event.target as Element)?.closest<HTMLElement>('[data-editor-image],[data-editor-video]');
 if(!media||media.getAttribute('data-layout')!=='wrap'||media.getAttribute('data-align')==='center')return false;
 const outer=media.closest('.react-renderer');
 if(!outer||!event.dataTransfer)return false;
 let pos:number;
 try{pos=view.posAtDOM(outer,0);}catch{return false;}
 const type=media.hasAttribute('data-editor-image')?'editorImage':'editorVideo';
 if(view.state.doc.nodeAt(pos)?.type.name!==type)return false;
 event.dataTransfer.setData('application/x-b2b-inline-wrap',`${type}:${pos}`);
 event.dataTransfer.effectAllowed='move';
 return true;
}

export const CenterImageWrap=Node.create({
 name:'centerImageWrap',group:'block',content:'paragraph paragraph paragraph',isolating:true,selectable:true,
 addAttributes(){return {
  src:{default:'',parseHTML:element=>element.getAttribute('data-src')??''},
  name:{default:'',parseHTML:element=>element.getAttribute('data-name')??''},
  width:{default:null,parseHTML:element=>Number(element.getAttribute('data-width'))||null},
  height:{default:null,parseHTML:element=>Number(element.getAttribute('data-height'))||null},
  href:{default:'',parseHTML:element=>element.getAttribute('data-href')??''},
  originalSize:{default:true,parseHTML:element=>element.getAttribute('data-original-size')!=='false'},
  layout:{default:'wrap',parseHTML:element=>element.getAttribute('data-layout')??'wrap'},
  align:{default:'center',parseHTML:element=>element.getAttribute('data-align')??'center'},
  kind:{default:'image',parseHTML:element=>element.getAttribute('data-kind')??'image'},
  muted:{default:false,parseHTML:element=>element.getAttribute('data-muted')==='true'},
 };},
 parseHTML(){return [{tag:'div[data-center-image-wrap]'}];},
 renderHTML({node}){const data=node.attrs as CenterMediaData;return ['div',{'data-center-image-wrap':'','data-src':data.src,'data-name':'name'in data?data.name:'','data-width':data.width,'data-height':data.height,'data-href':'href'in data?data.href:'','data-original-size':String(data.originalSize),'data-layout':data.layout,'data-align':data.align,'data-kind':data.kind??'image','data-muted':'muted'in data?String(data.muted):'false'},data.kind==='video'?['video',{src:data.src}]:['img',{src:data.src,alt:'name'in data?data.name:''}],['div',0]];},
 addNodeView(){return ReactNodeViewRenderer(CenterImageWrapView);},
 addProseMirrorPlugins(){return [new Plugin({
  props:{handleDOMEvents:{dragstart(view,event){return startInlineWrapDrag(view,event);},dragover(_view,event){if(event.dataTransfer?.types.includes('application/x-b2b-center-image')||event.dataTransfer?.types.includes('application/x-b2b-inline-wrap')){event.preventDefault();event.dataTransfer.dropEffect='move';return true;}return false;},drop(view,event){return moveCenterImage(view,event)||moveInlineWrap(view,event);}}},
  view:view=>{let frame=0;const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>rebalance(view));};schedule();return {update:schedule,destroy:()=>cancelAnimationFrame(frame)};},
 })];},
});
