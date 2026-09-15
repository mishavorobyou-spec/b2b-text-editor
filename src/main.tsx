import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ConfigProvider, Select, Segmented, Switch, Button} from 'antd';
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
import './stand.css';
import {PanelCatalog} from './ToolPanels';

const states:EditorState[]=['Default','Hover','Focused','Typing','Filled','Disabled','Error'];
const labels:Record<EditorState,string>={Default:'Обычное',Hover:'Наведение',Focused:'Фокус',Typing:'Ввод текста',Filled:'Заполнено',Disabled:'Недоступно',Error:'Ошибка'};
function Stand(){
 const [layout,setLayout]=useState<'One'|'Two'|'Three'>('One');
 const [density,setDensity]=useState<'High'|'Short'>('High');
 const [tools,setTools]=useState<'Full'|'Short'>('Full');
 const [state,setState]=useState<EditorState|'Auto'>('Auto');
 const [value,setValue]=useState('');
 const [toolbarOnly,setToolbarOnly]=useState(false);
 const [gallery,setGallery]=useState(false);
 const [iconSize,setIconSize]=useState<16|20>(20);
 return <ConfigProvider theme={{token:{colorPrimary:'#1677ff',borderRadius:6,fontFamily:'Inter, sans-serif',fontSize:14}}}>
  <div className="stand">
   <header><div className="brand"><span className="brand-mark">B2B</span><span className="header-divider"/><h1>Текстовый редактор</h1></div><span className="version">Локальная версия · 0.3</span></header>
   <main>
    <div className="settings" aria-label="Настройки стенда">
     <div className="stand-control"><span>Вид панели</span><Select aria-label="Вид панели" value={layout} onChange={setLayout} options={[{value:'One',label:'One · Полная'},{value:'Two',label:'Two · В две строки'},{value:'Three',label:'Three · С меню'}]}/></div>
     <div className="stand-control"><span>Высота</span><Segmented<'High'|'Short'> aria-label="Высота панели" value={density} onChange={setDensity} disabled={layout==='Two'} options={[{value:'High',label:'Обычная'},{value:'Short',label:'Компактная'}]}/></div>
     <div className="stand-control"><span>Инструменты</span><Segmented<'Full'|'Short'> aria-label="Набор инструментов" value={tools} onChange={setTools} options={[{value:'Full',label:'Full'},{value:'Short',label:'Short'}]}/></div>
     <div className="stand-control"><span>Состояние</span><Select aria-label="Состояние редактора" value={state} onChange={setState} options={[{value:'Auto',label:'Автоматически'},...states.map(s=>({value:s,label:`${s} · ${labels[s]}`}))]}/></div>
     <div className="stand-control"><span>Иконки</span><Segmented<16|20> aria-label="Размер иконок" value={iconSize} onChange={setIconSize} options={[{value:16,label:"16 px"},{value:20,label:"20 px"}]}/></div>
     <div className="field-switch"><Switch size="small" checked={!toolbarOnly} onChange={v=>setToolbarOnly(!v)} aria-label="Текстовое поле"/><span>Текстовое поле</span></div>
    </div>
    <section className="workspace" aria-label="Предпросмотр редактора">
     <div className="workspace-heading"><span>Редактор</span><span>{layout} / {layout==='Two'?'High':density} / {tools}</span></div>
     <div className={`editor-stage stage-${layout}`}><TextEditor state={state==='Auto'?undefined:state} value={value} onChange={setValue} layout={layout} density={layout==='Two'?'High':density} tools={tools} iconSize={iconSize} toolbarOnly={toolbarOnly}/></div>
     <div className="workspace-footer"><span>Выделите текст, чтобы изменить шрифт или размер. Тип текста меняет текущий текстовый блок. Остальные инструменты пока доступны для просмотра.</span><Button type="text" size="small" onClick={()=>setValue('')} disabled={!value}>Очистить текст</Button></div>
    </section>
    <PanelCatalog iconSize={iconSize}/>
    <div className="gallery-heading"><Button type="text" onClick={()=>setGallery(!gallery)} aria-expanded={gallery}>{gallery?'Скрыть состояния':'Показать все состояния'} <span aria-hidden="true">{gallery?'−':'+'}</span></Button><span>7 состояний</span></div>
    {gallery&&<section className="states" aria-label="Все состояния">{states.map(s=><article key={s}><div className="state-label"><span>{s}</span><span>{labels[s]}</span></div><div className={`editor-stage stage-${layout}`}><TextEditor state={s} value={s==='Filled'||s==='Typing'?'Пример текста редактора':''} onChange={()=>{}} layout={layout} density={layout==='Two'?'High':density} tools={tools} iconSize={iconSize} toolbarOnly={toolbarOnly}/></div></article>)}</section>}
   </main>
  </div>
 </ConfigProvider>;
}
createRoot(document.getElementById('root')!).render(<Stand/>);



