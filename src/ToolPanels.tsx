import React, {useEffect, useId, useRef, useState, type ReactNode} from 'react';
import {Button, Input, Segmented, Popover, Checkbox, Modal, Tooltip} from 'antd';
import {icons} from './all-assets';
import {panelAssets} from './panel-assets';
import './panels.css';
import './link-tools.css';
import {FormatPanel, defaultFormat, type FormatTool} from './TextFormatting';
import type {InlineFormat, InlineTool, ParagraphFormat, ParagraphTool} from './useTextDocument';
import {createEntryId, useLinkLibrary, type AnchorEntry, type LinkEntry, type UrlLinkEntry} from './linkLibrary';

export type ToolId = 'textType'|'font'|'fontSize'|'color'|'highlight'|'cellColor'|'fillColor'|'alignment'|'list'|'paragraph'|'lineHeight'|'link'|'anchor'|'table'|'image'|'video'|'symbol'|'search'|'more';
export const toolLabels:Record<ToolId,string>={textType:'Тип текста',font:'Шрифт',fontSize:'Размер шрифта',color:'Цвет текста',highlight:'Цвет подчеркивания',cellColor:'Цвет фона ячейки',fillColor:'Цветовое оформление',alignment:'Выравнивание',list:'Список',paragraph:'Межстрочное расстояние',lineHeight:'Расстояние между абзацами',link:'Ссылка',anchor:'Якорь',table:'Таблица',image:'Изображение',video:'Видео',symbol:'Специальный символ',search:'Найти и заменить',more:'Дополнительные инструменты'};
export const panelForIcon:Record<string,ToolId>={IconTextTypeOutlined:'textType',IconFontSizeOutlined:'font',IconFontColorsOutlined:'color',IconHighlightOutlined:'highlight',IconFormatPainterOutlined:'cellColor',IconBgColorsOutlined:'fillColor',IconAlignLeftOutlined:'alignment',IconOrderedListOutlined:'list',StateDefaultSizeDefault1:'paragraph',StateDefaultSizeDefault:'lineHeight',IconLinkOutlined:'link',IconAnchor:'anchor',Icon:'table',IconPictureOutlined:'image',IconVideoCameraOutlined:'video',IconSpecialCharacterOutlined:'symbol',IconReplaceSearchOutlined:'search',IconMoreOutlined:'more'};

export type LinkPanelActions={selectionText:string;hasSelection:boolean;applyLink:(href:string)=>void;createAnchor:(anchorId:string)=>void;deleteAnchor:(anchorId:string)=>void;updateLinks:(oldHref:string,newHref:string)=>void};

export function PanelTrigger({tool,children,disabled=false,value,onApply,linkActions}:{tool:ToolId;children:ReactNode;disabled?:boolean;value?:string;onApply?:(value:string)=>void;linkActions?:LinkPanelActions}){
 const [open,setOpen]=useState(false);
 const holder=useRef<HTMLSpanElement>(null);
 const close=()=>{setOpen(false);holder.current?.querySelector<HTMLElement>('button,input')?.focus();};
 useEffect(()=>{
  if(!open)return;
  const dismiss=(event:MouseEvent)=>{const target=event.target;if(target instanceof Element&&!holder.current?.contains(target)&&!target.closest(`.panel-${tool}`))setOpen(false);};
  const dismissFromEditor=()=>setOpen(false);
  document.addEventListener('click',dismiss,true);
  document.addEventListener('editor-dismiss-popovers',dismissFromEditor);
  return()=>{document.removeEventListener('click',dismiss,true);document.removeEventListener('editor-dismiss-popovers',dismissFromEditor);};
 },[open,tool]);
 return <Popover trigger="click" placement="bottom" arrow={{pointAtCenter:true}} open={open&&!disabled} onOpenChange={setOpen} destroyOnHidden overlayClassName={`editor-popover panel-${tool}`} content={<div role="dialog" aria-label={toolLabels[tool]} onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();close();}}}><PanelContent key={`${tool}-${value??''}`} tool={tool} close={close} value={value} onApply={onApply} linkActions={linkActions}/></div>}><span ref={holder} className="panel-trigger" data-open={open&&!disabled} onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();setOpen(false);}}}>{children}</span></Popover>;
}

export function PanelField({label,placeholder='Введите',required=false,children}:{label?:string;placeholder?:string;required?:boolean;children?:ReactNode}){
 const id=useId();
 return <div className="panel-field">{label&&<label htmlFor={id}>{required&&<span className="required">* </span>}{label}</label>}{children??<Input id={id} aria-label={label??placeholder} placeholder={placeholder}/>}</div>;
}
function Footer({close,onAction,action='Применить',disabled=false}:{close:()=>void;onAction?:()=>void;action?:string;disabled?:boolean}){return <div className="panel-footer"><Button onMouseDown={event=>event.preventDefault()} onClick={close}>Отменить</Button><Button type="primary" onMouseDown={event=>event.preventDefault()} onClick={onAction} disabled={disabled}>{action}</Button></div>;}
const Asset=({node,name,className='panel-icon'}:{node:string;name:string;className?:string})=><img className={className} src={panelAssets[node]?.[name]} alt=""/>;
function CatalogFormatPanel({tool,close}:{tool:FormatTool;close:()=>void}){const [value,setValue]=useState(defaultFormat[tool]);return <FormatPanel tool={tool} value={value} onCancel={close} onApply={v=>{setValue(v);close();}}/>;}
function ColorPanel({tool}:{tool:ToolId}){
 const swatches=['#000','#1f1f1f','#595959','#8c8c8c','#bfbfbf','#d9d9d9','#e8e8e8','#eee','#f5f5f5','#fff','#ff4d4f','#fa8c16','#fadb14','#a0d911','#52c41a','#13c2c2','#1677ff','#2f54eb','#722ed1','#eb2f96','#ffccc7','#ffe7ba','#fff1b8','#eaff8f','#d9f7be','#b5f5ec','#bae0ff','#d6e4ff','#efdbff','#ffd6e7'];
 return <div className="tool-panel color-panel"><div className="panel-title-row"><h2>{tool==='fillColor'?'Цвет текста':'Цвет'}</h2><button className="clear-color" aria-label="Сбросить цвет"><Asset node="6716:88899" name="imgColor"/></button></div><Asset node="6716:88899" name="imgColorPickerColorPickerPalette" className="color-palette"/><div className="color-controls"><div className="color-sliders"><Asset node="6716:88899" name="imgColorPickerColorPickerPaletteSlider" className="color-hue"/><div className="color-alpha"><Asset node="6716:88899" name="imgSliderHandle"/></div></div><span className="color-preview"/></div><div className="color-values"><span>HEX <img src={icons.imgIconDownOutlined} alt=""/></span><Input size="small" defaultValue="1677FF" prefix="#" aria-label="HEX цвета"/><Input size="small" defaultValue="3" aria-label="Прозрачность"/></div><div className="color-presets"><div className="color-caption"><img src={icons.imgIconDownOutlined} alt=""/>Recommended</div><div className="color-swatches">{swatches.map((c,i)=><button key={i} type="button" aria-label={`Цвет ${c}`} style={{backgroundColor:c}}>{i===16&&<Asset node="6716:88899" name="imgCheck"/>}</button>)}</div><div className="color-caption"><img src={icons.imgIconDownOutlined} alt=""/>Recent</div><span className="color-empty">Empty</span></div></div>;
}
function MenuPanel({tool,value,onSelect}:{tool:'alignment'|'list'|'more';value?:string;onSelect?:(value:string)=>void}){
 const rows=tool==='alignment'?[['imgIconAlignLeftOutlined1','Выравнивание по левому краю'],['imgIconAlignCenterOutlined','Выравнивание по центру'],['imgIconAlignRightOutlined','Выравнивание по правому краю'],['imgIconAlignJustifiedOutlined','Выравнивание по ширине']]:tool==='list'?[['imgIconOrderedListOutlined1','Нумерованный список'],['imgIconBarsOutlined','Маркированный список']]:[['imgIconBoldOutlined','Жирный текст'],['imgIconItalicOutlined','Курсивный текст'],['imgIconUnderlineOutlined','Подчеркнутый текст'],['imgIconStrikethroughOutlined','Зачеркнутый текст'],['imgIconClearOutlined','Очистка форматирования'],['imgIconFontColorsOutlined','Цвет текста'],['imgIconHighlightOutlined','Цвет подчеркивания'],['imgIconFormatPainterOutlined','Цвет фона ячейки']];
 const values=tool==='alignment'?['left','center','right','justify']:tool==='list'?['ordered','bullet']:rows.map((_,index)=>String(index));
 const node=tool==='alignment'?'6716:88967':tool==='list'?'6716:88984':'6716:89154';
 return <div className={`tool-panel menu-panel ${tool==='more'?'more-panel':''}`}>{tool!=='more'&&<h2>{tool==='list'?'Тип списка':'Выравнивание'}</h2>}<div className="panel-menu">{rows.map(([name,label],i)=><button type="button" key={name} className={`${tool==='more'&&i===5?'menu-divider ':''}${value===values[i]?'is-active':''}`} aria-pressed={tool==='more'?undefined:value===values[i]} onMouseDown={event=>event.preventDefault()} onClick={()=>onSelect?.(values[i])}><Asset node={node} name={name}/><span>{label}</span></button>)}</div></div>;
}
function SpacingPanel({tool,value,close,onApply}:{tool:'paragraph'|'lineHeight';value?:string;close:()=>void;onApply?:(value:string)=>void}){
 const [draft,setDraft]=useState(value??'');
 const numeric=Number(draft),valid=draft!==''&&Number.isFinite(numeric)&&numeric>=(tool==='lineHeight'?0:1)&&numeric<=200;
 const apply=()=>{if(valid){onApply?.(String(numeric));close();}};
 return <div className="tool-panel spacing-panel"><h2>{toolLabels[tool]}</h2><Input value={draft} inputMode="decimal" addonAfter="px" aria-label={toolLabels[tool]} placeholder="Введите" onChange={e=>{if(/^\d*(?:[.,]\d*)?$/.test(e.target.value))setDraft(e.target.value.replace(',','.'));}} onPressEnter={apply}/><Footer close={close} onAction={apply} disabled={!valid}/></div>;
}

const validUrl=(value:string)=>{try{const parsed=new URL(value);return parsed.protocol==='http:'||parsed.protocol==='https:';}catch{return false;}};
const anchorId=(entry:AnchorEntry)=>entry.href.replace(/^#/, '');
const linkHints={url:'Ссылка должна относится к текущему домену',anchor:'Добавьте # символ. Например: #name'} as const;
function LinkHint({type}:{type:keyof typeof linkHints}){
 return <Tooltip title={linkHints[type]}><span className="link-field-hint" tabIndex={0} role="img" aria-label={linkHints[type]}><Asset node="6716:89076" name="imgIconInfoCircleOutlined" className="link-hint-default"/><img className="link-hint-hover" src="/icons/info-hover.svg" alt=""/></span></Tooltip>;
}

function LibraryRows({entries,onChoose,onEdit,onDelete}:{entries:LinkEntry[];onChoose:(entry:LinkEntry)=>void;onEdit:(entry:LinkEntry)=>void;onDelete:(entry:LinkEntry)=>void}){
 if(!entries.length)return <div className="link-library-empty">Ничего не найдено</div>;
 return <div className="link-library-list" role="listbox">{entries.map(entry=><div className="link-library-row" role="option" aria-label={entry.label} key={entry.id} onMouseDown={event=>event.preventDefault()} onClick={()=>onChoose(entry)}>{entry.type==='anchor'&&<img className="link-library-type-icon" src={icons.imgIconAnchor} alt=""/>}<span className="link-library-label">{entry.label}</span><button type="button" aria-label={`Редактировать ${entry.label}`} onClick={event=>{event.stopPropagation();onEdit(entry);}}><img src="/icons/link-edit.svg" alt=""/></button><button type="button" aria-label={`Удалить ${entry.label}`} onClick={event=>{event.stopPropagation();onDelete(entry);}}><img src="/icons/link-delete.svg" alt=""/></button></div>)}</div>;
}

function confirmDelete(entry:LinkEntry,onConfirm:()=>void){
 Modal.confirm({title:entry.type==='anchor'?'Удалить якорь?':'Удалить ссылку?',content:entry.type==='anchor'?'Существующие переходы на этот якорь останутся в тексте, но перестанут работать.':'Ссылка исчезнет из общей библиотеки. Уже применённые ссылки останутся в тексте.',icon:null,width:400,centered:true,className:'link-delete-modal',okText:'Удалить',cancelText:'Отменить',okButtonProps:{danger:true},onOk:onConfirm});
}

function LinkPanel({close,actions}:{close:()=>void;actions?:LinkPanelActions}){
 const {entries,add,update,remove}=useLinkLibrary();
 const [type,setType]=useState<'url'|'anchor'>('url');
 const [query,setQuery]=useState('');
 const [label,setLabel]=useState(actions?.selectionText??'');
 const [selectedId,setSelectedId]=useState<string>();
 const [showList,setShowList]=useState(false);
 const [editing,setEditing]=useState<LinkEntry>();
 const [editHref,setEditHref]=useState('');
 const [editLabel,setEditLabel]=useState('');
 const typed=query.trim();
 const filtered=entries.filter(entry=>entry.type===type&&(!typed||entry.label.toLowerCase().includes(typed.toLowerCase())||entry.href.toLowerCase().includes(typed.toLowerCase())));
 const selected=entries.find(entry=>entry.id===selectedId&&entry.type===type);
 const exact=entries.find(entry=>entry.type===type&&(entry.href.toLowerCase()===typed.toLowerCase()||entry.label.toLowerCase()===typed.toLowerCase()));
 const resolved=selected??exact;
 const choose=(entry:LinkEntry)=>{setSelectedId(entry.id);setQuery(entry.type==='url'?entry.href:entry.label);setLabel(entry.label);setShowList(false);};
 const edit=(entry:LinkEntry)=>{setEditing(entry);setEditHref(entry.href);setEditLabel(entry.label);};
 const del=(entry:LinkEntry)=>confirmDelete(entry,()=>{remove(entry.id);if(entry.type==='anchor')actions?.deleteAnchor(anchorId(entry));if(selectedId===entry.id){setSelectedId(undefined);setQuery('');}});
 const saveEdit=()=>{
  if(!editing||!editLabel.trim()||(editing.type==='url'&&!validUrl(editHref.trim())))return;
  const next={...editing,label:editLabel.trim(),...(editing.type==='url'?{href:editHref.trim()}:{})} as LinkEntry;
  update(next);
  if(editing.type==='url')actions?.updateLinks(editing.href,next.href);
  setEditing(undefined);setSelectedId(next.id);setQuery(next.type==='url'?next.href:next.label);setLabel(next.label);
 };
 if(editing)return <div className="tool-panel link-panel"><button type="button" className="link-panel-back" onClick={()=>setEditing(undefined)}>‹ <span>{editing.type==='url'?'Редактирование url ссылки':'Редактирование якорной ссылки'}</span></button>{editing.type==='url'&&<PanelField label="Ссылка" required><Input value={editHref} status={editHref&&!validUrl(editHref)?'error':undefined} onChange={event=>setEditHref(event.target.value)} aria-label="Ссылка" suffix={<LinkHint type="url"/>}/></PanelField>}<PanelField label={editing.type==='url'?'Текст ссылки':'Название'} required><Input.TextArea autoSize={{minRows:editing.type==='url'?2:1,maxRows:3}} value={editLabel} onChange={event=>setEditLabel(event.target.value)} aria-label={editing.type==='url'?'Текст ссылки':'Название'}/></PanelField><Footer close={()=>setEditing(undefined)} onAction={saveEdit} action="Сохранить" disabled={!editLabel.trim()||(editing.type==='url'&&!validUrl(editHref.trim()))}/></div>;
 const canAdd=type==='url'?(resolved?Boolean(actions?.hasSelection):validUrl(typed)&&Boolean(label.trim())):Boolean(resolved&&actions?.hasSelection);
 const submit=()=>{
  if(type==='url'){
   let entry=resolved as UrlLinkEntry|undefined;
   if(!entry){entry={id:createEntryId('url'),type:'url',href:typed,label:label.trim()};add(entry);}
   if(actions?.hasSelection)actions.applyLink(entry.href);
   close();return;
  }
  if(resolved&&resolved.type==='anchor'&&actions?.hasSelection){actions.applyLink(resolved.href);close();}
 };
 return <div className="tool-panel link-panel"><h2>Добавить ссылку</h2><Segmented block value={type} options={[{label:'URL ссылка',value:'url'},{label:'Якорная ссылка',value:'anchor'}]} onChange={value=>{setType(value as 'url'|'anchor');setQuery('');setLabel(actions?.selectionText??'');setSelectedId(undefined);setShowList(false);}}/><PanelField label="Ссылка" required><div className="link-combobox"><Input value={query} status={typed&&type==='url'&&!resolved&&!validUrl(typed)?'error':undefined} aria-label="Ссылка" placeholder={type==='url'?'Введите URL ссылку':'Введите ссылку-якорь'} allowClear={{clearIcon:<img className="link-input-clear" src="/icons/c3be5.svg" alt=""/>}} suffix={<LinkHint type={type}/>} onFocus={()=>setShowList(true)} onChange={event=>{setQuery(event.target.value);setSelectedId(undefined);setShowList(true);}} onPressEnter={canAdd?submit:undefined}/>{showList&&filtered.length>0&&<LibraryRows entries={filtered} onChoose={choose} onEdit={edit} onDelete={del}/>}</div></PanelField>{type==='url'&&!resolved&&typed&&<PanelField label="Текст ссылки" required><Input.TextArea autoSize={{minRows:2,maxRows:3}} value={label} status={!label.trim()?'error':undefined} placeholder="Введите" onChange={event=>setLabel(event.target.value)} aria-label="Текст ссылки"/></PanelField>}{type==='url'&&!resolved&&typed&&!validUrl(typed)&&<span className="link-error">Введите корректную http:// или https:// ссылку</span>}<Footer close={close} onAction={submit} action="Добавить" disabled={!canAdd}/></div>;
}

function AnchorPanel({close,actions}:{close:()=>void;actions?:LinkPanelActions}){
 const {entries,add,update,remove}=useLinkLibrary();
 const anchors=entries.filter((entry):entry is AnchorEntry=>entry.type==='anchor');
 const [query,setQuery]=useState('');
 const [selectedId,setSelectedId]=useState<string>();
 const [showList,setShowList]=useState(false);
 const [editing,setEditing]=useState<AnchorEntry>();
 const selected=anchors.find(entry=>entry.id===selectedId);
 const exact=anchors.find(entry=>entry.label.toLowerCase()===query.trim().toLowerCase());
 const filtered=anchors.filter(entry=>entry.label.toLowerCase().includes(query.toLowerCase()));
 const del=(entry:LinkEntry)=>confirmDelete(entry,()=>{remove(entry.id);actions?.deleteAnchor(anchorId(entry as AnchorEntry));if(selectedId===entry.id){setSelectedId(undefined);setQuery('');}});
 const submit=()=>{
  let entry=selected??exact;
  if(!entry){const id=createEntryId('anchor');entry={id,type:'anchor',label:query.trim(),href:`#${id}`};add(entry);}
  actions?.createAnchor(anchorId(entry));close();
 };
 if(editing)return <div className="tool-panel link-panel"><button type="button" className="link-panel-back" onClick={()=>setEditing(undefined)}>‹ <span>Редактирование якорь</span></button><PanelField label="Название" required><Input value={query} onChange={event=>setQuery(event.target.value)} aria-label="Название"/></PanelField><Footer close={()=>setEditing(undefined)} onAction={()=>{if(query.trim()){update({...editing,label:query.trim()});setEditing(undefined);}}} action="Сохранить" disabled={!query.trim()}/></div>;
 return <div className="tool-panel link-panel"><h2>Якорная ссылка</h2><PanelField label="Название" required><div className="link-combobox"><Input value={query} aria-label="Название" allowClear={{clearIcon:<img className="link-input-clear" src="/icons/c3be5.svg" alt=""/>}} onFocus={()=>setShowList(true)} onChange={event=>{setQuery(event.target.value);setSelectedId(undefined);setShowList(true);}} onPressEnter={query.trim()?submit:undefined}/>{showList&&filtered.length>0&&<LibraryRows entries={filtered} onChoose={entry=>{setSelectedId(entry.id);setQuery(entry.label);setShowList(false);}} onEdit={entry=>{setEditing(entry as AnchorEntry);setQuery(entry.label);}} onDelete={del}/>}</div></PanelField><Footer close={close} onAction={submit} action="Добавить" disabled={!query.trim()}/></div>;
}

type CompactView='main'|'alignment'|'list'|'paragraph'|'lineHeight';
export function CompactToolsTrigger({children,disabled=false,inline,paragraph,onInlineAction,onParagraphAction}:{children:ReactNode;disabled?:boolean;inline:InlineFormat;paragraph:ParagraphFormat;onInlineAction:(tool:InlineTool)=>void;onParagraphAction:(tool:ParagraphTool,value?:string)=>void}){
 const [open,setOpen]=useState(false),[view,setView]=useState<CompactView>('main');
 const holder=useRef<HTMLSpanElement>(null);
 const close=()=>{setOpen(false);setView('main');};
 useEffect(()=>{
  if(!open)return;
  const dismiss=(event:MouseEvent)=>{const target=event.target;if(target instanceof Element&&!holder.current?.contains(target)&&!target.closest('.panel-more'))close();};
  const dismissFromEditor=()=>close();
  document.addEventListener('click',dismiss,true);
  document.addEventListener('editor-dismiss-popovers',dismissFromEditor);
  return()=>{document.removeEventListener('click',dismiss,true);document.removeEventListener('editor-dismiss-popovers',dismissFromEditor);};
 },[open]);
 const back=<button className="compact-back" type="button" onClick={()=>setView('main')}><span aria-hidden="true">‹</span>К инструментам</button>;
 const content=view==='alignment'?<div className="compact-subpanel">{back}<MenuPanel tool="alignment" value={paragraph.alignment} onSelect={value=>{onParagraphAction('alignment',value);close();}}/></div>
  :view==='list'?<div className="compact-subpanel">{back}<MenuPanel tool="list" value={paragraph.list} onSelect={value=>{onParagraphAction('list',value);close();}}/></div>
  :view==='paragraph'?<div className="compact-subpanel">{back}<SpacingPanel tool="paragraph" value={paragraph.lineSpacing} close={close} onApply={value=>onParagraphAction('lineSpacing',value)}/></div>
  :view==='lineHeight'?<div className="compact-subpanel">{back}<SpacingPanel tool="lineHeight" value={paragraph.paragraphSpacing} close={close} onApply={value=>onParagraphAction('paragraphSpacing',value)}/></div>
  :<CompactMain inline={inline} paragraph={paragraph} onInline={tool=>{onInlineAction(tool);if(tool==='clear')close();}} onParagraph={(tool,next)=>{if(next)setView(next);else{onParagraphAction(tool);close();}}}/>;
 return <Popover trigger="click" placement="bottom" arrow={{pointAtCenter:true}} open={open&&!disabled} onOpenChange={next=>{setOpen(next);if(!next)setView('main');}} overlayClassName="editor-popover panel-more" content={<div role="dialog" aria-label="Дополнительные инструменты" onKeyDown={event=>{if(event.key==='Escape'){event.stopPropagation();close();}}}>{content}</div>}><span ref={holder} className="panel-trigger" data-open={open&&!disabled}>{children}</span></Popover>;
}

function CompactMain({inline,paragraph,onInline,onParagraph}:{inline:InlineFormat;paragraph:ParagraphFormat;onInline:(tool:InlineTool)=>void;onParagraph:(tool:ParagraphTool,next?:CompactView)=>void}){
 const inlineRows:[InlineTool,string,string][]=[['bold','IconBoldOutlined','Жирный текст'],['italic','IconItalicOutlined','Курсивный текст'],['underline','IconUnderlineOutlined','Подчеркнутый текст'],['strike','IconStrikethroughOutlined','Зачеркнутый текст'],['clear','IconClearOutlined','Очистка форматирования']];
 const paragraphRows:[ParagraphTool,string,string,CompactView?][]=[['alignment','IconAlignLeftOutlined','Выравнивание','alignment'],['list','IconOrderedListOutlined','Список','list'],['shiftRight','IconMenuUnfoldOutlined','Сместить вправо'],['shiftLeft','IconMenuFoldOutlined','Сместить влево'],['lineSpacing','StateDefaultSizeDefault1','Межстрочное расстояние','paragraph'],['paragraphSpacing','StateDefaultSizeDefault','Расстояние между абзацами','lineHeight']];
 return <div className="tool-panel menu-panel more-panel compact-tools"><div className="panel-menu">{inlineRows.map(([id,icon,label])=><button type="button" key={id} aria-pressed={id==='clear'?undefined:inline[id]} className={id!=='clear'&&inline[id]?'is-active':''} onMouseDown={event=>event.preventDefault()} onClick={()=>onInline(id)}><img className="panel-icon" src={icons['img'+icon]} alt=""/><span>{label}</span></button>)}{paragraphRows.map(([id,icon,label,next],index)=><button type="button" key={id} className={index===0?'menu-divider':''} onMouseDown={event=>event.preventDefault()} onClick={()=>onParagraph(id,next)}><img className="panel-icon" src={icons['img'+icon]} alt=""/><span>{label}</span>{next&&<span className="compact-chevron" aria-hidden="true">›</span>}</button>)}</div></div>;
}
function MediaTools({video=false}:{video?:boolean}){const node=video?'6716:89115':'6716:89102';return <div className="media-tools">{['imgIconSplitTextOutlined','imgIconInTextOutlined','imgIconMoveTextOutlined','divider','imgIconPositionLeftOutlined','imgIconPositionCenterOutlined','imgIconPositionRightOutlined'].map((name,i)=>name==='divider'?<span className="media-divider" key={name}/>:<button type="button" key={name} aria-label={['Разрыв текста','В тексте','Обтекание','','Слева','По центру','Справа'][i]}><Asset node={node} name={name}/></button>)}</div>;}
export function PanelContent({tool,close,value,onApply,linkActions}:{tool:ToolId;close:()=>void;value?:string;onApply?:(value:string)=>void;linkActions?:LinkPanelActions}){
 if(tool==='textType'||tool==='font'||tool==='fontSize')return <CatalogFormatPanel tool={tool} close={close}/>;
 if(tool==='link')return <LinkPanel close={close} actions={linkActions}/>;
 if(tool==='paragraph'||tool==='lineHeight')return <SpacingPanel tool={tool} value={value} close={close} onApply={onApply}/>;
 if(['color','highlight','cellColor','fillColor'].includes(tool))return <ColorPanel tool={tool}/>;
 if(tool==='alignment'||tool==='list'||tool==='more')return <MenuPanel tool={tool} value={value} onSelect={selected=>{onApply?.(selected);if(onApply)close();}}/>;
 if(tool==='anchor')return <AnchorPanel close={close} actions={linkActions}/>;
 if(tool==='table')return <div className="tool-panel"><h2>Таблица</h2><span>Действия</span><div className="table-actions">{['imgIconInsertRowAboveOutlined','imgIconGroupOutlined','imgIconUngroupOutlined','imgIconDeleteOutlined'].map((name,i)=><Button key={name} aria-label={['Действия с таблицей','Объединить ячейки','Разделить ячейки','Удалить'][i]}><Asset node="6716:89089" name={name}/>{(i===0||i===3)&&<Asset node="6716:89089" name="imgIconCaretDownOutlined" className="tiny-icon"/>}</Button>)}</div><PanelField label="Столбцы" required/><PanelField label="Строки" required/><Checkbox>Добавить строчку заголовка</Checkbox><Footer close={close} action="Добавить"/></div>;
 if(tool==='image'||tool==='video'){const video=tool==='video';return <div className="tool-panel"><h2>{video?'Настройка видео':'Настройка изображения'}</h2><MediaTools video={video}/>{!video&&<Button className="upload-placeholder"><Asset node="6716:89102" name="imgIconUploadOutlined"/>Загрузить изображение</Button>}<PanelField label="Высота"><Input aria-label="Высота" placeholder="Введите" addonAfter="px"/></PanelField><PanelField label="Ширина"><Input aria-label="Ширина" placeholder="Введите" addonAfter="px"/></PanelField><PanelField label={video?'Ссылка на видео':'Ссылка для перехода по изображению'} placeholder={video?'Введите значение':'Введите'} required={video}/><Checkbox>Использовать оригинальный размер {video?'видео':'изображения'}</Checkbox><Footer close={close} action="Добавить"/></div>;}
 if(tool==='symbol')return <div className="tool-panel"><h2>Спец символы</h2><div className="symbol-grid">{Array.from('‐‑‒–—―‘’‚‛“”„‟¡¿§©®™†‡•‣․‥…‧‰‱′″‴‵‶‸‹›´µ¶·«»¼½¾℃№ﬀﬁﬂﬃﬄﬅﬆ←↑→↓↔↕↖↗↘↙⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁼⁽⁺⁾ⁿⁱ').map((s,i)=><button type="button" key={i} aria-label={`Символ ${s}`}>{s}</button>)}</div></div>;
 if(tool==='search')return <div className="tool-panel"><div className="panel-title-row"><h2>Найти и заменить</h2><div className="search-count"><span>0/0</span><button type="button" aria-label="Предыдущее совпадение"><Asset node="6716:89141" name="imgIconLeftOutlined"/></button><button type="button" aria-label="Следующее совпадение"><Asset node="6716:89141" name="imgIconRightOutlined"/></button></div></div><PanelField label="Найти" placeholder="Текст для поиска"/><PanelField label="Заменить" placeholder="Текст для замены"/><Checkbox>Учитывать регистр</Checkbox><Checkbox>Использовать регулярные выражения</Checkbox><Checkbox>Игнорировать диакритические знаки в латинице</Checkbox><div className="panel-footer"><Button>Заменить все</Button><Button type="primary">Заменить</Button></div></div>;
 return null;
}

export function PanelCatalog({iconSize=20}:{iconSize?:16|20}){return <section className="panel-catalog"><h2>Окна инструментов</h2><div className="panel-catalog-grid">{(Object.keys(toolLabels) as ToolId[]).map(tool=>{const found=Object.entries(panelForIcon).find(([,id])=>id===tool)?.[0];return <PanelTrigger key={`${tool}-${iconSize}`} tool={tool}><Button>{found?<img src={icons['img'+found]} style={{width:iconSize,height:iconSize}} alt=""/>:null}{toolLabels[tool]}</Button></PanelTrigger>;})}</div></section>;}
