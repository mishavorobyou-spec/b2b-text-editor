import React, {useEffect, useId, useRef, useState, type ReactNode} from 'react';
import {Button, Input, InputNumber, Segmented, Switch, Popover, Checkbox, Modal, Tooltip, Upload, Tabs, Select, Image as AntImage} from 'antd';
import {icons} from './all-assets';
import {panelAssets} from './panel-assets';
import './panels.css';
import './link-tools.css';
import './table-tools.css';
import './image-tools.css';
import './video-tools.css';
import {FormatPanel, defaultFormat, type FormatTool} from './TextFormatting';
import type {InlineFormat, InlineTool, ParagraphFormat, ParagraphTool, SearchOptions, SearchSnapshot, TableAction, TableState, ColorState, ColorTool} from './useTextDocument';
import {ColorPanel} from './ColorTools';
import type {EditorImageData, ImageLayout, ImageAlignment} from './EditorImage';
import type {EditorVideoData} from './EditorVideo';
import {parseVideoSource} from './VideoPlayer';
import {SeoImageChoice, type SeoImageVariant} from './SeoImageSlot';
import {createEntryId, useLinkLibrary, type AnchorEntry, type LinkEntry, type UrlLinkEntry} from './linkLibrary';

export type ToolId = 'textType'|'font'|'fontSize'|'bold'|'italic'|'underline'|'strike'|'clear'|'color'|'highlight'|'cellColor'|'fillColor'|'alignment'|'list'|'shiftRight'|'shiftLeft'|'paragraph'|'lineHeight'|'link'|'anchor'|'table'|'image'|'seoImage'|'video'|'code'|'symbol'|'search'|'copy'|'paste'|'cut'|'undo'|'redo'|'more';
export const toolLabels:Record<ToolId,string>={textType:'Тип текста',font:'Шрифт',fontSize:'Размер шрифта',bold:'Жирный текст',italic:'Курсивный текст',underline:'Подчеркнутый текст',strike:'Зачеркнутый текст',clear:'Очистка форматирования',color:'Цвет текста',highlight:'Цвет подчеркивания',cellColor:'Цвет фона ячейки',fillColor:'Цветовое оформление',alignment:'Выравнивание',list:'Список',shiftRight:'Сместить вправо',shiftLeft:'Сместить влево',paragraph:'Межстрочное расстояние',lineHeight:'Расстояние между абзацами',link:'Ссылка',anchor:'Якорь',table:'Таблица',image:'Изображение',seoImage:'Изображение SEO',video:'Видео',code:'Код',symbol:'Специальный символ',search:'Найти и заменить',copy:'Копировать',paste:'Вставить',cut:'Вырезать',undo:'Действие назад',redo:'Действие вперёд',more:'Дополнительные инструменты'};
export type ConfigurableToolId=Exclude<ToolId,'textType'|'font'|'fontSize'|'more'>;
export type AssignableToolId=Exclude<ToolId,'more'>;
export type ToolSeparatorId=`separator-${string}`;
export type BuiltinSeparatorId='builtin-format'|'builtin-color'|'builtin-paragraph'|'builtin-insert'|'builtin-edit';
export type ToolCategoryId='category-format'|'category-color'|'category-paragraph'|'category-insert'|'category-edit'|`category-custom-${string}`;
export type ToolOrderItem=AssignableToolId|ToolSeparatorId|BuiltinSeparatorId|ToolCategoryId;
export const isToolSeparator=(value:ToolOrderItem):value is ToolSeparatorId|BuiltinSeparatorId=>value.startsWith('separator-')||value.startsWith('builtin-');
export const isToolCategory=(value:ToolOrderItem):value is ToolCategoryId=>value.startsWith('category-');
export const builtinCategories:Record<Exclude<ToolCategoryId,`category-custom-${string}`>,string>={'category-format':'Форматирование текста','category-color':'Цветовое оформление','category-paragraph':'Абзацы и структура','category-insert':'Вставка объектов','category-edit':'Редактирование'};
export const builtinSeparatorCategory:Record<BuiltinSeparatorId,string>={'builtin-format':'Форматирование текста','builtin-color':'Цветовое оформление','builtin-paragraph':'Абзацы и структура','builtin-insert':'Вставка объектов','builtin-edit':'Редактирование'};
export const configurableTools:ConfigurableToolId[]=['bold','italic','underline','strike','clear','color','highlight','cellColor','fillColor','alignment','list','shiftRight','shiftLeft','paragraph','lineHeight','link','anchor','table','image','seoImage','video','code','symbol','search','copy','paste','cut','undo','redo'];
export const assignableTools:AssignableToolId[]=['textType','font','fontSize',...configurableTools];
export const defaultToolOrder:ToolOrderItem[]=[
 'category-format','builtin-format','bold','italic','underline','strike','clear',
 'category-color','builtin-color','color','highlight','cellColor','fillColor',
 'category-paragraph','builtin-paragraph','alignment','list','shiftRight','shiftLeft','paragraph','lineHeight',
 'category-insert','builtin-insert','link','anchor','table','image','seoImage','video','code','symbol',
 'category-edit','builtin-edit','search','copy','paste','cut','undo','redo',
];
export const panelForIcon:Record<string,ToolId>={IconTextTypeOutlined:'textType',IconFontSizeOutlined:'font',IconFontColorsOutlined:'color',IconHighlightOutlined:'highlight',IconFormatPainterOutlined:'cellColor',IconBgColorsOutlined:'fillColor',IconAlignLeftOutlined:'alignment',IconOrderedListOutlined:'list',StateDefaultSizeDefault1:'paragraph',StateDefaultSizeDefault:'lineHeight',IconLinkOutlined:'link',IconAnchor:'anchor',Icon:'table',IconPictureOutlined:'image',IconVideoCameraOutlined:'video',IconSpecialCharacterOutlined:'symbol',IconReplaceSearchOutlined:'search',IconMoreOutlined:'more'};

export type LinkPanelActions={selectionText:string;hasSelection:boolean;applyLink:(href:string)=>void;setSelectionPreview:(active:boolean)=>void;createAnchor:(anchorId:string,label:string)=>void;deleteAnchor:(anchorId:string)=>void;renameAnchor:(anchorId:string,label:string)=>void;updateLinks:(oldHref:string,newHref:string)=>void};
export type SearchPanelActions={search:(options:SearchOptions,index?:number)=>SearchSnapshot;replace:(options:SearchOptions,replacement:string,index:number,all?:boolean)=>SearchSnapshot;clear:()=>void};
export type TablePanelActions={state:TableState;insert:(columns:number,rows:number,withHeaderRow:boolean)=>boolean;apply:(action:TableAction)=>boolean};
export type ImagePanelActions={selected:EditorImageData|null;insert:(data:EditorImageData)=>boolean};
export type SeoImageActions={insert:(variant:SeoImageVariant)=>boolean};
export type VideoPanelActions={selected:EditorVideoData|null;insert:(data:EditorVideoData)=>boolean};
export type ColorPanelActions={state:ColorState;apply:(tool:ColorTool,color:string|null)=>void};
export type SymbolPanelActions={insert:(symbol:string)=>boolean};
const colorMenuItems:[ColorTool,string,string][]=[['color','Цвет текста','imgIconFontColorsOutlined'],['highlight','Цвет подчеркивания','imgIconHighlightOutlined'],['cellColor','Цвет фона ячейки','imgIconFormatPainterOutlined']];
function ColorMenu({onSelect,hiddenTools=[]}:{onSelect:(tool:ColorTool)=>void;hiddenTools?:ConfigurableToolId[]}){return <div className="color-tool-menu">{colorMenuItems.filter(([tool])=>!hiddenTools.includes(tool)).map(([tool,label,icon])=><button key={tool} type="button" onMouseDown={event=>event.preventDefault()} onClick={()=>onSelect(tool)}><img src={panelAssets['6716:89154'][icon]} alt=""/>{label}</button>)}</div>;}

export function PanelTrigger({tool,children,disabled=false,value,onApply,linkActions,searchActions,tableActions,imageActions,videoActions,imageMode='standard',seoImageActions,colorActions,symbolActions,hiddenTools=[]}:{tool:ToolId;children:ReactNode;disabled?:boolean;value?:string;onApply?:(value:string)=>void;linkActions?:LinkPanelActions;searchActions?:SearchPanelActions;tableActions?:TablePanelActions;imageActions?:ImagePanelActions;videoActions?:VideoPanelActions;imageMode?:'standard'|'seo';seoImageActions?:SeoImageActions;colorActions?:ColorPanelActions;symbolActions?:SymbolPanelActions;hiddenTools?:ConfigurableToolId[]}){
 const [open,setOpen]=useState(false);
 const [colorView,setColorView]=useState<ColorTool|null>(null);
 const holder=useRef<HTMLSpanElement>(null);
 const close=()=>{setOpen(false);setColorView(null);holder.current?.querySelector<HTMLElement>('button,input')?.focus();};
 useEffect(()=>{
  if(tool!=='link'||!open)return;
  linkActions?.setSelectionPreview(true);
  return()=>linkActions?.setSelectionPreview(false);
 },[open,tool]);
 useEffect(()=>{
  if(!open||tool==='link')return;
  const dismiss=(event:MouseEvent)=>{const target=event.target;if(target instanceof Element&&!holder.current?.contains(target)&&!target.closest(`.panel-${tool}`))setOpen(false);};
  const dismissFromEditor=()=>setOpen(false);
  document.addEventListener('click',dismiss,true);
  document.addEventListener('editor-dismiss-popovers',dismissFromEditor);
  return()=>{document.removeEventListener('click',dismiss,true);document.removeEventListener('editor-dismiss-popovers',dismissFromEditor);};
 },[open,tool]);
 const colorTool=tool==='fillColor'?colorView:tool==='color'||tool==='highlight'||tool==='cellColor'?tool:null;
 const colorContent=colorTool?<div className={tool==='fillColor'?'color-tool-subpanel':''}>{tool==='fillColor'&&<button type="button" className="compact-back" onClick={()=>setColorView(null)}><span aria-hidden="true">‹</span>К выбору цвета</button>}<ColorPanel key={`${colorTool}-${open}`} tool={colorTool} value={colorActions?.state[colorTool]??null} deferred={tool==='fillColor'} onDone={close} onApply={(selected,color)=>colorActions?.apply(selected,color)}/></div>:<ColorMenu onSelect={setColorView} hiddenTools={hiddenTools}/>;
 return <Popover trigger="click" placement={tool==='image'&&imageMode==='seo'?'bottomRight':'bottom'} arrow={{pointAtCenter:true}} open={open&&!disabled} onOpenChange={next=>{if(next||tool!=='link')setOpen(next);if(!next)setColorView(null);}} destroyOnHidden overlayClassName={`editor-popover panel-${tool}`} content={<div role="dialog" aria-label={toolLabels[tool]} onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();close();}}}>{colorTool||tool==='fillColor'?colorContent:<PanelContent key={`${tool}-${value??''}-${imageMode}`} tool={tool} close={close} value={value} onApply={onApply} linkActions={linkActions} searchActions={searchActions} tableActions={tableActions} imageActions={imageActions} videoActions={videoActions} imageMode={imageMode} seoImageActions={seoImageActions} symbolActions={symbolActions}/>}</div>}><span ref={holder} className="panel-trigger" data-open={open&&!disabled} onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();setOpen(false);}}}>{children}</span></Popover>;
}

export function PanelField({label,placeholder='Введите',required=false,children}:{label?:string;placeholder?:string;required?:boolean;children?:ReactNode}){
 const id=useId();
 return <div className="panel-field">{label&&<label htmlFor={id}>{required&&<span className="required">* </span>}{label}</label>}{children??<Input id={id} aria-label={label??placeholder} placeholder={placeholder}/>}</div>;
}
function Footer({close,onAction,action='Применить',disabled=false}:{close:()=>void;onAction?:()=>void;action?:string;disabled?:boolean}){return <div className="panel-footer"><Button onMouseDown={event=>event.preventDefault()} onClick={close}>Отменить</Button><Button type="primary" onMouseDown={event=>event.preventDefault()} onClick={onAction} disabled={disabled}>{action}</Button></div>;}
const Asset=({node,name,className='panel-icon'}:{node:string;name:string;className?:string})=><img className={className} src={panelAssets[node]?.[name]} alt=""/>;
function CatalogFormatPanel({tool,close}:{tool:FormatTool;close:()=>void}){const [value,setValue]=useState(defaultFormat[tool]);return <FormatPanel tool={tool} value={value} onCancel={close} onApply={v=>{setValue(v);close();}}/>;}
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

function LibraryRows({entries,onChoose,onEdit,onDelete,showAnchorIcon=true}:{entries:LinkEntry[];onChoose:(entry:LinkEntry)=>void;onEdit:(entry:LinkEntry)=>void;onDelete:(entry:LinkEntry)=>void;showAnchorIcon?:boolean}){
 if(!entries.length)return <div className="link-library-empty">Ничего не найдено</div>;
 return <div className="link-library-list" role="listbox">{entries.map(entry=><div className="link-library-row" role="option" aria-label={entry.label} key={entry.id} onMouseDown={event=>event.preventDefault()} onClick={()=>onChoose(entry)}>{showAnchorIcon&&entry.type==='anchor'&&<img className="link-library-type-icon" src={icons.imgIconAnchor} alt=""/>}<span className="link-library-label">{entry.label}</span><button type="button" aria-label={`Редактировать ${entry.label}`} onClick={event=>{event.stopPropagation();onEdit(entry);}}><img src="/icons/link-edit.svg" alt=""/></button><button type="button" aria-label={`Удалить ${entry.label}`} onClick={event=>{event.stopPropagation();onDelete(entry);}}><img src="/icons/link-delete.svg" alt=""/></button></div>)}</div>;
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
  if(editing.type==='anchor')actions?.renameAnchor(anchorId(editing),next.label);
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
  actions?.createAnchor(anchorId(entry),entry.label);close();
 };
 if(editing)return <div className="tool-panel link-panel"><button type="button" className="link-panel-back" onClick={()=>setEditing(undefined)}>‹ <span>Редактирование якоря</span></button><PanelField label="Название" required><Input value={query} onChange={event=>setQuery(event.target.value)} aria-label="Название"/></PanelField><Footer close={()=>setEditing(undefined)} onAction={()=>{if(query.trim()){const label=query.trim();update({...editing,label});actions?.renameAnchor(anchorId(editing),label);setEditing(undefined);}}} action="Сохранить" disabled={!query.trim()}/></div>;
 return <div className="tool-panel link-panel"><h2>Якорь</h2><PanelField label="Название" required><div className="link-combobox"><Input value={query} aria-label="Название" allowClear={{clearIcon:<img className="link-input-clear" src="/icons/c3be5.svg" alt=""/>}} onFocus={()=>setShowList(true)} onChange={event=>{setQuery(event.target.value);setSelectedId(undefined);setShowList(true);}} onPressEnter={query.trim()?submit:undefined}/>{showList&&filtered.length>0&&<LibraryRows entries={filtered} showAnchorIcon={false} onChoose={entry=>{setSelectedId(entry.id);setQuery(entry.label);setShowList(false);}} onEdit={entry=>{setEditing(entry as AnchorEntry);setQuery(entry.label);}} onDelete={del}/>}</div></PanelField><Footer close={close} onAction={submit} action="Добавить" disabled={!query.trim()}/></div>;
}

type CompactView='main'|'alignment'|'list'|'paragraph'|'lineHeight'|ColorTool;
export function CompactToolsTrigger({children,disabled=false,inline,paragraph,colorActions,hiddenTools=[],onInlineAction,onParagraphAction}:{children:ReactNode;disabled?:boolean;inline:InlineFormat;paragraph:ParagraphFormat;colorActions?:ColorPanelActions;hiddenTools?:ConfigurableToolId[];onInlineAction:(tool:InlineTool)=>void;onParagraphAction:(tool:ParagraphTool,value?:string)=>void}){
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
  :view==='color'||view==='highlight'||view==='cellColor'?<div className="color-tool-subpanel">{back}<ColorPanel key={view} tool={view} value={colorActions?.state[view]??null} onApply={(selected,color)=>colorActions?.apply(selected,color)}/></div>
  :<CompactMain inline={inline} paragraph={paragraph} hiddenTools={hiddenTools} onInline={tool=>{onInlineAction(tool);if(tool==='clear')close();}} onParagraph={(tool,next)=>{if(next)setView(next);else{onParagraphAction(tool);close();}}} onColor={setView}/>;
 return <Popover trigger="click" placement="bottom" arrow={{pointAtCenter:true}} open={open&&!disabled} onOpenChange={next=>{setOpen(next);if(!next)setView('main');}} overlayClassName="editor-popover panel-more" content={<div role="dialog" aria-label="Дополнительные инструменты" onKeyDown={event=>{if(event.key==='Escape'){event.stopPropagation();close();}}}>{content}</div>}><span ref={holder} className="panel-trigger" data-open={open&&!disabled}>{children}</span></Popover>;
}

function CompactMain({inline,paragraph,hiddenTools,onInline,onParagraph,onColor}:{inline:InlineFormat;paragraph:ParagraphFormat;hiddenTools:ConfigurableToolId[];onInline:(tool:InlineTool)=>void;onParagraph:(tool:ParagraphTool,next?:CompactView)=>void;onColor:(tool:ColorTool)=>void}){
 const inlineRows:[InlineTool,string,string][]=[['bold','IconBoldOutlined','Жирный текст'],['italic','IconItalicOutlined','Курсивный текст'],['underline','IconUnderlineOutlined','Подчеркнутый текст'],['strike','IconStrikethroughOutlined','Зачеркнутый текст'],['code','IconCodeOutlined','Код'],['clear','IconClearOutlined','Очистка форматирования']];
 const paragraphRows:[ParagraphTool,string,string,CompactView?][]=[['alignment','IconAlignLeftOutlined','Выравнивание','alignment'],['list','IconOrderedListOutlined','Список','list'],['shiftRight','IconMenuUnfoldOutlined','Сместить вправо'],['shiftLeft','IconMenuFoldOutlined','Сместить влево'],['lineSpacing','StateDefaultSizeDefault1','Межстрочное расстояние','paragraph'],['paragraphSpacing','StateDefaultSizeDefault','Расстояние между абзацами','lineHeight']];
 const paragraphToolId:Partial<Record<ParagraphTool,ConfigurableToolId>>={alignment:'alignment',list:'list',lineSpacing:'paragraph',paragraphSpacing:'lineHeight'};
 return <div className="tool-panel menu-panel more-panel compact-tools"><div className="panel-menu">{inlineRows.map(([id,icon,label])=><button type="button" key={id} aria-pressed={id==='clear'?undefined:inline[id]} className={id!=='clear'&&inline[id]?'is-active':''} onMouseDown={event=>event.preventDefault()} onClick={()=>onInline(id)}><img className="panel-icon" src={icons['img'+icon]} alt=""/><span>{label}</span></button>)}{paragraphRows.filter(([id])=>!paragraphToolId[id]||!hiddenTools.includes(paragraphToolId[id]!)).map(([id,icon,label,next],index)=><button type="button" key={id} className={index===0?'menu-divider':''} disabled={id==='shiftRight'&&!paragraph.canShiftRight||id==='shiftLeft'&&!paragraph.canShiftLeft} onMouseDown={event=>event.preventDefault()} onClick={()=>onParagraph(id,next)}><img className="panel-icon" src={icons['img'+icon]} alt=""/><span>{label}</span>{next&&<span className="compact-chevron" aria-hidden="true">›</span>}</button>)}{colorMenuItems.filter(([id])=>!hiddenTools.includes(id)).map(([id,label,icon],index)=><button type="button" key={id} className={index===0?'menu-divider':''} onMouseDown={event=>event.preventDefault()} onClick={()=>onColor(id)}><img className="panel-icon" src={panelAssets['6716:89154'][icon]} alt=""/><span>{label}</span><span className="compact-chevron" aria-hidden="true">›</span></button>)}</div></div>;
}
const blankImage:EditorImageData={src:'',name:'',width:null,height:null,href:'',originalSize:false,layout:'break',align:'left'};
const mediaAlignmentOptions:{value:ImageAlignment;label:string;icon:string;activeIcon:string}[]=[
 {value:'left',label:'По левому краю',icon:'/icons/794cb.svg',activeIcon:'/icons/794cb.svg'},
 {value:'center',label:'По центру',icon:'/icons/de18f.svg',activeIcon:'/icons/position-center-active.svg'},
 {value:'right',label:'По правому краю',icon:'/icons/0efc1.svg',activeIcon:'/icons/position-right-active.svg'},
];
function imageData(file:File):Promise<string>{return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>typeof reader.result==='string'?resolve(reader.result):reject(new Error('Не удалось прочитать файл'));reader.onerror=()=>reject(new Error('Не удалось прочитать файл'));reader.readAsDataURL(file);});}
export function ImagePanel({close,actions}:{close:()=>void;actions?:ImagePanelActions}){
 const [draft,setDraft]=useState<EditorImageData>(()=>{
  const selected=actions?.selected??blankImage;
  return selected.layout==='inline'?{...selected,layout:'break'}:selected;
 });
 const [error,setError]=useState('');
 const set=<K extends keyof EditorImageData>(key:K,value:EditorImageData[K])=>setDraft(current=>({...current,[key]:value}));
 const upload=(file:File)=>{
  if(!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type)){setError('Выберите PNG, JPEG, WebP или GIF');return Upload.LIST_IGNORE;}
  setError('');
  void imageData(file).then(src=>setDraft(current=>({...current,src,name:file.name,width:null,height:null,originalSize:true}))).catch(()=>setError('Не удалось прочитать изображение'));
  return false;
 };
 const href=draft.href.trim();
 const linkValid=!href||validUrl(href);
 const submit=()=>{if(draft.src&&linkValid&&actions?.insert({...draft,href}))close();};
 const layoutOptions:{value:ImageLayout;label:string;icon:string;activeIcon:string}[]=[{value:'break',label:'Изображение отдельной строкой',icon:'/icons/ee97a.svg',activeIcon:'/icons/da9b9.svg'},{value:'wrap',label:'Заливка области',icon:'/icons/13250.svg',activeIcon:'/icons/a96d5.svg'}];
 return <div className="tool-panel image-panel">
  <h2>Настройка изображения</h2>
  <div className="media-tools image-mode-tools" role="group" aria-label="Размещение изображения">
   {layoutOptions.map(option=><Tooltip key={option.value} title={option.label}><button type="button" aria-label={option.label} aria-pressed={draft.layout===option.value} className={draft.layout===option.value?'is-active':''} onMouseDown={event=>event.preventDefault()} onClick={()=>set('layout',option.value)}><span className="image-layout-icon"><img className="panel-icon image-layout-default" src={option.icon} alt=""/><img className="panel-icon image-layout-emphasis" src={option.activeIcon} alt=""/></span></button></Tooltip>)}
   <span className="media-divider" aria-hidden="true"/>
   {mediaAlignmentOptions.map(option=><Tooltip key={option.value} title={option.label}><button type="button" aria-label={option.label} aria-pressed={draft.align===option.value} data-align={option.value} className={`image-align-button ${draft.align===option.value?'is-active':''}`} onMouseDown={event=>event.preventDefault()} onClick={()=>set('align',option.value)}><span className="image-layout-icon"><img className="panel-icon image-layout-default" src={option.icon} alt=""/><img className="panel-icon image-layout-emphasis" src={option.activeIcon} alt=""/></span></button></Tooltip>)}
  </div>
  {draft.src?<div className="image-uploaded"><AntImage src={draft.src} alt={draft.name} width={48} height={48} preview={false}/><span title={draft.name}>{draft.name}</span><Button type="text" aria-label="Удалить загруженное изображение" onClick={()=>setDraft(current=>({...current,src:'',name:''}))}><Asset node="6716:89089" name="imgIconDeleteOutlined"/></Button><Tooltip title="PNG, JPEG, WebP или GIF"><span className="image-upload-hint" tabIndex={0} aria-label="Поддерживаются PNG, JPEG, WebP и GIF"><Asset node="6716:89102" name="imgIconInfoCircleOutlined"/></span></Tooltip></div>:<div className="image-upload-wrap"><Upload accept="image/png,image/jpeg,image/webp,image/gif" beforeUpload={upload} showUploadList={false}><Button className="upload-placeholder"><Asset node="6716:89102" name="imgIconUploadOutlined"/>Загрузить изображение</Button></Upload><Tooltip title="PNG, JPEG, WebP или GIF"><span className="image-upload-hint" tabIndex={0} aria-label="Поддерживаются PNG, JPEG, WebP и GIF"><Asset node="6716:89102" name="imgIconInfoCircleOutlined"/></span></Tooltip></div>}
  {error&&<div className="image-panel-error" role="alert">{error}</div>}
  <PanelField label="Высота"><div className="image-size-control"><Input inputMode="numeric" value={draft.height??''} disabled={draft.originalSize} onChange={event=>{const value=event.target.value;if(/^\d*$/.test(value)&&Number(value)<=10000)set('height',value?Number(value):null);}} placeholder="Введите" aria-label="Высота"/><span>px</span></div></PanelField>
  <PanelField label="Ширина"><div className="image-size-control"><Input inputMode="numeric" value={draft.width??''} disabled={draft.originalSize} onChange={event=>{const value=event.target.value;if(/^\d*$/.test(value)&&Number(value)<=10000)set('width',value?Number(value):null);}} placeholder="Введите" aria-label="Ширина"/><span>px</span></div></PanelField>
  <PanelField label="Ссылка для перехода по изображению"><Input value={draft.href} status={linkValid?undefined:'error'} onChange={event=>set('href',event.target.value)} placeholder="Введите" allowClear aria-label="Ссылка для перехода по изображению"/></PanelField>
  <Checkbox checked={draft.originalSize} onChange={event=>set('originalSize',event.target.checked)}>Использовать оригинальный размер изображения</Checkbox>
  <Footer close={close} action={actions?.selected?'Сохранить':'Добавить'} onAction={submit} disabled={!draft.src||!linkValid||draft.width===0||draft.height===0}/>
 </div>;
}

const blankVideo:EditorVideoData={src:'',width:null,height:null,originalSize:false,layout:'inline',align:'left',muted:false,kind:'video'};
export function VideoPanel({close,actions}:{close:()=>void;actions?:VideoPanelActions}){
 const linkId=useId();
 const [draft,setDraft]=useState<EditorVideoData>(actions?.selected??blankVideo);
 const set=<K extends keyof EditorVideoData>(key:K,value:EditorVideoData[K])=>setDraft(current=>({...current,[key]:value}));
 const source=parseVideoSource(draft.src);
 const valid=Boolean(source)&&draft.width!==0&&draft.height!==0;
 const submit=()=>{if(valid&&actions?.insert({...draft,src:draft.src.trim()}))close();};
 const layoutOptions:{value:ImageLayout;label:string;icon:string;activeIcon:string}[]=[{value:'break',label:'Разбить текст',icon:'imgIconSplitTextOutlined',activeIcon:'/icons/da9b9.svg'},{value:'inline',label:'В один ряд',icon:'imgIconInTextOutlined',activeIcon:'/icons/96b0d.svg'},{value:'wrap',label:'Заливка области',icon:'imgIconMoveTextOutlined',activeIcon:'/icons/a96d5.svg'}];
 return <div className="tool-panel video-panel">
  <h2>Настройка видео</h2>
  <div className="media-tools image-mode-tools" role="group" aria-label="Размещение видео">
   {layoutOptions.map(option=><Tooltip key={option.value} title={option.label}><button type="button" aria-label={option.label} aria-pressed={draft.layout===option.value} className={draft.layout===option.value?'is-active':''} onMouseDown={event=>event.preventDefault()} onClick={()=>set('layout',option.value)}><img className="panel-icon" src={draft.layout===option.value?option.activeIcon:panelAssets['6716:89115'][option.icon]} alt=""/></button></Tooltip>)}
   <span className="media-divider" aria-hidden="true"/>
   {mediaAlignmentOptions.map(option=><Tooltip key={option.value} title={option.label}><button type="button" aria-label={option.label} aria-pressed={draft.align===option.value} data-align={option.value} className={`image-align-button ${draft.align===option.value?'is-active':''}`} onMouseDown={event=>event.preventDefault()} onClick={()=>set('align',option.value)}><span className="image-layout-icon"><img className="panel-icon image-layout-default" src={option.icon} alt=""/><img className="panel-icon image-layout-emphasis" src={option.activeIcon} alt=""/></span></button></Tooltip>)}
  </div>
  <PanelField label="Высота"><div className="image-size-control"><Input inputMode="numeric" value={draft.height??''} disabled={draft.originalSize} onChange={event=>{const value=event.target.value;if(/^\d*$/.test(value)&&Number(value)<=10000)set('height',value?Number(value):null);}} placeholder="Введите" aria-label="Высота"/><span>px</span></div></PanelField>
  <PanelField label="Ширина"><div className="image-size-control"><Input inputMode="numeric" value={draft.width??''} disabled={draft.originalSize} onChange={event=>{const value=event.target.value;if(/^\d*$/.test(value)&&Number(value)<=10000)set('width',value?Number(value):null);}} placeholder="Введите" aria-label="Ширина"/><span>px</span></div></PanelField>
  <div className="panel-field"><div className="video-link-label"><label htmlFor={linkId}><span className="required">* </span>Ссылка на видео</label><Tooltip title="Поддерживаются ссылки YouTube, Vimeo и прямые ссылки на MP4, WebM, OGG"><span className="video-link-hint" tabIndex={0} role="img" aria-label="Поддерживаемые ссылки"><Asset node="6716:89115" name="imgIconInfoCircleOutlined"/></span></Tooltip></div><Input id={linkId} value={draft.src} status={draft.src.trim()&&!source?'error':undefined} onChange={event=>set('src',event.target.value)} placeholder="Введите значение" allowClear aria-label="Ссылка на видео"/></div>
  {draft.src.trim()&&!source&&<span className="video-panel-error" role="alert">Введите ссылку на YouTube, Vimeo или видеофайл MP4, WebM, OGG</span>}
  <Checkbox checked={draft.originalSize} onChange={event=>set('originalSize',event.target.checked)}>Использовать оригинальный размер видео</Checkbox>
  <Footer close={close} action={actions?.selected?'Сохранить':'Добавить'} onAction={submit} disabled={!valid}/>
 </div>;
}
const regexHint='Позволяют задать шаблон поиска, например, искать любое число (\\d+) или слово, начинающееся с заглавной буквы ([A-Z]\\w+)';
const diacriticsHint='Поиск не будет учитывать надстрочные/подстрочные знаки (например, é = e, ñ = n). Поиск «cafe» найдет также «café», если включена опция игнорирования диакритики.';
function SearchPanel({actions}:{actions?:SearchPanelActions}){
 const [query,setQuery]=useState(''),[replacement,setReplacement]=useState('');
 const [caseSensitive,setCaseSensitive]=useState(false),[regularExpression,setRegularExpression]=useState(false),[ignoreDiacritics,setIgnoreDiacritics]=useState(false);
 const [snapshot,setSnapshot]=useState<SearchSnapshot>({matches:0,activeIndex:0});
 const options:SearchOptions={query,caseSensitive,regularExpression,ignoreDiacritics};
 const run=(next:SearchOptions,index=0)=>setSnapshot(actions?.search(next,index)??{matches:0,activeIndex:0});
 const changeQuery=(value:string)=>{setQuery(value);run({...options,query:value});};
 const toggle=(field:'caseSensitive'|'regularExpression'|'ignoreDiacritics',checked:boolean)=>{
  const next={...options,[field]:checked};
  if(field==='caseSensitive')setCaseSensitive(checked);
  if(field==='regularExpression')setRegularExpression(checked);
  if(field==='ignoreDiacritics')setIgnoreDiacritics(checked);
  run(next);
 };
 const move=(step:number)=>run(options,snapshot.activeIndex+step);
 const replace=(all=false)=>setSnapshot(actions?.replace(options,replacement,snapshot.activeIndex,all)??{matches:0,activeIndex:0});
 const actionsRef=useRef(actions);actionsRef.current=actions;
 useEffect(()=>()=>actionsRef.current?.clear(),[]);
 return <div className="tool-panel search-panel"><div className="panel-title-row"><h2>Найти и заменить</h2><div className="search-count"><span>{snapshot.matches?snapshot.activeIndex+1:0}/{snapshot.matches}</span><button type="button" aria-label="Предыдущее совпадение" disabled={!snapshot.matches} onClick={()=>move(-1)}><Asset node="6716:89141" name="imgIconLeftOutlined"/></button><button type="button" aria-label="Следующее совпадение" disabled={!snapshot.matches} onClick={()=>move(1)}><Asset node="6716:89141" name="imgIconRightOutlined"/></button></div></div><PanelField label="Найти"><Input value={query} status={snapshot.error?'error':undefined} maxLength={40} showCount aria-label="Найти" placeholder="Текст для поиска" allowClear onChange={event=>changeQuery(event.target.value)}/></PanelField>{snapshot.error&&<span className="search-error">{snapshot.error}</span>}<PanelField label="Заменить"><Input value={replacement} maxLength={40} showCount aria-label="Заменить" placeholder="Текст для замены" allowClear onChange={event=>setReplacement(event.target.value)}/></PanelField><Checkbox checked={caseSensitive} onChange={event=>toggle('caseSensitive',event.target.checked)}>Учитывать регистр</Checkbox><Checkbox checked={regularExpression} onChange={event=>toggle('regularExpression',event.target.checked)}>Использовать регулярные выражения <Tooltip title={regexHint}><span className="search-help" tabIndex={0} aria-label={regexHint}><Asset node="6716:89141" name="imgIconQuestionCircleOutlined"/></span></Tooltip></Checkbox><Checkbox checked={ignoreDiacritics} onChange={event=>toggle('ignoreDiacritics',event.target.checked)}>Игнорировать диакритические знаки в латинице <Tooltip title={diacriticsHint}><span className="search-help" tabIndex={0} aria-label={diacriticsHint}><Asset node="6716:89141" name="imgIconQuestionCircleOutlined"/></span></Tooltip></Checkbox><div className="panel-footer"><Button disabled={!snapshot.matches} onClick={()=>replace(true)}>Заменить все</Button><Button type="primary" disabled={!snapshot.matches} onClick={()=>replace()}>Заменить</Button></div></div>;
}

const addTableItems:{action:TableAction;label:string;rotate:number}[]=[
 {action:'addRowBefore',label:'Добавить строку сверху',rotate:0},
 {action:'addRowAfter',label:'Добавить строку снизу',rotate:180},
 {action:'addColumnBefore',label:'Добавить колонку слева',rotate:270},
 {action:'addColumnAfter',label:'Добавить колонку справа',rotate:90},
];
const deleteTableItems:{action:TableAction;label:string}[]=[
 {action:'deleteRow',label:'Удалить строчку'},
 {action:'deleteColumn',label:'Удалить колонку'},
 {action:'removeBorder',label:'Удалить обводку таблицы'},
 {action:'deleteTable',label:'Удалить таблицу'},
];
function TablePanel({close,actions}:{close:()=>void;actions?:TablePanelActions}){
 const [columns,setColumns]=useState<number|null>(null),[rows,setRows]=useState<number|null>(null),[header,setHeader]=useState(false);
 const [menu,setMenu]=useState<'add'|'delete'>();
 const state=actions?.state;
 const run=(action:TableAction)=>{actions?.apply(action);setMenu(undefined);};
 const actionButton=(kind:'add'|'delete',icon:string,label:string,disabled=false)=><Tooltip title={label}><Button className={`table-action-button ${menu===kind?'is-open':''}`} disabled={disabled} aria-label={label} onMouseDown={event=>event.preventDefault()} onClick={()=>setMenu(current=>current===kind?undefined:kind)}><Asset node="6716:89089" name={icon}/><Asset node="6716:89089" name="imgIconCaretDownOutlined" className="tiny-icon"/></Button></Tooltip>;
 const valid=columns!==null&&columns>=1&&columns<=10&&rows!==null&&rows>=1&&rows<=20;
 return <div className="tool-panel table-panel">
  <h2>Таблица</h2><span className="table-actions-label">Действия</span>
  <div className="table-actions-wrap"><div className="table-actions">
   {actionButton('add','imgIconInsertRowAboveOutlined','Добавить колонку',!state?.active)}
   <Tooltip title="Объединить ячейки"><Button className="table-action-button" aria-label="Объединить ячейки" disabled={!state?.canMerge} onMouseDown={event=>event.preventDefault()} onClick={()=>run('mergeCells')}><Asset node="6716:89089" name="imgIconGroupOutlined"/></Button></Tooltip>
   <Tooltip title="Разделить ячейки"><Button className="table-action-button" aria-label="Разделить ячейки" disabled={!state?.canSplit} onMouseDown={event=>event.preventDefault()} onClick={()=>run('splitCell')}><Asset node="6716:89089" name="imgIconUngroupOutlined"/></Button></Tooltip>
   {actionButton('delete','imgIconDeleteOutlined','Удаление',!state?.active)}
  </div>
  {menu==='add'&&<div className="table-action-menu table-add-menu" role="menu">{addTableItems.map(item=><button type="button" role="menuitem" key={item.action} onMouseDown={event=>event.preventDefault()} onClick={()=>run(item.action)}><span className="table-menu-transform" style={{transform:`rotate(${item.rotate}deg)`}}><Asset node="6716:89089" name="imgIconInsertRowAboveOutlined" className="table-menu-icon"/></span><span>{item.label}</span></button>)}</div>}
  {menu==='delete'&&<div className="table-action-menu table-delete-menu" role="menu">{deleteTableItems.map(item=><button type="button" role="menuitem" key={item.action} disabled={(item.action==='deleteRow'&&!state?.canDeleteRow)||(item.action==='deleteColumn'&&!state?.canDeleteColumn)||(item.action==='deleteTable'&&!state?.canDeleteTable)||(item.action==='removeBorder'&&state?.borderless)} onMouseDown={event=>event.preventDefault()} onClick={()=>run(item.action)}>{item.label}</button>)}</div>}
  </div>
  <PanelField label="Столбцы" required><InputNumber min={1} max={10} precision={0} controls={false} value={columns} status={columns!==null&&(columns<1||columns>10)?'error':undefined} onChange={value=>setColumns(value)} placeholder="Введите" aria-label="Столбцы"/></PanelField>
  <PanelField label="Строки" required><InputNumber min={1} max={20} precision={0} controls={false} value={rows} status={rows!==null&&(rows<1||rows>20)?'error':undefined} onChange={value=>setRows(value)} placeholder="Введите" aria-label="Строки"/></PanelField>
  <Checkbox checked={header} onChange={event=>setHeader(event.target.checked)}>Добавить строчку заголовка</Checkbox>
  <Footer close={close} action="Добавить" disabled={!valid} onAction={()=>{if(valid&&columns!==null&&rows!==null&&actions?.insert(columns,rows,header))close();}}/>
 </div>;
}

const specialSymbols=Array.from('‐‑‒–—―‘’‚‛“”„‟¡¿§©®™†‡•‣․‥…‧‰‱′″‴‵‶‸‹›´µ¶·«»¼½¾℃№ﬀﬁﬂﬃﬄﬅﬆ←↑→↓↔↕↖↗↘↙⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁼⁽⁺⁾ⁿⁱ');
const commonEmoji='😀 😃 😄 😁 😆 😅 😂 🙂 🙃 😉 😊 😇 🥰 😍 🤩 😘 😋 😛 😜 🤔 🤗 🤭 🤫 🤯 😎 🥳 😢 😭 😡 👍 👎 👏 🙌 👋 🤝 🙏 💪 👀 ❤️ 🧡 💛 💚 💙 💜 🖤 🤍 💔 🔥 ✨ ⭐ 🎉 🎈 🎁 🏆 ✅ ❌ ⚠️ 💡 📌 📎 📅 💬 🚀 🌍 ☀️ 🌈 ☕ 🍕 🐱 🐶'.split(' ');
function SymbolPanel({close,actions}:{close:()=>void;actions?:SymbolPanelActions}){
 const grid=(values:string[],type:'Символ'|'Эмодзи')=><div className={`symbol-grid${type==='Эмодзи'?' emoji-grid':''}`}>{values.map((value,index)=><button type="button" key={`${value}-${index}`} aria-label={`${type} ${value}`} title={value} onMouseDown={event=>event.preventDefault()} onClick={()=>{if(actions?.insert(value))close();}}>{value}</button>)}</div>;
 return <div className="tool-panel symbol-panel"><h2>Специальные символы</h2><Tabs size="small" items={[{key:'symbols',label:'Спецсимволы',children:grid(specialSymbols,'Символ')},{key:'emoji',label:'Эмодзи',children:grid(commonEmoji,'Эмодзи')}]}/></div>;
}

export function PanelContent({tool,close,value,onApply,linkActions,searchActions,tableActions,imageActions,videoActions,imageMode='standard',seoImageActions,symbolActions}:{tool:ToolId;close:()=>void;value?:string;onApply?:(value:string)=>void;linkActions?:LinkPanelActions;searchActions?:SearchPanelActions;tableActions?:TablePanelActions;imageActions?:ImagePanelActions;videoActions?:VideoPanelActions;imageMode?:'standard'|'seo';seoImageActions?:SeoImageActions;symbolActions?:SymbolPanelActions}){
 if(tool==='textType'||tool==='font'||tool==='fontSize')return <CatalogFormatPanel tool={tool} close={close}/>;
 if(tool==='color'||tool==='highlight'||tool==='cellColor')return <ColorPanel tool={tool} value={null} onApply={()=>{}}/>;
 if(tool==='fillColor')return <ColorMenu onSelect={()=>{}}/>;
 if(tool==='link')return <LinkPanel close={close} actions={linkActions}/>;
 if(tool==='paragraph'||tool==='lineHeight')return <SpacingPanel tool={tool} value={value} close={close} onApply={onApply}/>;
 if(tool==='alignment'||tool==='list'||tool==='more')return <MenuPanel tool={tool} value={value} onSelect={selected=>{onApply?.(selected);if(onApply)close();}}/>;
 if(tool==='anchor')return <AnchorPanel close={close} actions={linkActions}/>;
 if(tool==='table')return <TablePanel close={close} actions={tableActions}/>;
 if(tool==='image')return imageMode==='seo'?<SeoImageChoice close={close} insert={seoImageActions?.insert}/>:<ImagePanel close={close} actions={imageActions}/>;
 if(tool==='video')return <VideoPanel close={close} actions={videoActions}/>;
 if(tool==='symbol')return <SymbolPanel close={close} actions={symbolActions}/>;
 if(tool==='search')return <SearchPanel actions={searchActions}/>;
 return null;
}

const catalogIcons:Partial<Record<ToolId,string>>={
 textType:'IconTextTypeOutlined',font:'IconFontSizeOutlined',fontSize:'IconFontSizeOutlined',
 bold:'IconBoldOutlined',italic:'IconItalicOutlined',underline:'IconUnderlineOutlined',strike:'IconStrikethroughOutlined',clear:'IconClearOutlined',
 color:'IconFontColorsOutlined',highlight:'IconHighlightOutlined',cellColor:'IconFormatPainterOutlined',fillColor:'IconBgColorsOutlined',
 alignment:'IconAlignLeftOutlined',list:'IconOrderedListOutlined',shiftRight:'IconMenuUnfoldOutlined',shiftLeft:'IconMenuFoldOutlined',paragraph:'StateDefaultSizeDefault1',lineHeight:'StateDefaultSizeDefault',
 link:'IconLinkOutlined',anchor:'IconAnchor',table:'Icon',image:'IconPictureOutlined',seoImage:'IconPictureOutlined',video:'IconVideoCameraOutlined',code:'IconCodeOutlined',symbol:'IconSpecialCharacterOutlined',
 search:'IconReplaceSearchOutlined',copy:'IconCopyOutlined',paste:'IconSnippetsOutlined',cut:'IconScissorOutlined',undo:'IconActionBackOutlined',redo:'IconActionForwardOutlined',more:'IconMoreOutlined',
};
const previewTools=new Set<ToolId>(['textType','font','fontSize','color','highlight','cellColor','fillColor','alignment','list','paragraph','lineHeight','link','anchor','table','image','video','symbol','search','more']);
function LibraryToolName({tool}:{tool:ToolId}){
 const label=toolLabels[tool],nameRef=useRef<HTMLSpanElement>(null);
 const [truncated,setTruncated]=useState(false);
 useEffect(()=>{
  const name=nameRef.current;if(!name)return;
  const measure=()=>setTruncated(name.scrollWidth>name.clientWidth+1);
  const observer=new ResizeObserver(measure);
  observer.observe(name);measure();
  return()=>observer.disconnect();
 },[label]);
 const icon=catalogIcons[tool];
 return <span className="panel-tool-library-name">{icon&&<img className={tool==='redo'?'panel-catalog-forward-icon':undefined} src={icons['img'+icon]} alt=""/>}<Tooltip title={truncated?label:null}><span ref={nameRef} className="panel-tool-library-label" tabIndex={truncated?0:undefined}>{label}</span></Tooltip></span>;
}
export function PanelCatalog({iconSize=20,order=defaultToolOrder,hidden=[],hiddenSeparators=[],categoryNames={},customMode=false,onToggle,onToggleSeparator,onMove,onMoveCategory,onAddSeparator,onDeleteSeparator,onAddCategory,onRenameCategory,onDeleteCategory,onAssignCategory,onClear,onReset}:{iconSize?:16|20;order?:ToolOrderItem[];hidden?:AssignableToolId[];hiddenSeparators?:BuiltinSeparatorId[];categoryNames?:Record<string,string>;customMode?:boolean;onToggle?:(tool:AssignableToolId,enabled:boolean)=>void;onToggleSeparator?:(id:BuiltinSeparatorId,enabled:boolean)=>void;onMove?:(source:ToolOrderItem,target:ToolOrderItem,placement:'before'|'after')=>void;onMoveCategory?:(id:ToolCategoryId,direction:'up'|'down')=>void;onAddSeparator?:()=>void;onDeleteSeparator?:(id:ToolSeparatorId)=>void;onAddCategory?:()=>void;onRenameCategory?:(id:ToolCategoryId,name:string)=>void;onDeleteCategory?:(id:ToolCategoryId)=>void;onAssignCategory?:(tool:AssignableToolId,category?:ToolCategoryId)=>void;onClear?:()=>void;onReset?:()=>void}){
 const dragSource=useRef<{tool:ToolOrderItem;pointerId:number}|null>(null);
 const hoveredDrop=useRef<{tool:ToolOrderItem;placement:'before'|'after'}|null>(null);
 const [dropTarget,setDropTarget]=useState<{tool:ToolOrderItem;placement:'before'|'after'}|null>(null);
 const [editingCategory,setEditingCategory]=useState<ToolCategoryId|null>(null);
 const [draftName,setDraftName]=useState('');
 const [libraryOpen,setLibraryOpen]=useState(false);
 const catalogTools:(ToolId|ToolOrderItem)[]=customMode?order:['textType','font','fontSize',...order];
 const categories=order.filter(isToolCategory);
 const categoryOf=new Map<AssignableToolId,ToolCategoryId>();
 let activeCategory:ToolCategoryId='category-format';
 for(const item of order){if(isToolCategory(item))activeCategory=item;else if(assignableTools.includes(item as AssignableToolId))categoryOf.set(item as AssignableToolId,activeCategory);}
 const categoryTitle=(id:ToolCategoryId)=>id.startsWith('category-custom-')?categoryNames[id]??'Новая категория':builtinCategories[id as keyof typeof builtinCategories];
 const clearDrag=()=>{dragSource.current=null;hoveredDrop.current=null;setDropTarget(null);};
 const updateDrop=(x:number,y:number)=>{
  const row=document.elementFromPoint(x,y)?.closest<HTMLElement>('[data-catalog-tool]');
  const target=row?.dataset.catalogTool as ToolOrderItem|undefined;
  if(!row||!target||!order.includes(target)||target===dragSource.current?.tool){hoveredDrop.current=null;setDropTarget(null);return;}
  const rect=row.getBoundingClientRect();
  const next={tool:target,placement:(isToolCategory(target)||y>=rect.top+rect.height/2?'after':'before') as 'before'|'after'};
  hoveredDrop.current=next;setDropTarget(next);
 };
 const commitCategory=()=>{if(editingCategory)onRenameCategory?.(editingCategory,draftName);setEditingCategory(null);};
 const row=(tool:ToolId|ToolOrderItem)=>{
  const fixed=tool==='more'||!customMode&&(tool==='textType'||tool==='font'||tool==='fontSize');
  const builtinSeparator=tool.startsWith('builtin-');
  const customSeparator=tool.startsWith('separator-');
  const separator=builtinSeparator||customSeparator;
  const movable=!fixed&&!builtinSeparator&&!isToolCategory(tool as ToolOrderItem);
  const enabled=builtinSeparator?!hiddenSeparators.includes(tool as BuiltinSeparatorId):fixed||customSeparator||!hidden.includes(tool as AssignableToolId);
  const label=separator?'Разделитель':toolLabels[tool as ToolId];
  const icon=separator?null:catalogIcons[tool as ToolId];
  const placement=dropTarget?.tool===tool?dropTarget.placement:null;
  const index=order.indexOf(tool as ToolOrderItem);
  const category=builtinSeparator?builtinSeparatorCategory[tool as BuiltinSeparatorId]:'';
  const name=<span className={`panel-catalog-name${separator?' panel-catalog-separator':''}`}>
   {separator?<img src="/icons/tool-separator.svg" style={{width:iconSize,height:iconSize}} alt=""/>:icon&&<img className={tool==='redo'?'panel-catalog-forward-icon':undefined} src={icons['img'+icon]} style={{width:iconSize,height:iconSize}} alt=""/>}<span>{label}</span>
  </span>;
  return <div key={tool} role="listitem" data-catalog-tool={movable?tool:undefined} className={`panel-catalog-row${fixed||builtinSeparator?' is-fixed':''}${enabled?'':' is-off'}${placement?` drop-${placement}`:''}`}>
   {movable&&<button type="button" className="panel-catalog-drag" aria-label={`Переместить ${label}`} title="Перетащите для изменения порядка; стрелки вверх и вниз тоже работают" onPointerDown={event=>{if(event.button!==0)return;dragSource.current={tool:tool as ToolOrderItem,pointerId:event.pointerId};event.currentTarget.setPointerCapture(event.pointerId);}} onPointerMove={event=>{if(dragSource.current?.pointerId===event.pointerId)updateDrop(event.clientX,event.clientY);}} onPointerUp={event=>{if(dragSource.current?.pointerId!==event.pointerId)return;updateDrop(event.clientX,event.clientY);const target=hoveredDrop.current;if(target)onMove?.(tool as ToolOrderItem,target.tool,target.placement);clearDrag();}} onPointerCancel={clearDrag} onKeyDown={event=>{if(event.key!=='ArrowUp'&&event.key!=='ArrowDown')return;event.preventDefault();const direction=event.key==='ArrowUp'?-1:1;let adjacent=index+direction;while(order[adjacent]?.startsWith('builtin-'))adjacent+=direction;const target=order[adjacent];if(target)onMove?.(tool as ToolOrderItem,target,direction<0?'before':'after');}}><img src="/icons/tool-drag.svg" alt=""/></button>}
   {builtinSeparator?<Tooltip title={`Этот разделитель относится к категории «${category}». Его можно только скрыть.`}><span className="panel-catalog-info" tabIndex={0}>{name}</span></Tooltip>:customSeparator?name:previewTools.has(tool as ToolId)?<PanelTrigger tool={tool as ToolId} disabled={!enabled}><button type="button" className="panel-catalog-preview" disabled={!enabled}>{name}</button></PanelTrigger>:name}
   {customSeparator?<button type="button" className="panel-catalog-delete" aria-label="Удалить разделитель" title="Удалить разделитель" onClick={()=>onDeleteSeparator?.(tool as ToolSeparatorId)}><img src="/icons/seo-delete.svg" alt=""/></button>:builtinSeparator?<Switch size="small" checked={enabled} onChange={checked=>onToggleSeparator?.(tool as BuiltinSeparatorId,checked)} aria-label={`Показывать разделитель категории ${category}`}/>:!fixed&&<Switch size="small" checked={enabled} onChange={checked=>onToggle?.(tool as AssignableToolId,checked)} aria-label={`Показывать ${label}`}/>}
  </div>;
 };
 return <section className="panel-catalog"><div className="panel-catalog-heading"><h2>Окна инструментов</h2></div><div className="panel-catalog-grid" role="list" aria-label="Порядок инструментов">
  {!customMode&&<div className="panel-catalog-category"><span>Текстовое оформление</span></div>}
  {customMode&&order.length===0&&<p className="panel-catalog-empty">Панель пуста. Добавьте категорию и выберите для неё инструменты ниже.</p>}
  {catalogTools.map(tool=>{
   if(!isToolCategory(tool as ToolOrderItem))return row(tool);
   const id=tool as ToolCategoryId;
   const custom=id.startsWith('category-custom-');
   const title=categoryTitle(id);
   return <div key={id} className={`panel-catalog-category${dropTarget?.tool===id?' drop-after':''}`} data-catalog-tool={id}>
    {editingCategory===id?<Input autoFocus maxLength={60} value={draftName} aria-label="Название категории" onChange={event=>setDraftName(event.target.value)} onPressEnter={commitCategory} onBlur={commitCategory} onKeyDown={event=>{if(event.key==='Escape')setEditingCategory(null);}}/>:<span>{title}</span>}
    {custom&&editingCategory!==id&&<span className="panel-catalog-category-actions"><button type="button" className="panel-catalog-category-move" aria-label={`Поднять категорию ${title}`} title="Поднять категорию" disabled={categories.indexOf(id)===0} onClick={()=>onMoveCategory?.(id,'up')}><img src="/icons/category-up.svg" alt=""/></button><button type="button" className="panel-catalog-category-move" aria-label={`Опустить категорию ${title}`} title="Опустить категорию" disabled={categories.indexOf(id)===categories.length-1} onClick={()=>onMoveCategory?.(id,'down')}><img src="/icons/category-down.svg" alt=""/></button><button type="button" className="panel-catalog-rename" aria-label={`Переименовать категорию ${title}`} onClick={()=>{setDraftName(title);setEditingCategory(id);}}>Переименовать</button><button type="button" className="panel-catalog-rename" aria-label={`Удалить категорию ${title}`} onClick={()=>onDeleteCategory?.(id)}>Удалить</button></span>}
   </div>;
  })}
  {!customMode&&<><div className="panel-catalog-category"><span>Общие инструменты</span></div>{row('more')}</>}
 </div>
 <div className="panel-catalog-actions">
  <Button type="primary" onClick={onAddSeparator} disabled={customMode&&categories.length===0}>+ Добавить разделитель</Button>
  <Button type="primary" onClick={onAddCategory}>+ Добавить категорию</Button>
  <Button onClick={()=>setLibraryOpen(open=>!open)} aria-expanded={libraryOpen}>{libraryOpen?'Скрыть библиотеку':'Собрать свою панель'}</Button>
  <Button onClick={onReset} disabled={!customMode}>Вернуть настройки по умолчанию</Button>
 </div>
 {libraryOpen&&<div className="panel-tool-library"><h3>Все инструменты</h3><p>{categories.length?'Выберите категорию. Порядок инструментов меняется в списке выше.':'Добавьте категорию, чтобы распределить инструменты.'}</p><div className="panel-tool-library-list">
  {assignableTools.map(tool=><div key={tool} className="panel-tool-library-row"><LibraryToolName tool={tool}/><Select aria-label={`Категория инструмента ${toolLabels[tool]}`} value={categoryOf.get(tool)} disabled={categories.length===0} placeholder={!customMode&&(tool==='textType'||tool==='font'||tool==='fontSize')?'Закреплён':categories.length?'Выберите категорию':'Добавьте категорию'} allowClear={customMode} options={categories.map(id=>({value:id,label:categoryTitle(id)}))} onChange={(id:ToolCategoryId|undefined)=>onAssignCategory?.(tool,id)}/></div>)}
  <div className="panel-tool-library-row"><LibraryToolName tool="more"/><span>В обычном режиме</span></div>
 </div><Button type="primary" ghost block className="panel-tool-library-clear" onClick={()=>Modal.confirm({title:'Сбросить текущие настройки?',content:'Все текущие категории и расположение инструментов будут удалены. Их можно вернуть кнопкой «Вернуть настройки по умолчанию».',okText:'Сбросить',cancelText:'Отменить',onOk:onClear})}>Сбросить все текущие настройки</Button></div>}
 </section>;
}
