import React, {useEffect,useState} from 'react';
import {Tooltip} from 'antd';
import {EditorContent, type Editor as TiptapEditor} from '@tiptap/react';
import {FormattingControls, defaultFormat, type TextFormat, type FormatTool} from './TextFormatting';
import {useTextDocument, type EditingAction, type InlineFormat, type InlineTool, type ListStyle, type ParagraphFormat, type ParagraphTool} from './useTextDocument';
import {icons} from './all-assets';
import {CompactToolsTrigger, PanelTrigger, panelForIcon, defaultToolOrder, isToolSeparator, isToolCategory, type AssignableToolId, type ConfigurableToolId, type BuiltinSeparatorId, type ToolOrderItem, type LinkPanelActions, type SearchPanelActions, type TablePanelActions, type ImagePanelActions, type VideoPanelActions, type SeoImageActions, type ColorPanelActions, type SymbolPanelActions} from './ToolPanels';
import './editor.css';

export type EditorState = 'Default'|'Hover'|'Focused'|'Typing'|'Filled'|'Disabled'|'Error';
export type ToolbarProps = {state?: EditorState; layout?: 'One'|'Two'|'Three'; density?: 'High'|'Short'; tools?: 'Full'|'Short';iconSize?:16|20;imageMode?:'standard'|'seo';toolOrder?:ToolOrderItem[];hiddenTools?:AssignableToolId[];hiddenSeparators?:BuiltinSeparatorId[];customMode?:boolean};
export type EditorProps = ToolbarProps & {value: string; onChange: (value:string)=>void; placeholder?:string; toolbarOnly?:boolean; editorRef?:React.MutableRefObject<TiptapEditor|null>};
const Icon = ({name,small=false}:{name:string;small?:boolean})=><img className={small?'ed-caret':'ed-icon'} src={icons['img'+name]} alt="" draggable={false}/>;
const InteractiveIcon=({name}:{name:string})=><span className="ed-tool-icon"><Icon name={name}/><img className="ed-icon ed-hover-icon" src={`/icons/toolbar-hover-${name}.svg`} alt="" draggable={false}/></span>;
const InteractiveCaret=()=> <span className="ed-caret-icon"><Icon name="IconCaretDownOutlined" small/><img className="ed-caret ed-hover-icon" src="/icons/toolbar-hover-IconCaretDownOutlined.svg" alt="" draggable={false}/></span>;
const Separator = ()=> <span className="ed-divider" aria-hidden="true"><img src={icons.imgDividerVertical} alt=""/></span>;
const basic:[InlineTool,string,string,string,string?][]=[
  ['bold','IconBoldOutlined','Жирный текст','e5696.svg','e3054.svg'],
  ['italic','IconItalicOutlined','Курсивный текст','6e58c.svg','75971.svg'],
  ['underline','IconUnderlineOutlined','Подчеркнутый текст','a58d2.svg','05995.svg'],
  ['strike','IconStrikethroughOutlined','Зачеркнутый текст','61108.svg','a7d9e.svg'],
  ['clear','IconClearOutlined','Очистка форматирования','746dc.svg'],
];
const emptyInline:InlineFormat={bold:false,italic:false,underline:false,strike:false,code:false};
const emptyParagraph:ParagraphFormat={alignment:'left',canShiftRight:false,canShiftLeft:false};
const paragraphs:[ParagraphTool,string,string,string?][]=[['alignment','IconAlignLeftOutlined','Выравнивание','arrow'],['list','IconOrderedListOutlined','Список','arrow'],['shiftRight','IconMenuUnfoldOutlined','Сместить вправо'],['shiftLeft','IconMenuFoldOutlined','Сместить влево'],['lineSpacing','StateDefaultSizeDefault1','Межстрочное расстояние'],['paragraphSpacing','StateDefaultSizeDefault','Расстояние между абзацами']];
const actions:[string,string,EditingAction?][]=[['IconReplaceSearchOutlined','Найти и заменить'],['IconCopyOutlined','Копировать','copy'],['IconSnippetsOutlined','Вставить','paste'],['IconScissorOutlined','Вырезать','cut'],['IconActionBackOutlined','Действие назад','undo'],['IconActionForwardOutlined','Действие вперёд','redo']];
export function EditorToolbar({state='Default',layout='One',density='High',tools='Full',iconSize=20,imageMode='standard',toolOrder=defaultToolOrder,hiddenTools=[],hiddenSeparators=[],customMode=false,format=defaultFormat,inline=emptyInline,paragraph=emptyParagraph,onFormatChange=()=>{},onInlineAction=()=>{},onParagraphAction=()=>{},onEditingAction=()=>{},linkActions,searchActions,tableActions,imageActions,videoActions,seoImageActions,colorActions,symbolActions}:ToolbarProps & {format?:TextFormat;inline?:InlineFormat;paragraph?:ParagraphFormat;onFormatChange?:(tool:FormatTool,value:string)=>void;onInlineAction?:(tool:InlineTool)=>void;onParagraphAction?:(tool:ParagraphTool,value?:string)=>void;onEditingAction?:(action:EditingAction)=>void;linkActions?:LinkPanelActions;searchActions?:SearchPanelActions;tableActions?:TablePanelActions;imageActions?:ImagePanelActions;videoActions?:VideoPanelActions;seoImageActions?:SeoImageActions;colorActions?:ColorPanelActions;symbolActions?:SymbolPanelActions}){
  const disabled=state==='Disabled';
  const hiddenConfigurable=hiddenTools.filter((id):id is ConfigurableToolId=>id!=='textType'&&id!=='font'&&id!=='fontSize');
  const availableListTools=toolOrder.filter((id):id is 'orderedList'|'bulletList'=>(id==='orderedList'||id==='bulletList')&&!hiddenTools.includes(id));
  const listOptions:ListStyle[]=availableListTools.map(id=>id==='orderedList'?'ordered':'bullet');
  const tool=(name:string,label:string,decoration?:string,onClick?:()=>void)=>{const id=panelForIcon[name];const isCode=name==='IconCodeOutlined';const isForward=name==='IconActionForwardOutlined';const button=<button type="button" className={`ed-tool ed-hoverable-tool${isCode?' ed-code-tool':''}${isForward?' ed-action-forward':''}`} aria-label={label} aria-pressed={isCode?inline.code:undefined} disabled={disabled} onMouseDown={e=>e.preventDefault()} onClick={isCode?()=>onInlineAction('code'):onClick}><InteractiveIcon name={name}/>{decoration==='arrow'&&<InteractiveCaret/>}{decoration==='color'&&<span className="ed-swatch" style={{backgroundColor:id==='color'||id==='highlight'||id==='cellColor'?colorActions?.state[id]??'#1677ff':'#1677ff'}}/>}</button>;return id?<PanelTrigger key={name} tool={id} disabled={disabled} linkActions={linkActions} searchActions={searchActions} tableActions={tableActions} imageActions={imageActions} videoActions={videoActions} imageMode={imageMode} seoImageActions={seoImageActions} colorActions={colorActions} symbolActions={symbolActions} hiddenTools={hiddenConfigurable}><Tooltip title={label}>{button}</Tooltip></PanelTrigger>:<Tooltip key={name} title={label}>{button}</Tooltip>;};
  const basicTool=([id,name,label,hoverIcon,activeHoverIcon]:typeof basic[number])=>{
    const active=id!=='clear'&&inline[id];
    return <Tooltip key={id} title={label}><button type="button" className="ed-tool ed-basic-tool" aria-label={label} aria-pressed={id==='clear'?undefined:active} disabled={disabled} onMouseDown={e=>e.preventDefault()} onClick={()=>onInlineAction(id)}><span className="ed-basic-icon"><img className="ed-icon" src={active?`/icons/${hoverIcon}`:icons['img'+name]} alt=""/><img className="ed-basic-hover" src={`/icons/${active&&activeHoverIcon?activeHoverIcon:hoverIcon}`} alt=""/></span></button></Tooltip>;
  };
  const paragraphTool=([id,name,label,decoration]:typeof paragraphs[number],options?:ListStyle[])=>{
    const unavailable=id==='shiftRight'&&!paragraph.canShiftRight||id==='shiftLeft'&&!paragraph.canShiftLeft;
    const button=<button type="button" className="ed-tool ed-paragraph-tool ed-hoverable-tool" aria-label={label} disabled={disabled||unavailable} onMouseDown={e=>e.preventDefault()} onClick={id==='shiftRight'||id==='shiftLeft'?()=>onParagraphAction(id):undefined}><InteractiveIcon name={name}/>{decoration==='arrow'&&<InteractiveCaret/>}</button>;
    const panel=id==='alignment'?'alignment':id==='list'?'list':id==='lineSpacing'?'paragraph':id==='paragraphSpacing'?'lineHeight':undefined;
    const value=id==='alignment'?paragraph.alignment:id==='list'?paragraph.list:id==='lineSpacing'?paragraph.lineSpacing:paragraph.paragraphSpacing;
    const trigger=<Tooltip title={label}>{button}</Tooltip>;
    return panel?<PanelTrigger key={id} tool={panel} disabled={disabled} value={value} listOptions={options} onApply={selected=>onParagraphAction(id,selected)}>{trigger}</PanelTrigger>:<React.Fragment key={id}>{trigger}</React.Fragment>;
  };
  const listTool=(id:'orderedList'|'bulletList')=>{
    const value:ListStyle=id==='orderedList'?'ordered':'bullet';
    const label=id==='orderedList'?'Нумерованный список':'Маркированный список';
    const name=id==='orderedList'?'IconOrderedListOutlined':'IconBarsOutlined';
    return <Tooltip key={id} title={label}><button type="button" className="ed-tool ed-hoverable-tool ed-list-tool" aria-label={label} aria-pressed={paragraph.list===value} disabled={disabled} onMouseDown={event=>event.preventDefault()} onClick={()=>onParagraphAction('list',value)}><InteractiveIcon name={name}/></button></Tooltip>;
  };
  const moreButton=<button type="button" className="ed-tool ed-hoverable-tool" aria-label="Дополнительные инструменты" disabled={disabled} onMouseDown={event=>event.preventDefault()}><InteractiveIcon name="IconMoreOutlined"/></button>;
  const configuredTool=(id:ToolOrderItem)=>{
    if(isToolCategory(id))return null;
    if(isToolSeparator(id))return id.startsWith('builtin-')&&(hiddenSeparators.includes(id as BuiltinSeparatorId)||layout==='Three'&&['builtin-paragraph','builtin-insert','builtin-edit'].includes(id))?null:<Separator key={id}/>;
    if(hiddenTools.includes(id))return null;
    if(id==='textType'||id==='font'||id==='fontSize')return <FormattingControls key={id} compact={tools==='Short'} disabled={disabled} format={format} onChange={onFormatChange} only={[id]}/>;
    const basicItem=basic.find(([key])=>key===id);
    if(basicItem)return basicTool(basicItem);
    if(id==='fillColor')return tools==='Short'?tool('IconBgColorsOutlined','Цвет','arrow'):null;
    if(id==='cellColor'||id==='highlight'||id==='color'){
      if(tools!=='Full'||(layout==='Three'&&id==='color'))return null;
      const name=id==='cellColor'?'IconFormatPainterOutlined':id==='highlight'?'IconHighlightOutlined':'IconFontColorsOutlined';
      const label=id==='cellColor'?'Цвет фона ячейки':id==='highlight'?'Цвет подчеркивания':'Цвет текста';
      return tool(name,label,'color');
    }
    if(layout==='Three'&&!customMode)return null;
    if(id==='orderedList'||id==='bulletList'){
      if(tools==='Full')return listTool(id);
      if(id!==availableListTools[0])return null;
      return paragraphTool(['list',id==='orderedList'?'IconOrderedListOutlined':'IconBarsOutlined','Список','arrow'],listOptions);
    }
    const paragraphId={alignment:'alignment',list:'list',paragraph:'lineSpacing',lineHeight:'paragraphSpacing'}[id];
    if(paragraphId){const item=paragraphs.find(([key])=>key===paragraphId);return item?paragraphTool(item):null;}
    if(id==='shiftRight'||id==='shiftLeft'){const item=paragraphs.find(([key])=>key===id);return item?paragraphTool(item):null;}
    if(id==='image'&&imageMode==='seo'||id==='seoImage'&&imageMode==='standard')return null;
    const insertName={link:'IconLinkOutlined',anchor:'IconAnchor',table:'Icon',image:'IconPictureOutlined',seoImage:'IconPictureOutlined',video:'IconVideoCameraOutlined',symbol:'IconSpecialCharacterOutlined'}[id];
    if(insertName)return tool(insertName,id==='symbol'?'Специальный символ':id==='seoImage'?'Изображение SEO':({link:'Ссылка',anchor:'Якорь',table:'Таблица',image:'Изображение',video:'Видео'} as Record<string,string>)[id]);
    if(id==='code')return tool('IconCodeOutlined','Код');
    if(id==='search')return tool('IconReplaceSearchOutlined','Найти и заменить');
    const actionIndex={copy:1,paste:2,cut:3,undo:4,redo:5}[id];
    if(actionIndex){const [name,label,action]=actions[actionIndex];return tool(name,label,undefined,action?()=>onEditingAction(action):undefined);}
    return null;
  };
  return <div role="toolbar" aria-label="Форматирование текста" className={`ed-toolbar ed-${density} ed-tools-${tools} ed-state-${state} ed-layout-${layout} ed-icon-${iconSize}`}>
    {!customMode&&<FormattingControls key={tools} compact={tools==='Short'} disabled={disabled} format={format} onChange={onFormatChange}/>}
    {toolOrder.map(configuredTool)}
    {layout==='Three'&&!customMode&&<CompactToolsTrigger disabled={disabled} inline={inline} paragraph={paragraph} colorActions={colorActions} hiddenTools={hiddenConfigurable} onInlineAction={onInlineAction} onParagraphAction={onParagraphAction}><Tooltip title="Дополнительные инструменты">{moreButton}</Tooltip></CompactToolsTrigger>}
  </div>;
}

export function TextEditor({state,layout='One',density='High',tools='Full',iconSize=20,imageMode='standard',toolOrder,hiddenTools,hiddenSeparators,customMode,value,onChange,placeholder='Введите',toolbarOnly=false,editorRef}:EditorProps){
  const [focused,setFocused]=useState(false);
  const [hover,setHover]=useState(false);
  const {editor,format,inline,paragraph,link,table,colors,selectedImage,selectedVideo,apply,applyInline,insertSymbol,applyColor,applyParagraph,applyLink,setLinkSelectionPreview,createAnchor,deleteAnchor,renameAnchor,updateLinks,insertTable,applyTable,insertImage,insertVideo,insertSeoImageSlot,search,replaceSearch,clearSearch,editingAction}=useTextDocument({value,onChange,disabled:state==='Disabled',placeholder,onFocus:()=>setFocused(true),onBlur:()=>setFocused(false)});
  useEffect(()=>{if(editorRef)editorRef.current=editor;return()=>{if(editorRef)editorRef.current=null;};},[editor,editorRef]);
  const actualState=state??(focused?(value?'Typing':'Focused'):(hover?'Hover':value?'Filled':'Default'));
  const linkActions:LinkPanelActions={selectionText:link.text,hasSelection:link.hasSelection,applyLink:href=>{applyLink(href);},setSelectionPreview:setLinkSelectionPreview,createAnchor:(id,label)=>{createAnchor(id,label);},deleteAnchor,renameAnchor,updateLinks};
  const searchActions:SearchPanelActions={search,replace:(options,replacement,index,all)=>replaceSearch(options,replacement,index,all),clear:clearSearch};
  const tableActions:TablePanelActions={state:table,insert:insertTable,apply:applyTable};
  const imageActions:ImagePanelActions={selected:selectedImage,insert:insertImage};
  const videoActions:VideoPanelActions={selected:selectedVideo,insert:insertVideo};
  const seoImageActions:SeoImageActions={insert:insertSeoImageSlot};
  const colorActions:ColorPanelActions={state:colors,apply:applyColor};
  const symbolActions:SymbolPanelActions={insert:insertSymbol};
  return <div className={`text-editor ${toolbarOnly?'toolbar-only':''} editor-state-${actualState}`} onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}>
    <EditorToolbar key={`${layout}-${density}-${tools}-${iconSize}-${imageMode}`} state={actualState} layout={layout} density={density} tools={tools} iconSize={iconSize} imageMode={imageMode} toolOrder={toolOrder} hiddenTools={hiddenTools} hiddenSeparators={hiddenSeparators} customMode={customMode} format={format} inline={inline} paragraph={paragraph} onFormatChange={apply} onInlineAction={applyInline} onParagraphAction={applyParagraph} onEditingAction={action=>{void editingAction(action);}} linkActions={linkActions} searchActions={searchActions} tableActions={tableActions} imageActions={imageActions} videoActions={videoActions} seoImageActions={seoImageActions} colorActions={colorActions} symbolActions={symbolActions}/>
    {!toolbarOnly&&<EditorContent editor={editor} className="rich-input" onMouseDownCapture={()=>document.dispatchEvent(new Event('editor-dismiss-popovers'))}/>}
  </div>;
}
