import React, {useState} from 'react';
import {Tooltip} from 'antd';
import {EditorContent} from '@tiptap/react';
import {FormattingControls, defaultFormat, type TextFormat, type FormatTool} from './TextFormatting';
import {useTextDocument, type InlineFormat, type InlineTool, type ParagraphFormat, type ParagraphTool} from './useTextDocument';
import {icons} from './all-assets';
import {CompactToolsTrigger, PanelTrigger, panelForIcon, type LinkPanelActions} from './ToolPanels';
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
const emptyParagraph:ParagraphFormat={alignment:'left',canShiftRight:false,canShiftLeft:false};
const paragraphs:[ParagraphTool,string,string,string?][]=[['alignment','IconAlignLeftOutlined','Выравнивание','arrow'],['list','IconOrderedListOutlined','Список','arrow'],['shiftRight','IconMenuUnfoldOutlined','Сместить вправо'],['shiftLeft','IconMenuFoldOutlined','Сместить влево'],['lineSpacing','StateDefaultSizeDefault1','Межстрочное расстояние'],['paragraphSpacing','StateDefaultSizeDefault','Расстояние между абзацами']];
const inserts=[['IconLinkOutlined','Ссылка'],['IconAnchor','Якорь'],['Icon','Таблица'],['IconPictureOutlined','Изображение'],['IconVideoCameraOutlined','Видео'],['IconCodeOutlined','Код'],['IconSpecialCharacterOutlined','Специальный символ']];
const actions=[['IconReplaceSearchOutlined','Найти и заменить'],['IconCopyOutlined','Копировать'],['IconSnippetsOutlined','Вставить'],['IconScissorOutlined','Вырезать'],['IconActionBackOutlined','Отменить'],['IconActionForwardOutlined','Повторить']];

export function EditorToolbar({state='Default',layout='One',density='High',tools='Full',iconSize=20,format=defaultFormat,inline=emptyInline,paragraph=emptyParagraph,onFormatChange=()=>{},onInlineAction=()=>{},onParagraphAction=()=>{},linkActions}:ToolbarProps & {format?:TextFormat;inline?:InlineFormat;paragraph?:ParagraphFormat;onFormatChange?:(tool:FormatTool,value:string)=>void;onInlineAction?:(tool:InlineTool)=>void;onParagraphAction?:(tool:ParagraphTool,value?:string)=>void;linkActions?:LinkPanelActions}){
  const disabled=state==='Disabled';
  const tool=(name:string,label:string,decoration?:string)=>{const button=<button type="button" className="ed-tool" aria-label={label} disabled={disabled} onMouseDown={e=>e.preventDefault()}><Icon name={name}/>{decoration==='arrow'&&<Icon name="IconCaretDownOutlined" small/>}{decoration==='color'&&<span className="ed-swatch"/>}</button>;return panelForIcon[name]?<Tooltip key={name} title={label}><PanelTrigger tool={panelForIcon[name]} disabled={disabled} linkActions={linkActions}>{button}</PanelTrigger></Tooltip>:<Tooltip key={name} title={label}>{button}</Tooltip>;};
  const group=(items:string[][])=>items.map(([name,label,decoration])=>tool(name,label,decoration));
  const basicTool=([id,name,label,hoverIcon,activeHoverIcon]:typeof basic[number])=>{
    const active=id!=='clear'&&inline[id];
    return <Tooltip key={id} title={label}><button type="button" className="ed-tool ed-basic-tool" aria-label={label} aria-pressed={id==='clear'?undefined:active} disabled={disabled} onMouseDown={e=>e.preventDefault()} onClick={()=>onInlineAction(id)}><span className="ed-basic-icon"><img className="ed-icon" src={active?`/icons/${hoverIcon}`:icons['img'+name]} alt=""/><img className="ed-basic-hover" src={`/icons/${active&&activeHoverIcon?activeHoverIcon:hoverIcon}`} alt=""/></span></button></Tooltip>;
  };
  const paragraphTool=([id,name,label,decoration]:typeof paragraphs[number])=>{
    const button=<button type="button" className="ed-tool ed-paragraph-tool" aria-label={label} disabled={disabled} onMouseDown={e=>e.preventDefault()} onClick={id==='shiftRight'||id==='shiftLeft'?()=>onParagraphAction(id):undefined}><Icon name={name}/>{decoration==='arrow'&&<Icon name="IconCaretDownOutlined" small/>}</button>;
    const panel=id==='alignment'?'alignment':id==='list'?'list':id==='lineSpacing'?'paragraph':id==='paragraphSpacing'?'lineHeight':undefined;
    const value=id==='alignment'?paragraph.alignment:id==='list'?paragraph.list:id==='lineSpacing'?paragraph.lineSpacing:paragraph.paragraphSpacing;
    const trigger=<Tooltip title={label}>{button}</Tooltip>;
    return panel?<PanelTrigger key={id} tool={panel} disabled={disabled} value={value} onApply={selected=>onParagraphAction(id,selected)}>{trigger}</PanelTrigger>:<React.Fragment key={id}>{trigger}</React.Fragment>;
  };
  const moreButton=<button type="button" className="ed-tool" aria-label="Дополнительные инструменты" disabled={disabled} onMouseDown={event=>event.preventDefault()}><Icon name="IconMoreOutlined"/></button>;
  return <div role="toolbar" aria-label="Форматирование текста" className={`ed-toolbar ed-${density} ed-tools-${tools} ed-state-${state} ed-layout-${layout} ed-icon-${iconSize}`}>
    <FormattingControls key={tools} compact={tools==='Short'} disabled={disabled} format={format} onChange={onFormatChange}/>
    <Separator/>{basic.map(basicTool)}<Separator/>
    {tools==='Full'?<>{tool('IconFormatPainterOutlined','Цвет фона ячейки','color')}{tool('IconHighlightOutlined','Цвет подчеркивания','color')}{layout!=='Three'&&tool('IconFontColorsOutlined','Цвет текста','color')}</>:tool('IconBgColorsOutlined','Цвет','arrow')}
    {layout==='Three'?<Tooltip title="Дополнительные инструменты"><CompactToolsTrigger disabled={disabled} inline={inline} paragraph={paragraph} onInlineAction={onInlineAction} onParagraphAction={onParagraphAction}>{moreButton}</CompactToolsTrigger></Tooltip>:<><Separator/>{paragraphs.map(paragraphTool)}<Separator/>{group(inserts)}<Separator/>{group(actions)}</>}
  </div>;
}

export function TextEditor({state,layout='One',density='High',tools='Full',iconSize=20,value,onChange,placeholder='Введите',toolbarOnly=false}:EditorProps){
  const [focused,setFocused]=useState(false);
  const [hover,setHover]=useState(false);
  const {editor,format,inline,paragraph,link,apply,applyInline,applyParagraph,applyLink,createAnchor,deleteAnchor,renameAnchor,updateLinks}=useTextDocument({value,onChange,disabled:state==='Disabled',placeholder,onFocus:()=>setFocused(true),onBlur:()=>setFocused(false)});
  const actualState=state??(focused?(value?'Typing':'Focused'):(hover?'Hover':value?'Filled':'Default'));
  const linkActions:LinkPanelActions={selectionText:link.text,hasSelection:link.hasSelection,applyLink:href=>{applyLink(href);},createAnchor:(id,label)=>{createAnchor(id,label);},deleteAnchor,renameAnchor,updateLinks};
  return <div className={`text-editor ${toolbarOnly?'toolbar-only':''} editor-state-${actualState}`} onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}>
    <EditorToolbar key={`${layout}-${density}-${tools}-${iconSize}`} state={actualState} layout={layout} density={density} tools={tools} iconSize={iconSize} format={format} inline={inline} paragraph={paragraph} onFormatChange={apply} onInlineAction={applyInline} onParagraphAction={applyParagraph} linkActions={linkActions}/>
    {!toolbarOnly&&<EditorContent editor={editor} className="rich-input" onMouseDownCapture={()=>document.dispatchEvent(new Event('editor-dismiss-popovers'))}/>}
  </div>;
}

