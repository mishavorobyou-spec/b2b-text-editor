import React, {useState} from 'react';
import {Button, Input, Modal, Popover} from 'antd';
import {mergeAttributes, Node, NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps} from '@tiptap/react';
import {removeLinkEntry, updateLinkEntry} from './linkLibrary';
import './anchor-tag.css';

const HolderIcon=()=> <svg className="anchor-holder-icon" viewBox="0 0 14 14" aria-hidden="true"><circle cx="4" cy="3" r="1"/><circle cx="9" cy="3" r="1"/><circle cx="4" cy="7" r="1"/><circle cx="9" cy="7" r="1"/><circle cx="4" cy="11" r="1"/><circle cx="9" cy="11" r="1"/></svg>;
const EditIcon=()=> <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5.0332 14.6875C5.07227 14.6875 5.11133 14.6836 5.15039 14.6777L8.43555 14.1016C8.47461 14.0938 8.51172 14.0762 8.53906 14.0469L16.8184 5.76758C16.8365 5.74951 16.8508 5.72805 16.8606 5.70442C16.8704 5.68079 16.8755 5.65546 16.8755 5.62988C16.8755 5.6043 16.8704 5.57897 16.8606 5.55535C16.8508 5.53172 16.8365 5.51026 16.8184 5.49219L13.5723 2.24414C13.5352 2.20703 13.4863 2.1875 13.4336 2.1875C13.3809 2.1875 13.332 2.20703 13.2949 2.24414L5.01562 10.5234C4.98633 10.5527 4.96875 10.5879 4.96094 10.627L4.38477 13.9121C4.36577 14.0167 4.37255 14.1244 4.40454 14.2258C4.43654 14.3273 4.49276 14.4193 4.56836 14.4941C4.69727 14.6191 4.85938 14.6875 5.0332 14.6875ZM6.34961 11.2812L13.4336 4.19922L14.8652 5.63086L7.78125 12.7129L6.04492 13.0195L6.34961 11.2812ZM17.1875 16.3281H2.8125C2.4668 16.3281 2.1875 16.6074 2.1875 16.9531V17.6562C2.1875 17.7422 2.25781 17.8125 2.34375 17.8125H17.6562C17.7422 17.8125 17.8125 17.7422 17.8125 17.6562V16.9531C17.8125 16.6074 17.5332 16.3281 17.1875 16.3281Z"/></svg>;
const DeleteIcon=()=> <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7.03125 3.59375H6.875C6.96094 3.59375 7.03125 3.52344 7.03125 3.4375V3.59375H12.9688V3.4375C12.9688 3.52344 13.0391 3.59375 13.125 3.59375H12.9688V5H14.375V3.4375C14.375 2.74805 13.8145 2.1875 13.125 2.1875H6.875C6.18555 2.1875 5.625 2.74805 5.625 3.4375V5H7.03125V3.59375ZM16.875 5H3.125C2.7793 5 2.5 5.2793 2.5 5.625V6.25C2.5 6.33594 2.57031 6.40625 2.65625 6.40625H3.83594L4.31836 16.6211C4.34961 17.2871 4.90039 17.8125 5.56641 17.8125H14.4336C15.1016 17.8125 15.6504 17.2891 15.6816 16.6211L16.1641 6.40625H17.3438C17.4297 6.40625 17.5 6.33594 17.5 6.25V5.625C17.5 5.2793 17.2207 5 16.875 5ZM14.2832 16.4062H5.7168L5.24414 6.40625H14.7559L14.2832 16.4062Z"/></svg>;

function AnchorTagView({node,updateAttributes,deleteNode,selected}:NodeViewProps){
 const [open,setOpen]=useState(false);
 const [draft,setDraft]=useState(String(node.attrs.label??''));
 const anchorId=String(node.attrs.anchorId??'');
 const save=()=>{const label=draft.trim();if(!label)return;updateAttributes({label});updateLinkEntry({id:anchorId,type:'anchor',label,href:`#${anchorId}`});setOpen(false);};
 const remove=()=>Modal.confirm({title:'Удалить якорь?',content:'Существующие переходы на этот якорь останутся в тексте, но перестанут работать.',icon:null,width:400,centered:true,className:'link-delete-modal',okText:'Удалить',cancelText:'Отменить',okButtonProps:{danger:true},onOk:()=>{removeLinkEntry(anchorId);deleteNode();}});
 const editor=<div className="anchor-edit-panel" role="dialog" aria-label="Редактирование якоря"><h2>Редактирование якоря</h2><label><span className="required">* </span>Название</label><Input value={draft} allowClear={{clearIcon:<img className="link-input-clear" src="/icons/c3be5.svg" alt=""/>}} onChange={event=>setDraft(event.target.value)} onPressEnter={save} aria-label="Название якоря"/><div className="panel-footer"><Button onClick={()=>{setDraft(String(node.attrs.label??''));setOpen(false);}}>Отменить</Button><Button type="primary" disabled={!draft.trim()} onClick={save}>Сохранить</Button></div></div>;
 return <Popover trigger="click" placement="bottomLeft" arrow={{pointAtCenter:true}} open={open} onOpenChange={next=>{if(next)setOpen(true);}} destroyOnHidden overlayClassName="editor-popover anchor-edit-popover" content={editor}>
  <NodeViewWrapper as="span" id={anchorId} data-anchor-tag="true" className={`anchor-tag${selected?' is-selected':''}`} draggable="true" contentEditable={false}>
   <span className="anchor-drag-handle" data-drag-handle aria-label="Переместить якорь"><HolderIcon/></span>
   <img className="anchor-tag-anchor" src="/icons/anchor-tag.svg" alt=""/>
   <span className="anchor-tag-label">#{String(node.attrs.label??'')}</span>
   <button type="button" className="anchor-tag-action anchor-edit-action" aria-label="Редактировать якорь" onMouseDown={event=>event.preventDefault()} onClick={event=>{event.stopPropagation();setDraft(String(node.attrs.label??''));setOpen(true);}}><EditIcon/></button>
   <button type="button" className="anchor-tag-action anchor-delete-action" aria-label="Удалить якорь" onMouseDown={event=>event.preventDefault()} onClick={event=>{event.stopPropagation();remove();}}><DeleteIcon/></button>
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
