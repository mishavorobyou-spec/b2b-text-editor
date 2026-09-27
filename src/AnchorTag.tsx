import React, {useState} from 'react';
import {Button, Input, Modal, Popover} from 'antd';
import {mergeAttributes, Node, NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps} from '@tiptap/react';
import {removeLinkEntry, updateLinkEntry} from './linkLibrary';
import './anchor-tag.css';

function AnchorTagView({node,updateAttributes,deleteNode,selected}:NodeViewProps){
 const [open,setOpen]=useState(false);
 const [draft,setDraft]=useState(String(node.attrs.label??''));
 const anchorId=String(node.attrs.anchorId??'');
 const save=()=>{const label=draft.trim();if(!label)return;updateAttributes({label});updateLinkEntry({id:anchorId,type:'anchor',label,href:`#${anchorId}`});setOpen(false);};
 const remove=()=>Modal.confirm({title:'Удалить якорь?',content:'Существующие переходы на этот якорь останутся в тексте, но перестанут работать.',icon:null,width:400,centered:true,className:'link-delete-modal',okText:'Удалить',cancelText:'Отменить',okButtonProps:{danger:true},onOk:()=>{removeLinkEntry(anchorId);deleteNode();}});
 const editor=<div className="anchor-edit-panel" role="dialog" aria-label="Редактирование якоря"><h2>Редактирование якоря</h2><label><span className="required">* </span>Название</label><Input value={draft} allowClear={{clearIcon:<img className="link-input-clear" src="/icons/c3be5.svg" alt=""/>}} onChange={event=>setDraft(event.target.value)} onPressEnter={save} aria-label="Название якоря"/><div className="panel-footer"><Button onClick={()=>{setDraft(String(node.attrs.label??''));setOpen(false);}}>Отменить</Button><Button type="primary" disabled={!draft.trim()} onClick={save}>Сохранить</Button></div></div>;
 return <Popover trigger="click" placement="bottomLeft" arrow={{pointAtCenter:true}} open={open} onOpenChange={next=>{if(next)setOpen(true);}} destroyOnHidden overlayClassName="editor-popover anchor-edit-popover" content={editor}>
  <NodeViewWrapper as="span" id={anchorId} data-anchor-tag="true" className={`anchor-tag${selected?' is-selected':''}`} draggable="true" contentEditable={false}>
   <span className="anchor-drag-handle" data-drag-handle aria-label="Переместить якорь"><img src="/icons/anchor-holder.svg" alt=""/></span>
   <img className="anchor-tag-anchor" src="/icons/anchor-tag.svg" alt=""/>
   <span className="anchor-tag-label">#{String(node.attrs.label??'')}</span>
   <button type="button" className="anchor-tag-action" aria-label="Редактировать якорь" onMouseDown={event=>event.preventDefault()} onClick={event=>{event.stopPropagation();setDraft(String(node.attrs.label??''));setOpen(true);}}><img src="/icons/link-edit.svg" alt=""/></button>
   <button type="button" className="anchor-tag-action" aria-label="Удалить якорь" onMouseDown={event=>event.preventDefault()} onClick={event=>{event.stopPropagation();remove();}}><img src="/icons/link-delete.svg" alt=""/></button>
  </NodeViewWrapper>
 </Popover>;
}

export const AnchorTag=Node.create({
 name:'anchorTag',group:'inline',inline:true,atom:true,selectable:true,draggable:true,
 addAttributes(){return {anchorId:{default:null,parseHTML:element=>element.getAttribute('data-anchor-id')},label:{default:'',parseHTML:element=>element.getAttribute('data-anchor-label')??''}};},
 parseHTML(){return [{tag:'span[data-anchor-tag]'}];},
 renderHTML({node,HTMLAttributes}){return ['span',mergeAttributes(HTMLAttributes,{id:node.attrs.anchorId,'data-anchor-tag':'true','data-anchor-id':node.attrs.anchorId,'data-anchor-label':node.attrs.label}),`#${node.attrs.label}`];},
 addNodeView(){return ReactNodeViewRenderer(AnchorTagView);},
});
