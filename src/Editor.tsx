import React, {useState} from 'react';
import {Tooltip} from 'antd';
import {EditorContent} from '@tiptap/react';
import {FormattingControls, defaultFormat, type TextFormat, type FormatTool} from './TextFormatting';
import {useTextDocument, type InlineFormat, type InlineTool} from './useTextDocument';
import {icons} from './all-assets';
import {PanelTrigger, panelForIcon} from './ToolPanels';
import './editor.css';

export type EditorState = 'Default'|'Hover'|'Focused'|'Typing'|'Filled'|'Disabled'|'Error';
export type ToolbarProps = {state?: EditorState; layout?: 'One'|'Two'|'Three'; density?: 'High'|'Short'; tools?: 'Full'|'Short';iconSize?:16|20};
export type EditorProps = ToolbarProps & {value: string; onChange: (value:string)=>void; placeholder?:string; toolbarOnly?:boolean};
const Icon = ({name,small=false}:{name:string;small?:boolean})=><img className={small?'ed-caret':'ed-icon'} src={icons['img'+name]} alt="" draggable={false}/>;
const Separator = ()=> <span className="ed-divider" aria-hidden="true"><img src={icons.imgDividerVertical} alt=""/></span>;
const basic:[InlineTool,string,string,string,string?][]=[
  ['bold','IconBoldOutlined','Жирный текст','e5696.svg','e3054.svg'],
  ['italic','IconItalicOutlined','Курсивный текст','6e58c.svg','75971.svg'],
  ['underline','IconUnderlineOutlined','Подчеркнутый текст','a58d2.svg','05995.svg'],
  ['strike','IconStrikethroughOutlined','Зачеркнутый текст','61108.svg','a7d9e.svg'],
  ['clear','IconClearOutlined','Очистка форматирования','746dc.svg'],
];
const emptyInline:InlineFormat={bold:false,italic:false,underline:false,strike:false};
const paragraphs=[['IconAlignLeftOutlined','Выравнивание','arrow'],['IconOrderedListOutlined','Список','arrow'],['IconMenuUnfoldOutlined','Увеличить отступ'],['IconMenuFoldOutlined','Уменьшить отступ'],['StateDefaultSizeDefault1','Межстрочное расстояние'],['StateDefaultSizeDefault','Расстояние между абзацами']];
const inserts=[['IconLinkOutlined','Ссылка'],['IconAnchor','Якорь'],['Icon','Таблица'],['IconPictureOutlined','Изображение'],['IconVideoCameraOutlined','Видео'],['IconCodeOutlined','Код'],['IconSpecialCharacterOutlined','Специальный символ']];
const actions=[['IconReplaceSearchOutlined','Найти и заменить'],['IconCopyOutlined','Копировать'],['IconSnippetsOutlined','Вставить'],['IconScissorOutlined','Вырезать'],['IconActionBackOutlined','Отменить'],['IconActionForwardOutlined','Повторить']];

export function EditorToolbar({state='Default',layout='One',density='High',tools='Full',iconSize=20,format=defaultFormat,inline=emptyInline,onFormatChange=()=>{},onInlineAction=()=>{}}:ToolbarProps & {format?:TextFormat;inline?:InlineFormat;onFormatChange?:(tool:FormatTool,value:string)=>void;onInlineAction?:(tool:InlineTool)=>void}){
  const disabled=state==='Disabled';
  const tool=(name:string,label:string,decoration?:string)=>{const button=<button type="button" className="ed-tool" aria-label={label} disabled={disabled}><Icon name={name}/>{decoration==='arrow'&&<Icon name="IconCaretDownOutlined" small/>}{decoration==='color'&&<span className="ed-swatch"/>}</button>;return panelForIcon[name]?<PanelTrigger key={name} tool={panelForIcon[name]} disabled={disabled}>{button}</PanelTrigger>:<Tooltip key={name} title={label}>{button}</Tooltip>;};
  const group=(items:string[][])=>items.map(([name,label,decoration])=>tool(name,label,decoration));
  const basicTool=([id,name,label,hoverIcon,activeHoverIcon]:typeof basic[number])=>{
    const active=id!=='clear'&&inline[id];
    return <Tooltip key={id} title={label}><button type="button" className="ed-tool ed-basic-tool" aria-label={label} aria-pressed={id==='clear'?undefined:active} disabled={disabled} onMouseDown={e=>e.preventDefault()} onClick={()=>onInlineAction(id)}><span className="ed-basic-icon"><img className="ed-icon" src={active?`/icons/${hoverIcon}`:icons['img'+name]} alt=""/><img className="ed-basic-hover" src={`/icons/${active&&activeHoverIcon?activeHoverIcon:hoverIcon}`} alt=""/></span></button></Tooltip>;
  };
  return <div role="toolbar" aria-label="Форматирование текста" className={`ed-toolbar ed-${density} ed-tools-${tools} ed-state-${state} ed-layout-${layout} ed-icon-${iconSize}`}>
    <FormattingControls key={tools} compact={tools==='Short'} disabled={disabled} format={format} onChange={onFormatChange}/>
    <Separator/>{basic.map(basicTool)}<Separator/>
    {tools==='Full'?<>{tool('IconFormatPainterOutlined','Цвет фона ячейки','color')}{tool('IconHighlightOutlined','Цвет подчеркивания','color')}{layout!=='Three'&&tool('IconFontColorsOutlined','Цвет текста','color')}</>:tool('IconBgColorsOutlined','Цвет','arrow')}
    {layout==='Three'?tool('IconMoreOutlined','Дополнительные инструменты'):<><Separator/>{group(paragraphs)}<Separator/>{group(inserts)}<Separator/>{group(actions)}</>}
  </div>;
}

export function TextEditor({state,layout='One',density='High',tools='Full',iconSize=20,value,onChange,placeholder='Введите',toolbarOnly=false}:EditorProps){
  const [focused,setFocused]=useState(false);
  const [hover,setHover]=useState(false);
  const {editor,format,inline,apply,applyInline}=useTextDocument({value,onChange,disabled:state==='Disabled',placeholder,onFocus:()=>setFocused(true),onBlur:()=>setFocused(false)});
  const actualState=state??(focused?(value?'Typing':'Focused'):(hover?'Hover':value?'Filled':'Default'));
  return <div className={`text-editor ${toolbarOnly?'toolbar-only':''} editor-state-${actualState}`} onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}>
    <EditorToolbar key={`${layout}-${density}-${tools}-${iconSize}`} state={actualState} layout={layout} density={density} tools={tools} iconSize={iconSize} format={format} inline={inline} onFormatChange={apply} onInlineAction={applyInline}/>
    {!toolbarOnly&&<EditorContent editor={editor} className="rich-input"/>}
  </div>;
}

