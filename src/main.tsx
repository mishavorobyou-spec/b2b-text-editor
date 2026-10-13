import React, {useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import type {Editor as TiptapEditor} from '@tiptap/react';
import type {JSONContent} from '@tiptap/core';
import {NodeSelection} from '@tiptap/pm/state';
import {ConfigProvider, Select, Segmented, Switch, Button, Drawer} from 'antd';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/600.css';
import '@fontsource/roboto/cyrillic-400.css';
import '@fontsource/roboto/cyrillic-600.css';
import '@fontsource/open-sans/400.css';
import '@fontsource/open-sans/600.css';
import '@fontsource/open-sans/cyrillic-400.css';
import '@fontsource/open-sans/cyrillic-600.css';
import '@fontsource/noto-sans/400.css';
import '@fontsource/noto-sans/600.css';
import '@fontsource/noto-sans/cyrillic-400.css';
import '@fontsource/noto-sans/cyrillic-600.css';
import '@fontsource/rubik/400.css';
import '@fontsource/rubik/600.css';
import '@fontsource/rubik/cyrillic-400.css';
import '@fontsource/rubik/cyrillic-600.css';
import {TextEditor, type EditorState} from './Editor';
import {DotGridWave} from './DotGridWave';
import {AnimatedGradientBorder} from '../components/AnimatedGradientBorder/AnimatedGradientBorder';
import borderConfig from '../components/AnimatedGradientBorder/gradient-border-config.json';
import './stand.css';
import {PanelCatalog, defaultToolOrder, assignableTools, configurableTools, isToolCategory, type AssignableToolId, type BuiltinSeparatorId, type ConfigurableToolId, type ToolCategoryId, type ToolOrderItem, type ToolSeparatorId} from './ToolPanels';

type ToolPreferences={order:ToolOrderItem[];hidden:AssignableToolId[];hiddenSeparators:BuiltinSeparatorId[];categoryNames:Record<string,string>;customMode:boolean};
const toolPreferencesKey='b2b-editor-tool-preferences';
function migrateToolOrder(legacy:ToolOrderItem[]):ToolOrderItem[]{
 const categoryForTool=new Map<ConfigurableToolId,ToolCategoryId>();
 let category:ToolCategoryId='category-format';
 for(const item of defaultToolOrder){if(isToolCategory(item))category=item;else if(configurableTools.includes(item as ConfigurableToolId))categoryForTool.set(item as ConfigurableToolId,category);}
 const buckets=new Map<ToolCategoryId,ToolOrderItem[]>();
 let previous:ToolCategoryId='category-insert';
 for(const item of legacy){
  if(configurableTools.includes(item as ConfigurableToolId))previous=categoryForTool.get(item as ConfigurableToolId)??previous;
  if(configurableTools.includes(item as ConfigurableToolId)||item.startsWith('separator-'))buckets.set(previous,[...(buckets.get(previous)??[]),item]);
 }
 const result:ToolOrderItem[]=[];
 for(const item of defaultToolOrder){
  if(isToolCategory(item)){category=item;result.push(item);continue;}
  if(item.startsWith('builtin-')){result.push(item);result.push(...(buckets.get(category)??[]));continue;}
  if(!legacy.includes(item))result.push(item);
 }
 return result;
}
function readToolPreferences():ToolPreferences{
 const initial:ToolPreferences={order:[...defaultToolOrder],hidden:[],hiddenSeparators:[],categoryNames:{},customMode:false};
 try{
  const saved=JSON.parse(localStorage.getItem(toolPreferencesKey)??'{}');
  const validTool=(value:unknown):value is AssignableToolId=>typeof value==='string'&&assignableTools.includes(value as AssignableToolId);
  const validOrderItem=(value:unknown):value is ToolOrderItem=>validTool(value)||(typeof value==='string'&&(defaultToolOrder.includes(value as ToolOrderItem)||/^separator-[\w-]{1,64}$/.test(value)||/^category-custom-[\w-]{1,64}$/.test(value)));
  const savedOrder=Array.isArray(saved.order)?[...new Set(saved.order.filter(validOrderItem))] as ToolOrderItem[]:[];
  const customMode=saved.customMode===true;
  const order=customMode?savedOrder:saved.version>=2?[...savedOrder,...defaultToolOrder.filter(item=>!savedOrder.includes(item))]:migrateToolOrder(savedOrder);
  const hidden=Array.isArray(saved.hidden)?[...new Set(saved.hidden.filter(validTool))] as AssignableToolId[]:[];
  const hiddenSeparators=Array.isArray(saved.hiddenSeparators)?saved.hiddenSeparators.filter((item:unknown):item is BuiltinSeparatorId=>typeof item==='string'&&item in {'builtin-format':1,'builtin-color':1,'builtin-paragraph':1,'builtin-insert':1,'builtin-edit':1}):[];
  const categoryNames=Object.fromEntries(Object.entries(saved.categoryNames??{}).filter(([id,name])=>/^category-custom-[\w-]{1,64}$/.test(id)&&typeof name==='string'&&name.trim()).map(([id,name])=>[id,(name as string).slice(0,60)]));
  return {order,hidden,hiddenSeparators,categoryNames,customMode};
 }catch{return initial;}
}

const states:EditorState[]=['Default','Hover','Focused','Typing','Filled','Disabled','Error'];
const labels:Record<EditorState,string>={Default:'Обычное',Hover:'Наведение',Focused:'Фокус',Typing:'Ввод текста',Filled:'Заполнено',Disabled:'Недоступно',Error:'Ошибка'};
const demoText=`Современный текстовый редактор помогает готовить материалы для карточек, лендингов и внутренних страниц. Автор может сосредоточиться на содержании, а инструменты оформления поддерживают единый стиль и понятную структуру документа.

Перед публикацией рекомендуется проверить основные элементы:
• заголовки отражают смысл разделов;
• абзацы раскрывают одну мысль;
• ссылки ведут на актуальные страницы;
• списки используются для порядка или сравнения;
• ключевые формулировки выделены последовательно.

Работу удобно начинать с черновика: записать основные идеи, распределить их по разделам, затем уточнить формулировки и добавить ссылки. После этого текст стоит перечитать целиком, проверить факты, орфографию и отображение на разных размерах экрана.

Финальная версия должна быть ясной, полезной и готовой к согласованию с командой.`;
function demoBlocks():JSONContent[]{
 const blocks:JSONContent[]=[];
 let items:JSONContent[]=[];
 const finishList=()=>{if(items.length){blocks.push({type:'bulletList',content:items});items=[];}};
 for(const line of demoText.split('\n')){
  const text=line.trim();
  if(!text){finishList();continue;}
  if(text.startsWith('• '))items.push({type:'listItem',content:[{type:'paragraph',content:[{type:'text',text:text.slice(2)}]}]});
  else{finishList();blocks.push({type:'paragraph',content:[{type:'text',text}]});}
 }
 finishList();
 return blocks;
}
function Stand(){
 const editorRef=useRef<TiptapEditor|null>(null);
 const appendDemoText=()=>{
  const editor=editorRef.current;if(!editor)return;
  const {selection,doc}=editor.state;
  let wrapPos:number|undefined;
  if(selection instanceof NodeSelection&&selection.node.type.name==='centerImageWrap')wrapPos=selection.from;
  else for(let depth=selection.$from.depth;depth>0;depth--){if(selection.$from.node(depth).type.name==='centerImageWrap'){wrapPos=selection.$from.before(depth);break;}}
  if(wrapPos!==undefined){
   const wrap=doc.nodeAt(wrapPos);
   const at=selection instanceof NodeSelection&&wrap?wrapPos+2+wrap.child(0).content.size:selection.to;
   editor.chain().focus().insertContentAt(at,demoText.replace(/\s*\n\s*/g,' ')).run();
   return;
  }
  editor.chain().focus().insertContentAt(selection.to,demoBlocks()).run();
 };
 const [layout,setLayout]=useState<'One'|'Two'|'Three'>('One');
 const [density,setDensity]=useState<'High'|'Short'>('High');
 const [tools,setTools]=useState<'Full'|'Short'>('Full');
 const [state,setState]=useState<EditorState|'Auto'>('Auto');
 const [value,setValue]=useState('');
 const [toolbarOnly,setToolbarOnly]=useState(false);
 const [gallery,setGallery]=useState(false);
 const iconSize:16|20=layout==='Two'||density==='High'?20:16;
 const [imageMode,setImageMode]=useState<'standard'|'seo'>('standard');
 const [settingsOpen,setSettingsOpen]=useState(false);
 const [toolPreferences,setToolPreferences]=useState<ToolPreferences>(readToolPreferences);
 useEffect(()=>{try{localStorage.setItem(toolPreferencesKey,JSON.stringify({...toolPreferences,version:3}));}catch{/* Настройки остаются доступными до закрытия вкладки. */}},[toolPreferences]);
 const toggleTool=(tool:AssignableToolId,enabled:boolean)=>setToolPreferences(current=>({...current,hidden:enabled?current.hidden.filter(item=>item!==tool):[...new Set([...current.hidden,tool])]}));
 const toggleSeparator=(id:BuiltinSeparatorId,enabled:boolean)=>setToolPreferences(current=>({...current,hiddenSeparators:enabled?current.hiddenSeparators.filter(item=>item!==id):[...new Set([...current.hiddenSeparators,id])]}));
 const moveTool=(source:ToolOrderItem,target:ToolOrderItem,placement:'before'|'after')=>setToolPreferences(current=>{
  if(source===target||source.startsWith('builtin-')||isToolCategory(source)||!current.order.includes(source))return current;
  const order=current.order.filter(tool=>tool!==source);
  let index=order.indexOf(target);
  if(index<0)return current;
  if(isToolCategory(target)&&placement==='after'){const next=order[index+1];if(next?.startsWith('builtin-'))index++;}
  order.splice(index+(placement==='after'?1:0),0,source);
  return {...current,order};
 });
 const moveCategory=(id:ToolCategoryId,direction:'up'|'down')=>setToolPreferences(current=>{
  const starts=current.order.flatMap((item,index)=>isToolCategory(item)?[index]:[]);
  const position=starts.findIndex(index=>current.order[index]===id);
  const neighbor=position+(direction==='up'?-1:1);
  if(position<0||neighbor<0||neighbor>=starts.length)return current;
  const first=starts[Math.min(position,neighbor)];
  const middle=starts[Math.max(position,neighbor)];
  const end=starts[Math.max(position,neighbor)+1]??current.order.length;
  const firstGroup=current.order.slice(first,middle);
  const secondGroup=current.order.slice(middle,end);
  const order=[...current.order.slice(0,first),...secondGroup,...firstGroup,...current.order.slice(end)];
  return {...current,order};
 });
 const addSeparator=()=>setToolPreferences(current=>({...current,order:[...current.order,`separator-${crypto.randomUUID()}` as ToolSeparatorId]}));
 const deleteSeparator=(id:ToolSeparatorId)=>setToolPreferences(current=>({...current,order:current.order.filter(item=>item!==id)}));
 const addCategory=()=>setToolPreferences(current=>{const id=`category-custom-${crypto.randomUUID()}` as ToolCategoryId;return {...current,order:[...current.order,id],categoryNames:{...current.categoryNames,[id]:'Новая категория'}};});
 const renameCategory=(id:ToolCategoryId,name:string)=>setToolPreferences(current=>({...current,categoryNames:{...current.categoryNames,[id]:name.trim().slice(0,60)||'Новая категория'}}));
 const deleteCategory=(id:ToolCategoryId)=>setToolPreferences(current=>{const categoryNames={...current.categoryNames};delete categoryNames[id];if(!current.customMode)return {...current,order:current.order.filter(item=>item!==id),categoryNames};const start=current.order.indexOf(id),end=current.order.findIndex((item,index)=>index>start&&isToolCategory(item));return {...current,order:current.order.filter((_,index)=>index<start||index>=(end<0?current.order.length:end)),categoryNames};});
 const assignCategory=(tool:AssignableToolId,category?:ToolCategoryId)=>setToolPreferences(current=>{
  const fixed=!current.customMode&&(tool==='textType'||tool==='font'||tool==='fontSize');
  const textCategory=`category-custom-${crypto.randomUUID()}` as ToolCategoryId;
  const order=(fixed?[textCategory,'textType','font','fontSize',...current.order] as ToolOrderItem[]:current.order).filter(item=>item!==tool);
  if(!category)return {...current,order};
  const categoryIndex=order.indexOf(category);
  if(categoryIndex<0)return current;
  let insertAt=categoryIndex+1;
  while(insertAt<order.length&&!isToolCategory(order[insertAt]))insertAt++;
  order.splice(insertAt,0,tool);
  return {...current,order,hidden:current.hidden.filter(item=>item!==tool),customMode:current.customMode||fixed,categoryNames:fixed?{...current.categoryNames,[textCategory]:'Текстовое оформление'}:current.categoryNames};
 });
 const clearToolPreferences=()=>setToolPreferences({order:[],hidden:[],hiddenSeparators:[],categoryNames:{},customMode:true});
 const resetToolPreferences=()=>setToolPreferences({order:[...defaultToolOrder],hidden:[],hiddenSeparators:[],categoryNames:{},customMode:false});
 return <ConfigProvider theme={{token:{colorPrimary:'#1677ff',borderRadius:6,fontFamily:'Inter, sans-serif',fontSize:14}}}>
  <div className="stand">
   <DotGridWave/>
   <main>
    <section className="workspace" aria-label="Предпросмотр редактора">
     <div className="workspace-heading"><span>Редактор</span></div>
     <div className={`editor-stage stage-${layout}`}><TextEditor state={state==='Auto'?undefined:state} value={value} onChange={setValue} layout={layout} density={layout==='Two'?'High':density} tools={tools} iconSize={iconSize} imageMode={imageMode} toolbarOnly={toolbarOnly} editorRef={editorRef} toolOrder={toolPreferences.order} hiddenTools={toolPreferences.hidden} hiddenSeparators={toolPreferences.hiddenSeparators} customMode={toolPreferences.customMode}/></div>
     <div className="workspace-footer"><span>Выделите текст и примените оформление, выравнивание, список или интервалы. Без выделения команда действует в текущей позиции.</span><div className="workspace-actions"><Button type="primary" onClick={appendDemoText}>Добавить текст-рыбу</Button><Button type="text" onClick={()=>setValue('')} disabled={!value}>Очистить текст</Button></div></div>
     <AnimatedGradientBorder config={borderConfig}/>
    </section>
   </main>
   <footer className="stand-footer"><div className="brand"><span className="brand-mark">B2B</span><span className="header-divider"/><span className="footer-title">Текстовый редактор</span><span className="version">Версия · 0.60</span></div><Button type="primary" onClick={()=>setSettingsOpen(true)} aria-label="Настроить редактор">Настроить редактор</Button></footer>
   <Drawer title="Настроить редактор" placement="right" width="min(480px, 100vw)" open={settingsOpen} onClose={()=>setSettingsOpen(false)} className="settings-drawer">
    <div className="settings" aria-label="Настройки стенда">
     <div className="stand-control"><span>Вид панели</span><Select aria-label="Вид панели" value={layout} onChange={setLayout} options={[{value:'One',label:'One · Полная'},{value:'Two',label:'Two · В две строки'},{value:'Three',label:'Three · С меню'}]}/></div>
     <div className="stand-control"><span>Состояние</span><Select aria-label="Состояние редактора" value={state} onChange={setState} options={[{value:'Auto',label:'Автоматически'},...states.map(s=>({value:s,label:`${s} · ${labels[s]}`}))]}/></div>
     <div className="stand-control"><span>Загрузка изображений</span><Select aria-label="Загрузка изображений" value={imageMode} onChange={setImageMode} options={[{value:'standard',label:'Обычная'},{value:'seo',label:'SEO · Слоты'}]}/></div>
     <div className="stand-control"><span>Текстовое поле</span><div className="field-switch"><span>Отображение поля</span><Switch size="small" checked={!toolbarOnly} onChange={v=>setToolbarOnly(!v)} aria-label="Отображение текстового поля"/></div></div>
     <div className="settings-columns">
      <div className="stand-control"><span>Высота</span><Segmented<'High'|'Short'> aria-label="Высота панели" value={density} onChange={setDensity} disabled={layout==='Two'} options={[{value:'High',label:'Обычная'},{value:'Short',label:'Компактная'}]}/></div>
      <div className="stand-control"><span>Инструменты</span><Segmented<'Full'|'Short'> aria-label="Набор инструментов" value={tools} onChange={setTools} options={[{value:'Full',label:'Full'},{value:'Short',label:'Short'}]}/></div>
     </div>
    </div>
    <PanelCatalog iconSize={iconSize} order={toolPreferences.order} hidden={toolPreferences.hidden} hiddenSeparators={toolPreferences.hiddenSeparators} categoryNames={toolPreferences.categoryNames} customMode={toolPreferences.customMode} onToggle={toggleTool} onToggleSeparator={toggleSeparator} onMove={moveTool} onMoveCategory={moveCategory} onAddSeparator={addSeparator} onDeleteSeparator={deleteSeparator} onAddCategory={addCategory} onRenameCategory={renameCategory} onDeleteCategory={deleteCategory} onAssignCategory={assignCategory} onClear={clearToolPreferences} onReset={resetToolPreferences}/>
    <div className="gallery-heading"><Button type="text" onClick={()=>setGallery(!gallery)} aria-expanded={gallery}>{gallery?'Скрыть состояния':'Показать все состояния'} <span aria-hidden="true">{gallery?'−':'+'}</span></Button><span>7 состояний</span></div>
    {gallery&&<section className="states" aria-label="Все состояния">{states.map(s=><article key={s}><div className="state-label"><span>{s}</span><span>{labels[s]}</span></div><div className={`editor-stage stage-${layout}`}><TextEditor state={s} value={s==='Filled'||s==='Typing'?'Пример текста редактора':''} onChange={()=>{}} layout={layout} density={layout==='Two'?'High':density} tools={tools} iconSize={iconSize} imageMode={imageMode} toolbarOnly={toolbarOnly} toolOrder={toolPreferences.order} hiddenTools={toolPreferences.hidden} hiddenSeparators={toolPreferences.hiddenSeparators} customMode={toolPreferences.customMode}/></div></article>)}</section>}
   </Drawer>
  </div>
 </ConfigProvider>;
}
createRoot(document.getElementById('root')!).render(<Stand/>);
