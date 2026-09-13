import React, {useState} from 'react';
import {Select, Input, Tooltip} from 'antd';
import {icons} from './all-assets';
import './editor.css';

export type EditorState = 'Default'|'Hover'|'Focused'|'Typing'|'Filled'|'Disabled'|'Error';
export type ToolbarProps = {state?: EditorState; layout?: 'One'|'Two'|'Three'; density?: 'High'|'Short'; tools?: 'Full'|'Short'};
export type EditorProps = ToolbarProps & {value: string; onChange: (value:string)=>void; placeholder?:string; toolbarOnly?:boolean};
const Icon = ({name,small=false}:{name:string;small?:boolean})=><img className={small?'ed-caret':'ed-icon'} src={icons['img'+name]} alt="" draggable={false}/>;
const Separator = ()=> <span className="ed-divider" aria-hidden="true"><img src={icons.imgDividerVertical} alt=""/></span>;
const basic=[['IconBoldOutlined','Полужирный'],['IconItalicOutlined','Курсив'],['IconUnderlineOutlined','Подчёркнутый'],['IconStrikethroughOutlined','Зачёркнутый'],['IconClearOutlined','Очистить форматирование']];
const paragraphs=[['IconAlignLeftOutlined','Выравнивание','arrow'],['IconOrderedListOutlined','Список','arrow'],['IconMenuUnfoldOutlined','Увеличить отступ'],['IconMenuFoldOutlined','Уменьшить отступ'],['StateDefaultSizeDefault1','Интервал между абзацами'],['StateDefaultSizeDefault','Межстрочный интервал']];
const inserts=[['IconLinkOutlined','Ссылка'],['IconAnchor','Якорь'],['Icon','Таблица'],['IconPictureOutlined','Изображение'],['IconVideoCameraOutlined','Видео'],['IconCodeOutlined','Код'],['IconSpecialCharacterOutlined','Специальный символ']];
const actions=[['IconReplaceSearchOutlined','Найти и заменить'],['IconCopyOutlined','Копировать'],['IconSnippetsOutlined','Вставить'],['IconScissorOutlined','Вырезать'],['IconActionBackOutlined','Отменить'],['IconActionForwardOutlined','Повторить']];

export function EditorToolbar({state='Default',layout='One',density='High',tools='Full'}:ToolbarProps){
  const disabled=state==='Disabled';
  const tool=(name:string,label:string,decoration?:string)=><Tooltip key={name} title={label}><button type="button" className="ed-tool" aria-label={label} disabled={disabled}><Icon name={name}/>{decoration==='arrow'&&<Icon name="IconCaretDownOutlined" small/>}{decoration==='color'&&<span className="ed-swatch"/>}</button></Tooltip>;
  const group=(items:string[][])=>items.map(([name,label,decoration])=>tool(name,label,decoration));
  return <div role="toolbar" aria-label="Форматирование текста" className={`ed-toolbar ed-${density} ed-tools-${tools} ed-state-${state} ed-layout-${layout}`}>
    {tools==='Full'?<>
      <Select aria-label="Тип текста" className="ed-select ed-select-type" size="small" placeholder="Type text" open={false} disabled={disabled} suffixIcon={<Icon name="IconDownOutlined"/>}/>
      <Select aria-label="Шрифт" className="ed-select ed-select-font" size="small" placeholder="Roboto" open={false} disabled={disabled} suffixIcon={<Icon name="IconDownOutlined"/>}/>
      <Select aria-label="Размер шрифта" className="ed-select ed-select-size" size="small" placeholder="14" open={false} disabled={disabled} suffixIcon={<Icon name="IconDownOutlined"/>}/>
    </>:<>{tool('IconTextTypeOutlined','Тип текста','arrow')}{tool('IconFontSizeOutlined','Шрифт','arrow')}<button type="button" className="ed-tool ed-size" aria-label="Размер шрифта" disabled={disabled}>14<Icon name="IconCaretDownOutlined" small/></button></>}
    <Separator/>{group(basic)}<Separator/>
    {tools==='Full'?<>{tool('IconFormatPainterOutlined','Формат по образцу','color')}{tool('IconHighlightOutlined','Цвет выделения','color')}{layout!=='Three'&&tool('IconFontColorsOutlined','Цвет текста','color')}</>:tool('IconBgColorsOutlined','Цвет','arrow')}
    {layout==='Three'?tool('IconMoreOutlined','Дополнительные инструменты'):<><Separator/>{group(paragraphs)}<Separator/>{group(inserts)}<Separator/>{group(actions)}</>}
  </div>;
}

export function TextEditor({state,layout='One',density='High',tools='Full',value,onChange,placeholder='Введите',toolbarOnly=false}:EditorProps){
  const [focused,setFocused]=useState(false);
  const [hover,setHover]=useState(false);
  const actualState=state??(focused?(value?'Typing':'Focused'):(hover?'Hover':value?'Filled':'Default'));
  return <div className={`text-editor ${toolbarOnly?'toolbar-only':''} editor-state-${actualState}`} onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}>
    <EditorToolbar state={actualState} layout={layout} density={density} tools={tools}/>
    {!toolbarOnly&&<Input.TextArea aria-label="Текст редактора" value={value} onChange={e=>onChange(e.target.value)} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} placeholder={placeholder} disabled={actualState==='Disabled'} status={actualState==='Error'?'error':undefined} className="ed-input"/>}
  </div>;
}
