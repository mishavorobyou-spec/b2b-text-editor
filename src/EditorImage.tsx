import React, {useEffect, useRef, useState} from 'react';
import {Popover} from 'antd';
import {Node, NodeViewWrapper, ReactNodeViewRenderer, type Editor, type NodeViewProps} from '@tiptap/react';
import {closeHistory} from '@tiptap/pm/history';
import {NodeSelection, Plugin} from '@tiptap/pm/state';
import {Fragment, type Node as ProseMirrorNode} from '@tiptap/pm/model';
import type {Transaction} from '@tiptap/pm/state';
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
 const imageRef=useRef<HTMLSpanElement>(null);
 useEffect(()=>{
  if(attrs.layout!=='inline')return;
  let markerTimer:ReturnType<typeof setTimeout>|undefined;
  let detach=()=>{};
  const attach=()=>{
   const outer=imageRef.current?.parentElement;
   const paragraph=outer?.parentElement;
   const image=imageRef.current;
   if(!image||!outer||!paragraph||paragraph.tagName!=='P'||outer!==paragraph.firstElementChild||paragraph.parentElement?.tagName!=='LI')return;
   const placeMarker=()=>{
    markerTimer=undefined;
    const walker=document.createTreeWalker(paragraph,NodeFilter.SHOW_TEXT);
    let textNode:Text|null=null;
    while(walker.nextNode()){
     const candidate=walker.currentNode as Text;
     if(!outer.contains(candidate)&&candidate.textContent?.trim()){textNode=candidate;break;}
    }
    if(!textNode){image.style.removeProperty('--image-list-marker-x');image.style.removeProperty('--image-list-marker-y');return;}
    const first=textNode.textContent?.search(/\S/)??0;
    const range=document.createRange();
    range.setStart(textNode,first);range.setEnd(textNode,first+1);
    const letter=range.getBoundingClientRect(),block=image.getBoundingClientRect();
    image.style.setProperty('--image-list-marker-x',`${letter.left-block.left-18}px`);
    image.style.setProperty('--image-list-marker-y',`${letter.top-block.top}px`);
   };
   const schedule=()=>{if(!markerTimer)markerTimer=setTimeout(placeMarker,0);};
   const resize=new ResizeObserver(schedule);
   resize.observe(paragraph);resize.observe(outer);
   const changes=new MutationObserver(schedule);
   changes.observe(paragraph,{subtree:true,childList:true,characterData:true});
   placeMarker();
   detach=()=>{if(markerTimer)clearTimeout(markerTimer);resize.disconnect();changes.disconnect();image.style.removeProperty('--image-list-marker-x');image.style.removeProperty('--image-list-marker-y');};
  };
  const attachTimer=setTimeout(attach,0);
  return ()=>{clearTimeout(attachTimer);detach();};
 },[attrs.layout,attrs.align,attrs.src,attrs.width,attrs.height]);
 const picture=<img src={attrs.src} alt={attrs.name||'Изображение'} draggable={false} style={attrs.originalSize?undefined:{...(attrs.width?{width:attrs.width}:{}),...(attrs.height?{height:attrs.height}:{})}}/>;
 const remove=()=>{const pos=getPos();if(typeof pos!=='number')return;editor.view.dispatch(editor.state.tr.delete(pos,pos+node.nodeSize));setOpen(false);editor.view.focus();};
 return <NodeViewWrapper as="span" ref={imageRef} className={`editor-image${selected?' is-selected':''}${open?' is-settings-open':''}`} data-editor-image="" data-layout={attrs.layout} data-align={attrs.align} contentEditable={false} draggable="true">
   <span className="editor-image-media">{attrs.href?<a href={attrs.href} target="_blank" rel="noopener noreferrer">{picture}</a>:picture}</span>
   <span className="editor-image-overlay" aria-hidden="true"/>
   <span className="editor-image-drag" data-drag-handle draggable="true" title="Переместить изображение"><img src="/icons/image-drag.svg" alt="" draggable={false}/></span>
   <button type="button" className="editor-image-delete" aria-label="Удалить изображение" title="Удалить изображение" onMouseDown={event=>event.preventDefault()} onClick={event=>{event.stopPropagation();remove();}}><img src="/icons/image-delete.svg" alt="" draggable={false}/></button>
   <Popover trigger="click" placement="bottom" arrow={{pointAtCenter:true}} open={open} onOpenChange={setOpen} destroyOnHidden overlayClassName="editor-popover panel-image" content={<div role="dialog" aria-label="Настройка изображения" onKeyDown={event=>{if(event.key==='Escape'){event.stopPropagation();setOpen(false);}}}><ImagePanel close={()=>setOpen(false)} actions={{selected:attrs,insert:data=>data.layout==='wrap'&&data.align==='center'?convertImageToCenterWrap(editor,getPos,data):data.layout==='wrap'?alignMediaAtBlockStart(editor,getPos,data,'editorImage'):(updateAttributes(data),true)}}/></div>}>
    <button type="button" className="editor-image-settings" aria-label="Настроить изображение" aria-expanded={open} onMouseDown={event=>event.preventDefault()} onClick={event=>event.stopPropagation()}><img src={open?'/icons/image-settings-active.svg':'/icons/image-settings.svg'} alt=""/></button>
   </Popover>
 </NodeViewWrapper>;
}

function startSeparateImageDrag(view:Editor['view'],event:DragEvent){
 const target=event.target;
 if(!(target instanceof Element)||!target.closest('.editor-image-drag'))return false;
 const image=target.closest<HTMLElement>('[data-editor-image][data-layout="break"]');
 const outer=image?.closest('.react-renderer');
 if(!outer||!event.dataTransfer)return false;
 let pos:number;
 try{pos=view.posAtDOM(outer,0);}catch{return false;}
 if(view.state.doc.nodeAt(pos)?.type.name!=='editorImage')return false;
 event.dataTransfer.setData('application/x-b2b-separate-image',String(pos));
 event.dataTransfer.effectAllowed='move';
 view.dom.classList.add('is-separate-image-dragging');
 return true;
}

type ImageDropTarget={position:number;boundaryY:number};

function separateImageTargets(view:Editor['view']):ImageDropTarget[]{
 const targets:ImageDropTarget[]=[];
 const add=(position:number,boundaryY:number)=>{
  if(!Number.isFinite(boundaryY)||targets.some(item=>item.position===position&&Math.abs(item.boundaryY-boundaryY)<2))return;
  targets.push({position,boundaryY});
 };
 let blockPosition=0;
 for(let index=0;index<view.state.doc.childCount;index++){
  const block=view.dom.children.item(index);
  if(block){const bounds=block.getBoundingClientRect();add(blockPosition,bounds.top);add(blockPosition+view.state.doc.child(index).nodeSize,bounds.bottom);}
  blockPosition+=view.state.doc.child(index).nodeSize;
 }
 for(const block of view.dom.querySelectorAll<HTMLElement>('p,h1,h2,h3,h4,h5,h6')){
  if(block.closest('[contenteditable="false"]'))continue;
  const walker=document.createTreeWalker(block,NodeFilter.SHOW_TEXT);
  let lastLineTop=-Infinity;
  while(walker.nextNode()){
   const text=walker.currentNode as Text;
   if(!text.length||text.parentElement?.closest('[contenteditable="false"]'))continue;
   const range=document.createRange();
   for(let offset=0;offset<text.length;offset++){
    range.setStart(text,offset);range.setEnd(text,offset+1);
    const bounds=range.getBoundingClientRect();
    if(!bounds.height||Math.abs(bounds.top-lastLineTop)<2)continue;
    lastLineTop=bounds.top;
    try{
     const position=view.posAtDOM(text,offset);
     if(view.state.doc.resolve(position).parent.isTextblock)add(position,bounds.top);
    }catch{/* Ignore DOM text that does not belong to the document. */}
   }
  }
 }
 return targets.sort((a,b)=>a.boundaryY-b.boundaryY||a.position-b.position);
}

function separateImageTarget(view:Editor['view'],clientY:number,targets=separateImageTargets(view)){
 if(!targets.length)return {position:0,boundaryY:view.dom.getBoundingClientRect().top};
 return targets.reduce((closest,item)=>Math.abs(item.boundaryY-clientY)<Math.abs(closest.boundaryY-clientY)?item:closest);
}

function insertSeparateImage(transaction:Transaction,position:number,image:ProseMirrorNode){
 const paragraph=transaction.doc.type.schema.nodes.paragraph;
 if(!paragraph||!image)return null;
 const imageParagraph=paragraph.create(null,image);
 const $position=transaction.doc.resolve(position);
 const depth=$position.depth;
 if($position.parent.isTextblock&&position>$position.start(depth)&&position<$position.end(depth)){
  transaction.split(position);
  const insertAt=position+1;
  transaction.insert(insertAt,imageParagraph);
  return insertAt+1;
 }
 if($position.parent.isTextblock){
  const before=position===$position.start(depth);
  const siblingAt=before?$position.before(depth):$position.after(depth);
  const parent=$position.node(depth-1);
  const index=before?$position.index(depth-1):$position.indexAfter(depth-1);
  // Keep list markers beside text: a drop at an item edge splits the list around the image.
  const atItemEdge=parent.type.name==='listItem'&&(before?index===0:index===parent.childCount);
  if(atItemEdge&&depth>=3&&$position.node(depth-2).type.name.match(/^(bulletList|orderedList)$/)){
   const listDepth=depth-2,list=$position.node(listDepth),itemIndex=$position.index(listDepth);
   const splitIndex=before?itemIndex:itemIndex+1;
   const listStart=$position.before(listDepth),listEnd=$position.after(listDepth);
   const replacement=[];
   if(splitIndex>0)replacement.push(list.copy(Fragment.fromArray(list.content.content.slice(0,splitIndex))));
   replacement.push(imageParagraph);
   if(splitIndex<list.childCount){
    const remainder=Fragment.fromArray(list.content.content.slice(splitIndex));
    replacement.push(list.type.name==='orderedList'?list.type.create({...list.attrs,start:(Number(list.attrs.start)||1)+splitIndex},remainder):list.copy(remainder));
   }
   if($position.node(listDepth-1).canReplace($position.index(listDepth-1),$position.indexAfter(listDepth-1),Fragment.fromArray(replacement))){
    transaction.replaceWith(listStart,listEnd,replacement);
    const insertAt=listStart+(splitIndex>0?replacement[0].nodeSize:0);
    return insertAt+1;
   }
  }
  if(parent.canReplaceWith(index,index,paragraph)){transaction.insert(siblingAt,imageParagraph);return siblingAt+1;}
 }
 if(depth===0){transaction.insert(position,imageParagraph);return position+1;}
 return null;
}

function moveSeparateImage(view:Editor['view'],event:DragEvent,targets?:ImageDropTarget[]){
 const raw=event.dataTransfer?.getData('application/x-b2b-separate-image');
 if(!raw)return false;
 event.preventDefault();event.stopPropagation();
 const source=Number(raw),{doc,schema}=view.state,node=doc.nodeAt(source);
 if(!Number.isInteger(source)||!node||node.type.name!=='editorImage'||node.attrs.layout!=='break')return true;
 const paragraph=schema.nodes.paragraph;
 if(!paragraph)return true;
 const target=separateImageTarget(view,event.clientY,targets).position;
 const at=doc.resolve(source),parentDepth=at.depth;
 const parent=at.node(parentDepth-1);
 const removeParagraph=at.parent.type===paragraph&&at.parent.childCount===1&&parent.canReplace(at.index(parentDepth-1),at.indexAfter(parentDepth-1));
 const from=removeParagraph?at.before(parentDepth):source,to=removeParagraph?at.after(parentDepth):source+node.nodeSize;
 if(removeParagraph&&(target===from||target===to))return true;
 const transaction=view.state.tr.delete(from,to);
 const insertAt=transaction.mapping.map(target);
 const imageAt=insertSeparateImage(transaction,insertAt,node);
 if(imageAt===null)return true;
 transaction.setSelection(NodeSelection.create(transaction.doc,imageAt));
 view.dispatch(closeHistory(transaction));
 view.focus();
 return true;
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
 addProseMirrorPlugins(){
  let targets:ImageDropTarget[]|undefined,scrollTop=0,editorTop=0;
  const clear=(view:Editor['view'])=>{targets=undefined;view.dom.classList.remove('is-separate-image-dragging','has-separate-image-target');view.dom.style.removeProperty('--separate-image-drop-y');};
  return [new Plugin({props:{handleDOMEvents:{
  dragstart(view,event){targets=undefined;return startSeparateImageDrag(view,event);},
  dragover(view,event){
   if(!event.dataTransfer?.types.includes('application/x-b2b-separate-image'))return false;
   event.preventDefault();event.dataTransfer.dropEffect='move';
   const editorBoundsTop=view.dom.getBoundingClientRect().top;
   if(!targets||scrollTop!==view.dom.scrollTop||editorTop!==editorBoundsTop){targets=separateImageTargets(view);scrollTop=view.dom.scrollTop;editorTop=editorBoundsTop;}
   const {boundaryY}=separateImageTarget(view,event.clientY,targets);
   const top=boundaryY-view.dom.getBoundingClientRect().top+view.dom.scrollTop;
   view.dom.style.setProperty('--separate-image-drop-y',`${top}px`);
   view.dom.classList.add('has-separate-image-target');
   return true;
  },
  drop(view,event){const available=targets;clear(view);return moveSeparateImage(view,event,available);},
  dragend(view){clear(view);return false;},
 }}})];
 },
});
