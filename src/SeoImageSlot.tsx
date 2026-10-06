import React, {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {Button, Input, Modal, Popover, Segmented, Switch, Tooltip, Upload} from 'antd';
import {Node, NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps} from '@tiptap/react';
import {DOMSerializer, Fragment} from '@tiptap/pm/model';
import {Plugin, TextSelection} from '@tiptap/pm/state';
import './seo-image-tools.css';

export type SeoImageVariant='image-text'|'single'|'grid';
export const seoVariantLabels:Record<SeoImageVariant,string>={
 'image-text':'Слот с изображением и текстом',single:'Слот с одиночным изображением',grid:'Слот с сеткой изображений',
};
export type SeoImageItem={src:string;name:string;alt:string;title:string;caption:string;align:'left'|'center'|'right';height:number|null;width:number|null;fullWidth:boolean;href:string;newTab:boolean;nofollow:boolean};
export type SeoImageSlotData={variant:SeoImageVariant;images:SeoImageItem[];text:string};
export const blankSeoImage=(src:string,name:string):SeoImageItem=>({src,name,alt:'',title:'',caption:'',align:'left',height:null,width:null,fullWidth:false,href:'',newTab:false,nofollow:false});
const imageTypes=new Set(['image/png','image/jpeg','image/webp','image/gif']);
const knownImages:{src:string;name:string}[]=[];
const validUrl=(value:string)=>{if(!value.trim())return true;try{return ['http:','https:'].includes(new URL(value).protocol);}catch{return false;}};
const readImage=(file:File)=>new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>typeof reader.result==='string'?resolve(reader.result):reject(new Error('Не удалось прочитать изображение'));reader.onerror=()=>reject(new Error('Не удалось прочитать изображение'));reader.readAsDataURL(file);});

function measureText(fragment:Fragment,width:number,reference:HTMLElement,serializer:DOMSerializer){
 if(!fragment.size||width<8)return 0;
 const computed=getComputedStyle(reference),sample=document.createElement('div');
 sample.style.cssText=`position:absolute;visibility:hidden;pointer-events:none;left:-10000px;top:0;width:${width}px;font:${computed.font};line-height:${computed.lineHeight};letter-spacing:${computed.letterSpacing};white-space:pre-wrap;overflow-wrap:anywhere;box-sizing:border-box`;
 sample.appendChild(serializer.serializeFragment(fragment));document.body.appendChild(sample);
 const height=sample.getBoundingClientRect().height;sample.remove();return height;
}
function fittingOffset(fragment:Fragment,width:number,height:number,reference:HTMLElement,serializer:DOMSerializer){
 if(!fragment.size||width<8||height<16)return 0;
 let low=0,high=fragment.size;
 while(low<high){const middle=Math.ceil((low+high)/2);if(measureText(fragment.cut(0,middle),width,reference,serializer)<=height+1)low=middle;else high=middle-1;}
 if(low===fragment.size||low===0)return low;
 const text=fragment.textBetween(0,low,'\n'),boundary=Math.max(text.lastIndexOf(' '),text.lastIndexOf('\n'))+1;
 return boundary>low-24?boundary:low;
}
function balancedLeftOffset(fragment:Fragment,capacity:number){
 if(capacity<=0)return 0;const halfway=Math.round(fragment.size/2);if(capacity<halfway)return capacity;
 let nearest:number|undefined;
 fragment.forEach((node,offset)=>{const value=node.text??'';for(let i=0;i<value.length;i++)if(/\s/.test(value[i])&&offset+i+1<=capacity&&(nearest===undefined||Math.abs(offset+i+1-halfway)<Math.abs(nearest-halfway)))nearest=offset+i+1;});
 return nearest??Math.min(capacity,halfway);
}
function rebalanceSeoImageSlots(view:NodeViewProps['editor']['view']){
 if(view.composing)return;
 let change:{pos:number;node:NonNullable<ReturnType<typeof view.state.doc.nodeAt>>;left:number;right:number;content:Fragment}|undefined;
 view.state.doc.descendants((node,pos)=>{
  if(change||node.type.name!=='seoImageSlot'||node.attrs.variant!=='image-text')return !change;
  const dom=view.nodeDOM(pos);if(!(dom instanceof HTMLElement))return false;
  const preview=dom.querySelector<HTMLElement>('.seo-image-preview'),editable=dom.querySelector<HTMLElement>('.seo-image-editable'),picture=dom.querySelector<HTMLImageElement>('.seo-image-picture img');
  if(!preview||!editable||!picture||!picture.naturalWidth||!node.childCount)return false;
  let content=Fragment.empty;
  node.forEach((child,_offset,index)=>{if(index>=3&&child.content.size)content=content.append(Fragment.from(view.state.schema.nodes.hardBreak.create()));content=content.append(child.content);});
  const serializer=DOMSerializer.fromSchema(view.state.schema),width=preview.clientWidth-16,align=preview.dataset.align??'left',fullWidth=preview.dataset.fullWidth==='true';
  const ratio=picture.naturalWidth/picture.naturalHeight,limit=Math.max(1,width/2),specifiedWidth=Number(preview.dataset.width)||0,specifiedHeight=Number(preview.dataset.height)||0;
  let imageWidth=88,imageHeight=88;
  if(fullWidth){imageWidth=width;imageHeight=specifiedHeight||width/ratio;}
  else if(specifiedWidth||specifiedHeight){imageWidth=Math.min(limit,specifiedWidth||specifiedHeight*ratio);imageHeight=specifiedHeight||imageWidth/ratio;}
  else if(content.size&&preview.dataset.pendingImage!=='true'){
   imageWidth=Math.min(limit,88);
   for(let iteration=0;iteration<4;iteration++){
    const sideWidth=align==='center'?(width-imageWidth-20)/2:width-imageWidth-10;
    const textHeight=measureText(content,sideWidth,editable,serializer);
    imageWidth=Math.min(limit,Math.max(88,Math.ceil(textHeight/(align==='center'?2:1)*ratio)));
   }
   imageHeight=imageWidth/ratio;
  }
  preview.style.setProperty('--seo-image-width',`${imageWidth}px`);preview.style.setProperty('--seo-image-height',`${imageHeight}px`);
  const caption=dom.querySelector<HTMLElement>('figcaption');
  const mediaHeight=imageHeight+(caption?caption.getBoundingClientRect().height+4:0);
  preview.style.setProperty('--seo-media-height',`${mediaHeight}px`);
  const sideWidth=align==='center'?(width-imageWidth-20)/2:width-imageWidth-10;
  const first=fullWidth?0:align==='center'?balancedLeftOffset(content,fittingOffset(content,sideWidth,mediaHeight,editable,serializer)):fittingOffset(content,sideWidth,mediaHeight,editable,serializer);
  const second=fullWidth||align!=='center'?first:first+fittingOffset(content.cut(first),sideWidth,mediaHeight,editable,serializer);
  if(node.childCount!==3||node.child(0).content.size!==first||node.child(1).content.size!==second-first)change={pos,node,left:first,right:second,content};
  return false;
 });
 if(!change)return;
 const {pos,node,left,right,content}=change,paragraph=view.state.schema.nodes.paragraph,attrs=node.child(0)?.attrs;
 const next=node.type.create(node.attrs,[paragraph.create(attrs,content.cut(0,left)),paragraph.create(attrs,content.cut(left,right)),paragraph.create(attrs,content.cut(right))]);
 const selection=view.state.selection;let textOffset:number|undefined,sourceColumn=0,offset=0;
 if(selection.empty&&selection.from>pos&&selection.from<pos+node.nodeSize){for(let i=0;i<node.childCount;i++){const start=pos+2+node.content.content.slice(0,i).reduce((sum,child)=>sum+child.nodeSize,0);if(selection.from>=start&&selection.from<=start+node.child(i).content.size){sourceColumn=i;textOffset=offset+selection.from-start;break;}offset+=node.child(i).content.size;}}
 const tr=view.state.tr.replaceWith(pos,pos+node.nodeSize,next).setMeta('addToHistory',false);
 if(textOffset!==undefined){const target=textOffset<left||(textOffset===left&&sourceColumn===0)?pos+2+textOffset:textOffset<right||(textOffset===right&&sourceColumn===1)?pos+2+next.child(0).nodeSize+textOffset-left:pos+2+next.child(0).nodeSize+next.child(1).nodeSize+textOffset-right;tr.setSelection(TextSelection.create(tr.doc,target));}
 view.dispatch(tr);
}
function scheduleSeoRebalance(view:NodeViewProps['editor']['view']){requestAnimationFrame(()=>rebalanceSeoImageSlots(view));}

export function SeoImageChoice({close,insert}:{close:()=>void;insert?:(variant:SeoImageVariant)=>boolean}){
 const [choice,setChoice]=useState<SeoImageVariant|null>(null);
 return <div className="seo-choice" role="group" aria-label="Тип строки изображения"><h2>Настройка строки изображения</h2><div className="seo-choice-options" role="radiogroup" aria-label="Тип строки изображения">
  {(['single','image-text','grid'] as const).map(variant=><button key={variant} type="button" role="radio" aria-checked={choice===variant} className="seo-choice-option" onClick={()=>setChoice(variant)}><img src={choice===variant?'/icons/seo-radio-on.svg':'/icons/seo-radio-off.svg'} alt=""/>{seoVariantLabels[variant]}</button>)}
 </div><div className="seo-image-footer"><Button onClick={close}>Отменить</Button><Button type="primary" aria-disabled={!choice} onClick={()=>{if(choice&&insert?.(choice))close();}}>Добавить</Button></div></div>;
}

function SeoImageSettings({item,variant,onCancel,onSave}:{item:SeoImageItem;variant:SeoImageVariant;onCancel:()=>void;onSave:(next:SeoImageItem)=>void}){
 const [draft,setDraft]=useState(item);
 const set=<K extends keyof SeoImageItem>(key:K,value:SeoImageItem[K])=>setDraft(current=>({...current,[key]:value}));
 const numberField=(key:'height'|'width',label:string,disabled=false)=><label className="seo-image-field">{label}<span className="seo-image-number"><Input aria-label={label} inputMode="numeric" disabled={disabled} value={draft[key]??''} placeholder="Введите" onChange={event=>{const value=event.target.value;if(/^\d*$/.test(value)&&Number(value)<=10000)set(key,value?Number(value):null);}}/><span>px</span></span></label>;
 const switchField=(key:'fullWidth'|'newTab'|'nofollow',label:string,disabled=false)=><div className="seo-image-switch"><Switch size="small" aria-label={label} checked={draft[key]} disabled={disabled} onChange={checked=>set(key,checked)}/><span>{label}</span></div>;
 return <Modal open title="Настройка изображения" onCancel={onCancel} footer={null} width={857} zIndex={1200} destroyOnHidden className="seo-image-modal">
  <div className="seo-image-settings-grid">
   <label className="seo-image-field">Alt изображения<Input aria-label="Alt изображения" value={draft.alt} placeholder="Введите" onChange={event=>set('alt',event.target.value)}/></label>
   <label className="seo-image-field">Заголовок<Input aria-label="Заголовок изображения" value={draft.title} placeholder="Введите" onChange={event=>set('title',event.target.value)}/></label>
   <label className="seo-image-field">Подпись изображения<Input aria-label="Подпись изображения" value={draft.caption} placeholder="Введите" onChange={event=>set('caption',event.target.value)}/></label>
   {variant==='grid'?null:<div className="seo-image-align"><span>Положение изображения</span><Segmented<'left'|'center'|'right'> block disabled={draft.fullWidth} value={draft.align} onChange={value=>set('align',value)} options={[{value:'left',label:<><img src="/icons/seo-left.svg" alt=""/>Слева</>},{value:'center',label:<><img src="/icons/seo-center.svg" alt=""/>По центру</>},{value:'right',label:<><img src="/icons/seo-right.svg" alt=""/>Справа</>}]}/></div>}
   {numberField('height','Высота')}{numberField('width','Ширина',draft.fullWidth)}
   <div className="seo-image-field"><span>Общая настройка изображения <Tooltip title="Растянуть изображение на ширину области"><img className="seo-image-hint" src="/icons/seo-question.svg" alt="Подсказка"/></Tooltip></span>{switchField('fullWidth','Изображение во всю ширину')}</div>
   <div className="seo-image-link-row"><label className="seo-image-field">Ссылка для перехода по изображению<Input aria-label="Ссылка для перехода по изображению" status={validUrl(draft.href)?undefined:'error'} value={draft.href} placeholder="Введите" onChange={event=>set('href',event.target.value)}/></label>
    <div className="seo-image-switch-column">{switchField('newTab','Ссылка в новой вкладке',!draft.href.trim())}</div>
    <div className="seo-image-switch-column">{switchField('nofollow','Не учитывать ссылку для SEO',!draft.href.trim())}</div></div>
  </div>
  <div className="seo-image-footer"><Button onClick={onCancel}>Отменить</Button><Button type="primary" disabled={!validUrl(draft.href)} onClick={()=>onSave(draft)}>Применить</Button></div>
 </Modal>;
}

function SeoImageView({node,updateAttributes,deleteNode,editor,getPos}:NodeViewProps){
 const attrs=node.attrs as SeoImageSlotData;
 const [open,setOpen]=useState(!attrs.images.length);
 const [draft,setDraft]=useState<SeoImageSlotData>(attrs);
 const [picker,setPicker]=useState<number|null>(null);
 const [settings,setSettings]=useState<number|null>(null);
 const [previewImage,setPreviewImage]=useState<{src:string;name:string}|null>(null);
 const [error,setError]=useState('');
 const [,refreshLibrary]=useState(0);
 const previewRef=useRef<HTMLDivElement>(null);
 const [panelWidth,setPanelWidth]=useState(340);
 const shown=open?draft:attrs;
 useLayoutEffect(()=>{
  if(shown.variant!=='image-text'||!previewRef.current)return;
  const preview=previewRef.current;let previousWidth=preview.clientWidth;
  const observer=new ResizeObserver(()=>{if(preview.clientWidth!==previousWidth){previousWidth=preview.clientWidth;scheduleSeoRebalance(editor.view);}});
  observer.observe(preview);scheduleSeoRebalance(editor.view);return ()=>observer.disconnect();
 },[editor,node.content.size,open,draft.images,draft.variant,attrs.images,attrs.variant]);
 useEffect(()=>{
  if(attrs.variant!=='image-text'||!attrs.text||node.content.size)return;
  const pos=getPos();
  if(typeof pos!=='number')return;
  const paragraph=editor.schema.nodes.paragraph.create(null,editor.schema.text(attrs.text));
  editor.view.dispatch(editor.state.tr.insert(pos+1,paragraph).setNodeMarkup(pos,undefined,{...attrs,text:''}));
 },[attrs.variant,attrs.text,node.content.size,editor,getPos]);
 useEffect(()=>{if(!attrs.images.length)setOpen(true);},[attrs.variant,attrs.images.length]);
 useLayoutEffect(()=>{
  if(!open||!previewRef.current)return;
  const measure=()=>setPanelWidth(previewRef.current?.getBoundingClientRect().width??340);
  measure();
  const observer=new ResizeObserver(measure);
  observer.observe(previewRef.current);
  return ()=>observer.disconnect();
 },[open]);
 const openPanel=()=>{if(open)return;setDraft(attrs);setError('');setOpen(true);};
 const cancel=()=>{setOpen(false);setPicker(null);if(!attrs.images.length)deleteNode();};
 const choose=(src:string,name:string)=>{setDraft(current=>{const images=[...current.images];const index=picker??images.length;images[index]=images[index]?.src===src?images[index]:blankSeoImage(src,name);return {...current,images};});setPicker(null);setError('');};
 const upload=(file:File)=>{if(!imageTypes.has(file.type)){setError('Выберите PNG, JPEG, WebP или GIF');return false;}void readImage(file).then(src=>{knownImages.unshift({src,name:file.name});refreshLibrary(value=>value+1);choose(src,file.name);}).catch(()=>setError('Не удалось прочитать изображение'));return false;};
 const deleteFromLibrary=(src:string)=>{const index=knownImages.findIndex(image=>image.src===src);if(index>=0){knownImages.splice(index,1);refreshLibrary(value=>value+1);}};
 const save=()=>{if(!draft.images.length){if(attrs.images.length)deleteNode();else setError('Добавьте изображение');return;}updateAttributes(draft);setOpen(false);setPicker(null);};
 const updateItem=(index:number,item:SeoImageItem)=>setDraft(current=>({...current,images:current.images.map((value,i)=>i===index?item:value)}));
 const removeItem=(index:number)=>setDraft(current=>({...current,images:current.images.filter((_,i)=>i!==index)}));
 const gallery=knownImages.filter((image,index,all)=>all.findIndex(other=>other.src===image.src)===index);
 const singleImage=shown.variant==='single'?shown.images[0]:undefined;
 const settingsButton=<button type="button" className="seo-image-preview-settings" aria-label="Настроить слот изображения" onMouseDown={event=>event.preventDefault()} onClick={openPanel}><img src="/icons/image-settings.svg" alt=""/></button>;
 const imageView=(item:SeoImageItem,index:number,withSettings=false)=>{
  const picture=<img src={item.src} alt={item.alt||item.name} title={item.title||undefined} style={shown.variant==='image-text'?undefined:{height:item.height??undefined,width:item.fullWidth?'100%':item.width??undefined}} onLoad={()=>{if(shown.variant==='image-text')scheduleSeoRebalance(editor.view);}}/>;
  const visual=item.href?<a href={item.href} target={item.newTab?'_blank':undefined} rel={[item.newTab?'noopener noreferrer':'',item.nofollow?'nofollow':''].filter(Boolean).join(' ')||undefined} onClick={event=>{if(open)event.preventDefault();}}>{picture}</a>:picture;
  return <figure key={`${index}-${item.src.slice(0,40)}`} className={`seo-image-figure${item.fullWidth?' is-full-width':''}${item.fullWidth&&item.height===null?' has-auto-height':''}`} data-align={item.align}>{withSettings?<div className="seo-image-picture">{visual}{settingsButton}</div>:visual}{item.caption&&<figcaption>{item.caption}</figcaption>}</figure>;
 };
 const panel=<div className={`seo-image-panel seo-image-${draft.variant}`} role="dialog" aria-label={seoVariantLabels[draft.variant]} style={{width:panelWidth}}>
   <h2>{seoVariantLabels[draft.variant]}</h2>
   <div className="seo-image-panel-rows">
    {draft.images.map((item,index)=><div className={`seo-image-upload-row${settings===index?' is-editing':''}`} key={`${index}-${item.src.slice(0,32)}`}>
     <button type="button" className="seo-image-file-name" title={item.name} onClick={()=>{setPicker(current=>current===index?null:index);setError('');}}><img src="/icons/seo-paperclip.svg" alt=""/>{item.name}</button>
     <button type="button" aria-label={`Настроить изображение ${index+1}`} onClick={()=>{setPicker(null);setSettings(index);}}><img src="/icons/seo-setting.svg" alt=""/></button>
     <button type="button" aria-label={`Удалить изображение ${index+1}`} onClick={()=>removeItem(index)}><img src="/icons/seo-delete.svg" alt=""/></button>
    </div>)}
    {draft.images.length<(draft.variant==='grid'?4:1)&&<div className="seo-image-add-row"><button type="button" className="seo-image-add" onClick={()=>{setPicker(current=>current===draft.images.length?null:draft.images.length);setError('');}}><img src="/icons/seo-plus.svg" alt=""/>Добавить изображение</button><button type="button" aria-label="Настроить пустое изображение" disabled><img src="/icons/seo-setting.svg" alt=""/></button><button type="button" aria-label="Удалить пустое изображение" disabled><img src="/icons/seo-delete.svg" alt=""/></button></div>}
   </div>
   {error&&<div className="seo-image-error" role="alert">{error}</div>}
   <div className="seo-image-footer"><Button onClick={cancel}>Отменить</Button><Button type="primary" disabled={!draft.images.length&&!attrs.images.length} onClick={save}>{!draft.images.length&&attrs.images.length?'Удалить слот':'Применить'}</Button></div>
   {picker!==null&&<div className="seo-image-picker" role="dialog" aria-label="Выбор изображения">
    <Upload accept="image/png,image/jpeg,image/webp,image/gif" beforeUpload={upload} showUploadList={false}><button type="button" className="seo-image-picker-upload"><img src="/icons/seo-plus.svg" alt=""/>Загрузить</button></Upload>
    {gallery.map((item,index)=>{const selected=draft.images[picker]?.src===item.src;return <div className={`seo-image-picker-item${selected?' is-selected':''}`} key={`${index}-${item.src.slice(0,20)}`}><img src={item.src} alt={item.name}/><button type="button" className="seo-image-picker-select" aria-label={`Выбрать ${item.name}`} aria-pressed={selected} onClick={()=>choose(item.src,item.name)}/><div className="seo-image-picker-actions"><button type="button" aria-label={`Просмотреть ${item.name}`} onClick={()=>setPreviewImage(item)}><img src="/icons/seo-gallery-eye.svg" alt=""/></button><button type="button" aria-label={`Удалить ${item.name} из библиотеки`} onClick={()=>deleteFromLibrary(item.src)}><img src="/icons/seo-gallery-delete.svg" alt=""/></button></div></div>;})}
   </div>}
  </div>;
 return <NodeViewWrapper as="div" className={`seo-image-slot seo-image-${shown.variant}${open?' is-open':''}`} data-seo-image-slot="">
  <Popover content={panel} open={open} placement="bottomLeft" autoAdjustOverflow arrow={false} getPopupContainer={()=>document.body} overlayClassName="seo-image-popover" trigger={[]}>
  <div ref={previewRef} className="seo-image-preview" aria-label={seoVariantLabels[shown.variant]} data-align={shown.images[0]?.align??'left'} data-full-width={shown.images[0]?.fullWidth?'true':'false'} data-has-below={node.childCount>2&&node.child(2).content.size>0?'true':'false'} data-pending-image={open&&shown.images[0]?.src!==attrs.images[0]?.src?'true':'false'} data-width={shown.images[0]?.width??''} data-height={shown.images[0]?.height??''}>
   {shown.variant==='single'?<div className={`seo-image-single-media${singleImage?.fullWidth?' is-full-width':''}`} data-align={singleImage?.align??'left'} contentEditable={false}>
    {singleImage?imageView(singleImage,0,true):<div className="seo-image-picture"><div className="seo-image-empty"/>{settingsButton}</div>}
   </div>:shown.variant==='image-text'?<>
    <div className="seo-image-preview-images" contentEditable={false}>
     {shown.images.length?imageView(shown.images[0],0,true):<div className="seo-image-picture"><div className="seo-image-empty"/>{settingsButton}</div>}
    </div>
    <NodeViewContent as="div" className="seo-image-editable" aria-label="Текст рядом с изображением"/>
   </>:<>
    {shown.images.length?<div className="seo-image-preview-images" contentEditable={false}>{shown.images.map((item,index)=>imageView(item,index))}</div>:<div className="seo-image-empty" contentEditable={false}/>}
    {settingsButton}
   </>}
  </div>
  </Popover>
  {settings!==null&&draft.images[settings]&&<SeoImageSettings item={draft.images[settings]} variant={draft.variant} onCancel={()=>setSettings(null)} onSave={item=>{updateItem(settings,item);setSettings(null);}}/>}
  <Modal open={previewImage!==null} title={null} footer={null} centered width="fit-content" zIndex={1300} rootClassName="seo-image-lightbox" onCancel={()=>setPreviewImage(null)} destroyOnHidden>
   {previewImage&&<img src={previewImage.src} alt={previewImage.name}/>}
  </Modal>
 </NodeViewWrapper>;
}

export const SeoImageSlot=Node.create({
 name:'seoImageSlot',group:'block',content:'paragraph*',isolating:true,selectable:true,draggable:true,
 addAttributes(){return {
  variant:{default:'single',parseHTML:element=>element.getAttribute('data-variant')??'single'},
  images:{default:[],parseHTML:element=>{try{return JSON.parse(element.getAttribute('data-images')??'[]');}catch{return [];}}},
  text:{default:'',parseHTML:element=>element.getAttribute('data-text')??''},
 };},
 parseHTML(){return [{tag:'div[data-seo-image-slot]',contentElement:'[data-seo-image-content]'}];},
 renderHTML({node}){const attrs=node.attrs as SeoImageSlotData;return ['div',{'data-seo-image-slot':'','data-variant':attrs.variant,'data-images':JSON.stringify(attrs.images),'data-text':attrs.text},...attrs.images.map(item=>{
  const picture=['img',{src:item.src,alt:item.alt||item.name,title:item.title||undefined,width:item.fullWidth?undefined:item.width??undefined,height:item.height??undefined}];
  const visual=item.href?['a',{href:item.href,target:item.newTab?'_blank':undefined,rel:[item.newTab?'noopener noreferrer':'',item.nofollow?'nofollow':''].filter(Boolean).join(' ')||undefined},picture]:picture;
  return ['figure',{'data-align':item.align,'data-full-width':item.fullWidth?'true':undefined},visual,...(item.caption?[['figcaption',{},item.caption]]:[])];
 }),['div',{'data-seo-image-content':''},0]];},
 addNodeView(){return ReactNodeViewRenderer(SeoImageView);},
 addKeyboardShortcuts(){return {Enter:()=>{
  const {$from}=this.editor.state.selection;
  for(let depth=$from.depth;depth>0;depth--)if($from.node(depth).type.name==='seoImageSlot'&&$from.node(depth).attrs.variant==='image-text')return this.editor.commands.setHardBreak();
  return false;
 }};},
 addProseMirrorPlugins(){return [new Plugin({view:view=>{let frame=0;const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>rebalanceSeoImageSlots(view));};schedule();return {update:schedule,destroy:()=>cancelAnimationFrame(frame)};}})];},
});
