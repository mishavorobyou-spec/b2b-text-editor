import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ConfigProvider, Select, Segmented, Switch, Button} from 'antd';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import {TextEditor, type EditorState} from './Editor';
import './stand.css';

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
 return <ConfigProvider theme={{token:{colorPrimary:'#1677ff',borderRadius:6,fontFamily:'Inter, sans-serif',fontSize:14}}}>
  <div className="stand">
   <header><div className="brand"><span className="brand-mark">B2B</span><span className="header-divider"/><h1>Текстовый редактор</h1></div><span className="version">База компонента · 0.1</span></header>
   <main>
    <div className="settings" aria-label="Настройки стенда">
     <label>Вид панели<Select aria-label="Вид панели" value={layout} onChange={setLayout} options={[{value:'One',label:'One · Полная'},{value:'Two',label:'Two · В две строки'},{value:'Three',label:'Three · С меню'}]}/></label>
     <label>Высота<Segmented<'High'|'Short'> aria-label="Высота панели" value={density} onChange={setDensity} disabled={layout==='Two'} options={[{value:'High',label:'Обычная'},{value:'Short',label:'Компактная'}]}/></label>
     <label>Инструменты<Segmented<'Full'|'Short'> aria-label="Набор инструментов" value={tools} onChange={setTools} options={[{value:'Full',label:'Full'},{value:'Short',label:'Short'}]}/></label>
     <label>Состояние<Select aria-label="Состояние редактора" value={state} onChange={setState} options={[{value:'Auto',label:'Автоматически'},...states.map(s=>({value:s,label:`${s} · ${labels[s]}`}))]}/></label>
     <div className="field-switch"><Switch size="small" checked={!toolbarOnly} onChange={v=>setToolbarOnly(!v)} aria-label="Текстовое поле"/><span>Текстовое поле</span></div>
    </div>
    <section className="workspace" aria-label="Предпросмотр редактора">
     <div className="workspace-heading"><span>Редактор</span><span>{layout} / {layout==='Two'?'High':density} / {tools}</span></div>
     <div className={`editor-stage stage-${layout}`}><TextEditor state={state==='Auto'?undefined:state} value={value} onChange={setValue} layout={layout} density={layout==='Two'?'High':density} tools={tools} toolbarOnly={toolbarOnly}/></div>
     <div className="workspace-footer"><span>Визуальная база. Форматирование подключим на следующем этапе.</span><Button type="text" size="small" onClick={()=>setValue('')} disabled={!value}>Очистить текст</Button></div>
    </section>
    <div className="gallery-heading"><Button type="text" onClick={()=>setGallery(!gallery)} aria-expanded={gallery}>{gallery?'Скрыть состояния':'Показать все состояния'} <span aria-hidden="true">{gallery?'−':'+'}</span></Button><span>7 состояний</span></div>
    {gallery&&<section className="states" aria-label="Все состояния">{states.map(s=><article key={s}><div className="state-label"><span>{s}</span><span>{labels[s]}</span></div><div className={`editor-stage stage-${layout}`}><TextEditor state={s} value={s==='Filled'||s==='Typing'?'Пример текста редактора':''} onChange={()=>{}} layout={layout} density={layout==='Two'?'High':density} tools={tools} toolbarOnly={toolbarOnly}/></div></article>)}</section>}
   </main>
  </div>
 </ConfigProvider>;
}
createRoot(document.getElementById('root')!).render(<Stand/>);

