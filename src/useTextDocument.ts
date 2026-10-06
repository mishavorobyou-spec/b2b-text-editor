import {useEffect,useRef} from 'react';
import {Extension, useEditor, useEditorState, type Editor} from '@tiptap/react';
import {NodeSelection, Plugin, PluginKey, TextSelection} from '@tiptap/pm/state';
import {Decoration, DecorationSet} from '@tiptap/pm/view';
import StarterKit from '@tiptap/starter-kit';
import {TableKit, TableView} from '@tiptap/extension-table';
import {TextStyle, FontFamily, FontSize, Color} from '@tiptap/extension-text-style';
import {defaultFormat, type TextFormat, type FormatTool} from './TextFormatting';
import {AnchorTag} from './AnchorTag';
import {EditorImage, type EditorImageData} from './EditorImage';
import {EditorVideo, type EditorVideoData} from './EditorVideo';
import {CenterImageWrap, alignMediaAtBlockStart, convertImageToCenterWrap, convertVideoToCenterWrap} from './CenterImageWrap';
import {SeoImageSlot, type SeoImageVariant} from './SeoImageSlot';

export type InlineFormat = {bold:boolean;italic:boolean;underline:boolean;strike:boolean;code:boolean};
export type InlineTool = keyof InlineFormat|'clear';
export type TextAlignment = 'left'|'center'|'right'|'justify';
export type ListStyle = 'ordered'|'bullet';
export type ParagraphFormat = {alignment:TextAlignment;list?:ListStyle;lineSpacing?:string;paragraphSpacing?:string;canShiftRight:boolean;canShiftLeft:boolean};
export type ParagraphTool = 'alignment'|'list'|'shiftRight'|'shiftLeft'|'lineSpacing'|'paragraphSpacing';
export type LinkSelection={text:string;hasSelection:boolean};
export type SearchOptions={query:string;caseSensitive:boolean;regularExpression:boolean;ignoreDiacritics:boolean};
export type SearchSnapshot={matches:number;activeIndex:number;error?:string};
export type EditingAction='copy'|'paste'|'cut'|'undo'|'redo';
export type TableAction='addRowBefore'|'addRowAfter'|'addColumnBefore'|'addColumnAfter'|'mergeCells'|'splitCell'|'deleteRow'|'deleteColumn'|'removeBorder'|'deleteTable';
export type TableState={active:boolean;borderless:boolean;canMerge:boolean;canSplit:boolean;canDeleteRow:boolean;canDeleteColumn:boolean;canDeleteTable:boolean};
export type ColorTool='color'|'highlight'|'cellColor';
export type ColorState={color:string|null;highlight:string|null;cellColor:string|null;inCell:boolean};
type SearchMatch={from:number;to:number};

const searchKey=new PluginKey<DecorationSet>('editorSearchHighlight');
const SearchHighlight=Extension.create({
 name:'searchHighlight',
 addProseMirrorPlugins(){return [new Plugin<DecorationSet>({key:searchKey,state:{
  init:()=>DecorationSet.empty,
  apply(transaction,current){
   const next=transaction.getMeta(searchKey) as {matches:SearchMatch[];activeIndex:number}|undefined;
   if(next)return DecorationSet.create(transaction.doc,next.matches.map((match,index)=>Decoration.inline(match.from,match.to,{class:index===next.activeIndex?'search-match search-match-active':'search-match'})));
   return current.map(transaction.mapping,transaction.doc);
  },
 },props:{decorations:state=>searchKey.getState(state)??DecorationSet.empty}})];},
});

const headingSizes:Record<number,string>={1:'38',2:'30',3:'24',4:'20',5:'16'};
const emptyInline:InlineFormat={bold:false,italic:false,underline:false,strike:false,code:false};
const emptyParagraph:ParagraphFormat={alignment:'left',canShiftRight:false,canShiftLeft:false};
const plainDocument=(value:string)=>({type:'doc',content:value.split('\n').map(text=>({type:'paragraph',content:text?[{type:'text',text}]:[]}))});

function foldText(value:string,options:SearchOptions){
 let result='',offset=0;
 const starts:number[]=[],ends:number[]=[];
 for(const character of value){
  const source=options.ignoreDiacritics?character.normalize('NFD').replace(/[\u0300-\u036f]/g,''):character;
  const folded=options.caseSensitive?source:source.toLocaleLowerCase();
  for(let index=0;index<folded.length;index++){starts.push(offset);ends.push(offset+character.length);}
  result+=folded;offset+=character.length;
 }
 return {text:result,starts,ends};
}

function findMatches(editor:Editor,options:SearchOptions):{matches:SearchMatch[];error?:string}{
 if(!options.query)return {matches:[]};
 const foldedQuery=foldText(options.query,options).text;
 let expression:RegExp;
 try{expression=new RegExp(options.regularExpression?foldedQuery:foldedQuery.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g');}
 catch{return {matches:[],error:'Некорректное регулярное выражение'};}
 const matches:SearchMatch[]=[];
 editor.state.doc.descendants((node,pos)=>{
  if(!node.isTextblock)return;
  let blockText='';
  const starts:number[]=[],ends:number[]=[];
  node.descendants((child,childPos)=>{
   if(child.isText&&child.text){
    let offset=0;
    for(const character of child.text){
     blockText+=character;
     for(let index=0;index<character.length;index++){starts.push(pos+1+childPos+offset);ends.push(pos+1+childPos+offset+character.length);}
     offset+=character.length;
    }
   }else if(child.isInline&&child.isAtom){
    blockText+='\uFFFC';starts.push(pos+1+childPos);ends.push(pos+1+childPos+child.nodeSize);
   }
  });
  const folded=foldText(blockText,options);
  expression.lastIndex=0;
  let match:RegExpExecArray|null;
  while((match=expression.exec(folded.text))){
   if(match[0].length){
    const start=folded.starts[match.index],end=folded.ends[match.index+match[0].length-1];
    if(start!==undefined&&end!==undefined&&starts[start]!==undefined&&ends[end-1]!==undefined)matches.push({from:starts[start],to:ends[end-1]});
   }
   if(!match[0].length)expression.lastIndex++;
  }
  return false;
 });
 return {matches};
}

function showMatches(editor:Editor,matches:SearchMatch[],activeIndex:number){editor.view.dispatch(editor.state.tr.setMeta(searchKey,{matches,activeIndex}));}

const ParagraphStyles=Extension.create({
 name:'paragraphStyles',
 addGlobalAttributes(){return [{types:['paragraph','heading'],attributes:{
  textAlign:{default:null,parseHTML:element=>element.style.textAlign||null,renderHTML:attrs=>attrs.textAlign?{style:`text-align: ${attrs.textAlign}`}:{}} ,
  lineSpacing:{default:null,parseHTML:element=>element.style.lineHeight.replace('px','')||null,renderHTML:attrs=>attrs.lineSpacing?{style:`line-height: ${attrs.lineSpacing}px`}:{}} ,
  paragraphSpacing:{default:null,parseHTML:element=>element.style.marginBottom.replace('px','')||null,renderHTML:attrs=>attrs.paragraphSpacing?{style:`margin-bottom: ${attrs.paragraphSpacing}px`}:{}} ,
 }}];},
});

const TableAttributes=Extension.create({
 name:'tableAttributes',
 addGlobalAttributes(){return [{types:['table'],attributes:{
  borderless:{default:false,parseHTML:element=>element.getAttribute('data-borderless')==='true',renderHTML:attrs=>attrs.borderless?{'data-borderless':'true'}:{}},
 }}];},
});

class BorderAwareTableView extends TableView {
 update(node: Parameters<TableView['update']>[0]) {
  if(!super.update(node))return false;
  if(node.attrs.borderless)this.table.setAttribute('data-borderless','true');
  else this.table.removeAttribute('data-borderless');
  return true;
 }
}

const ColorAttributes=Extension.create({
 name:'editorColorAttributes',
 addGlobalAttributes(){return [{types:['tableCell','tableHeader'],attributes:{backgroundColor:{default:null,parseHTML:element=>element.style.backgroundColor||null,renderHTML:attrs=>attrs.backgroundColor?{style:`background-color: ${attrs.backgroundColor}`}:{}}}}];},
});

const UnderlineColor=Extension.create({
 name:'editorUnderlineColor',
 addGlobalAttributes(){return [{types:['underline'],attributes:{underlineColor:{
  default:null,
  parseHTML:element=>element.style.textDecorationColor||null,
  renderHTML:attrs=>attrs.underlineColor?{style:`color: ${attrs.underlineColor}; text-decoration-color: ${attrs.underlineColor}`}:{},
 }}}];},
});

const MediaBoundaryParagraphs=Extension.create({
 name:'mediaBoundaryParagraphs',
 addProseMirrorPlugins(){return [new Plugin({
  appendTransaction(transactions,_oldState,newState){
   if(!transactions.some(transaction=>transaction.docChanged))return null;
   const paragraph=newState.schema.nodes.paragraph;
   if(!paragraph)return null;
   const blocks=['table','centerImageWrap','seoImageSlot'];
   const isMediaBlock=(node:typeof newState.doc.firstChild)=>Boolean(node&&(blocks.includes(node.type.name)||(node.type.name==='paragraph'&&node.childCount===1&&['editorImage','editorVideo'].includes(node.firstChild?.type.name??''))));
   const doc=newState.doc;
   const insertions:number[]=[];
   let position=0;
   for(let index=0;index<doc.childCount;index++){
    const node=doc.child(index);
    if(isMediaBlock(node)){
     if(index===0)insertions.push(position);
     if(index===doc.childCount-1||isMediaBlock(doc.child(index+1)))insertions.push(position+node.nodeSize);
    }
    position+=node.nodeSize;
   }
   if(!insertions.length)return null;
   const transaction=newState.tr;
   for(const at of insertions.reverse())transaction.insert(at,paragraph.create());
   return transaction;
  },
  props:{handleDOMEvents:{click(view,event){
   const paragraph=(event.target as Element|null)?.closest('p');
   if(!paragraph||paragraph.parentElement!==view.dom||!paragraph.previousElementSibling?.classList.contains('tableWrapper'))return false;
   event.preventDefault();
   view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc,view.posAtDOM(paragraph,0))));
   view.focus();
   return true;
  }}},
 })];},
});

function linkSelection(editor:Editor):LinkSelection{
 const {selection,doc}=editor.state;
 return {hasSelection:!selection.empty,text:selection.empty?'':doc.textBetween(selection.from,selection.to,' ')};
}

function replaceLinkHref(editor:Editor,oldHref:string,newHref:string){
 const linkType=editor.state.schema.marks.link;
 if(!linkType||oldHref===newHref)return;
 let transaction=editor.state.tr;
 editor.state.doc.descendants((node,pos)=>{
  if(!node.isText)return;
  const mark=node.marks.find(item=>item.type===linkType&&item.attrs.href===oldHref);
  if(!mark)return;
  transaction=transaction.removeMark(pos,pos+node.nodeSize,mark).addMark(pos,pos+node.nodeSize,linkType.create({...mark.attrs,href:newHref,target:newHref.startsWith('#')?null:'_blank'}));
 });
 if(transaction.docChanged)editor.view.dispatch(transaction);
}

function removeAnchorTarget(editor:Editor,anchorId:string){
 let transaction=editor.state.tr;
 editor.state.doc.descendants((node,pos)=>{
  if(node.type.name==='anchorTag'&&node.attrs.anchorId===anchorId)transaction=transaction.delete(transaction.mapping.map(pos),transaction.mapping.map(pos+node.nodeSize));
 });
 if(transaction.docChanged)editor.view.dispatch(transaction);
}

function renameAnchorTarget(editor:Editor,anchorId:string,label:string){
 let transaction=editor.state.tr;
 editor.state.doc.descendants((node,pos)=>{if(node.type.name==='anchorTag'&&node.attrs.anchorId===anchorId)transaction=transaction.setNodeMarkup(pos,undefined,{...node.attrs,label});});
 if(transaction.docChanged)editor.view.dispatch(transaction);
}

function selectionFormat(editor:Editor):TextFormat{
 const {selection,doc,storedMarks}=editor.state;
 const types=new Set<string>(),fonts=new Set<string>(),sizes=new Set<string>();
 const add=(marks:typeof storedMarks,level?:number)=>{const style=marks?.find(m=>m.type.name==='textStyle')?.attrs;fonts.add(style?.fontFamily??'Roboto');sizes.add(style?.fontSize?.replace('px','')??(level?headingSizes[level]:'14'));};
 if(selection.empty){const block=selection.$from.parent;types.add(block.type.name==='heading'?`Heading ${block.attrs.level}`:'Text');add(storedMarks??selection.$from.marks(),block.attrs.level);}
 else doc.nodesBetween(selection.from,selection.to,(node,pos,parent)=>{
  if(node.isTextblock&&pos<selection.to&&pos+node.nodeSize-1>selection.from){types.add(node.type.name==='heading'?`Heading ${node.attrs.level}`:'Text');if(!node.content.size)add([],node.attrs.level);}
  if(node.isText)add(node.marks,parent?.attrs.level);
 });
 const one=(values:Set<string>)=>values.size===1?[...values][0]:undefined;
 return {textType:one(types),font:one(fonts),fontSize:one(sizes)};
}

function selectionParagraph(editor:Editor):ParagraphFormat{
 const {selection,doc}=editor.state;
 const alignments=new Set<TextAlignment>(),lineSpacings=new Set<string>(),paragraphSpacings=new Set<string>();
 const add=(attrs:Record<string,unknown>)=>{
  alignments.add((attrs.textAlign as TextAlignment|null)??'left');
  lineSpacings.add(String(attrs.lineSpacing??''));
  paragraphSpacings.add(String(attrs.paragraphSpacing??''));
 };
 if(selection.empty)add(selection.$from.parent.attrs);
 else doc.nodesBetween(selection.from,selection.to,(node,pos)=>{if(node.isTextblock&&pos<selection.to&&pos+node.nodeSize-1>selection.from)add(node.attrs);});
 const one=(values:Set<string>)=>values.size===1?[...values][0]||undefined:undefined;
 const list:ListStyle|undefined=editor.isActive('orderedList')?'ordered':editor.isActive('bulletList')?'bullet':undefined;
 const listItemDepth=Array.from({length:selection.$from.depth},(_,index)=>selection.$from.node(index+1).type.name).filter(name=>name==='listItem').length;
 return {alignment:(one(alignments) as TextAlignment|undefined)??'left',list,lineSpacing:one(lineSpacings),paragraphSpacing:one(paragraphSpacings),canShiftRight:editor.can().chain().sinkListItem('listItem').run(),canShiftLeft:listItemDepth>1&&editor.can().chain().liftListItem('listItem').run()};
}

export function useTextDocument({value,onChange,disabled,placeholder,onFocus,onBlur}:{value:string;onChange:(v:string)=>void;disabled:boolean;placeholder:string;onFocus:()=>void;onBlur:()=>void}){
 const lastEditorText=useRef(value);
 const editor=useEditor({
  extensions:[StarterKit.configure({heading:{levels:[1,2,3,4,5]},bold:{},italic:{},strike:{},underline:{},code:{},codeBlock:false,blockquote:false,bulletList:{},orderedList:{},listItem:{},listKeymap:{},horizontalRule:false,link:{openOnClick:false,autolink:false,linkOnPaste:false,HTMLAttributes:{rel:'noopener noreferrer'}},trailingNode:false}),ParagraphStyles,SearchHighlight,AnchorTag,EditorImage,EditorVideo,CenterImageWrap,SeoImageSlot,TextStyle,FontFamily,FontSize,Color,UnderlineColor,TableKit.configure({table:{resizable:true,renderWrapper:true,cellMinWidth:120,View:BorderAwareTableView}}),TableAttributes,ColorAttributes,MediaBoundaryParagraphs],
  content:plainDocument(value),editable:!disabled,
  editorProps:{attributes:state=>{
   const first=state.doc.firstChild;
   const isEmpty=state.doc.childCount===1&&Boolean(first?.isTextblock)&&first?.content.size===0;
   return {role:'textbox','aria-label':'Текст редактора','aria-multiline':'true','aria-disabled':String(disabled),'data-placeholder':placeholder,'data-empty':String(isEmpty)};
  }},
  onUpdate:({editor})=>{const text=editor.getText({blockSeparator:'\n'});lastEditorText.current=text;onChange(text);},onFocus,onBlur,
 });
 const format=useEditorState({editor,selector:({editor})=>editor?selectionFormat(editor):defaultFormat})??defaultFormat;
 const inline=useEditorState({editor,selector:({editor})=>editor?({bold:editor.isActive('bold'),italic:editor.isActive('italic'),underline:editor.isActive('underline'),strike:editor.isActive('strike'),code:editor.isActive('code')}):emptyInline})??emptyInline;
 const paragraph=useEditorState({editor,selector:({editor})=>editor?selectionParagraph(editor):emptyParagraph})??emptyParagraph;
 const link=useEditorState({editor,selector:({editor})=>editor?linkSelection(editor):{text:'',hasSelection:false}})??{text:'',hasSelection:false};
 const table=useEditorState({editor,selector:({editor}):TableState=>editor?({active:editor.isActive('table'),borderless:Boolean(editor.getAttributes('table').borderless),canMerge:editor.can().mergeCells(),canSplit:editor.can().splitCell(),canDeleteRow:editor.can().deleteRow(),canDeleteColumn:editor.can().deleteColumn(),canDeleteTable:editor.can().deleteTable()}):({active:false,borderless:false,canMerge:false,canSplit:false,canDeleteRow:false,canDeleteColumn:false,canDeleteTable:false})})??{active:false,borderless:false,canMerge:false,canSplit:false,canDeleteRow:false,canDeleteColumn:false,canDeleteTable:false};
 const colors=useEditorState({editor,selector:({editor}):ColorState=>{
  if(!editor)return {color:null,highlight:null,cellColor:null,inCell:false};
  const inCell=editor.isActive('tableCell')||editor.isActive('tableHeader');
  const cell=editor.getAttributes(editor.isActive('tableHeader')?'tableHeader':'tableCell');
  const style=editor.getAttributes('textStyle');
  return {color:style.color??null,highlight:editor.getAttributes('underline').underlineColor??null,cellColor:inCell?cell.backgroundColor??null:null,inCell};
 }})??{color:null,highlight:null,cellColor:null,inCell:false};
 const selectedImage=useEditorState({editor,selector:({editor}):EditorImageData|null=>{
  if(!editor||!(editor.state.selection instanceof NodeSelection)||!['editorImage','centerImageWrap'].includes(editor.state.selection.node.type.name)||editor.state.selection.node.attrs.kind==='video')return null;
  return editor.state.selection.node.attrs as EditorImageData;
 }})??null;
 const selectedVideo=useEditorState({editor,selector:({editor}):EditorVideoData|null=>{
  if(!editor||!(editor.state.selection instanceof NodeSelection)||!['editorVideo','centerImageWrap'].includes(editor.state.selection.node.type.name)||editor.state.selection.node.attrs.kind!=='video')return null;
  return editor.state.selection.node.attrs as EditorVideoData;
 }})??null;
 useEffect(()=>{if(editor&&editor.isEditable===disabled)editor.setEditable(!disabled,false);},[editor,disabled]);
 useEffect(()=>{
  if(!editor||value===lastEditorText.current)return;
  if(value!==editor.getText({blockSeparator:'\n'}))editor.commands.setContent(plainDocument(value),{emitUpdate:false});
  lastEditorText.current=value;
 },[editor,value]);
 const apply=(tool:FormatTool,value:string)=>{
  if(!editor||disabled)return;
  const command=editor.chain().focus();
  if(tool==='textType'){if(value==='Text')command.setParagraph().run();else command.setHeading({level:Number(value.slice(-1)) as 1|2|3|4|5}).run();}
  if(tool==='font')command.setFontFamily(value).run();
  if(tool==='fontSize')command.setFontSize(`${value}px`).run();
 };
 const applyInline=(tool:InlineTool)=>{
  if(!editor||disabled)return;
  const command=editor.chain().focus();
  if(tool==='bold')command.toggleBold().run();
  if(tool==='italic')command.toggleItalic().run();
  if(tool==='underline')command.toggleUnderline().run();
  if(tool==='strike')command.toggleStrike().run();
  if(tool==='code')command.toggleCode().run();
  if(tool==='clear')command.unsetAllMarks().run();
 };
 const insertSymbol=(symbol:string)=>{
  if(!editor||disabled||!symbol)return false;
  return editor.chain().focus().insertContent(symbol).run();
 };
 const applyColor=(tool:ColorTool,color:string|null)=>{
  if(!editor||disabled)return false;
  const command=editor.chain().focus();
  if(tool==='color')return color?command.setColor(color).run():command.unsetColor().run();
  if(tool==='highlight'){
   if(color)return command.setMark('underline',{underlineColor:color}).run();
   if(!editor.isActive('underline'))return false;
   return editor.state.selection.empty?command.setMark('underline',{underlineColor:null}).run():command.updateAttributes('underline',{underlineColor:null}).run();
  }
  if(!colors.inCell)return false;
  return command.setCellAttribute('backgroundColor',color).run();
 };
 const applyParagraph=(tool:ParagraphTool,value?:string)=>{
  if(!editor||disabled)return;
  if(tool==='list'){if(value==='ordered')editor.chain().focus().toggleOrderedList().run();if(value==='bullet')editor.chain().focus().toggleBulletList().run();return;}
  if(tool==='shiftRight'){editor.chain().focus().sinkListItem('listItem').run();return;}
  if(tool==='shiftLeft'){if(paragraph.canShiftLeft)editor.chain().focus().liftListItem('listItem').run();return;}
  const attrs=tool==='alignment'?{textAlign:value}:tool==='lineSpacing'?{lineSpacing:value}:tool==='paragraphSpacing'?{paragraphSpacing:value}:{};
  editor.chain().focus().updateAttributes('paragraph',attrs).updateAttributes('heading',attrs).run();
 };
 const applyLink=(href:string)=>{
  if(!editor||disabled||editor.state.selection.empty)return false;
  return editor.chain().focus().extendMarkRange('link').setLink({href,target:href.startsWith('#')?null:'_blank',rel:'noopener noreferrer'}).run();
 };
 const createAnchor=(anchorId:string,label:string)=>{
  if(!editor||disabled)return false;
  const type=editor.state.schema.nodes.anchorTag;
  if(!type)return false;
  const cursor=editor.state.selection.head;
  let existing:{pos:number;size:number}|undefined;
  editor.state.doc.descendants((node,pos)=>{if(!existing&&node.type===type&&node.attrs.anchorId===anchorId)existing={pos,size:node.nodeSize};});
  let transaction=editor.state.tr;
  if(existing)transaction=transaction.delete(existing.pos,existing.pos+existing.size);
  const insertAt=transaction.mapping.map(cursor,1);
  transaction=transaction.insert(insertAt,type.create({anchorId,label}));
  editor.view.dispatch(transaction);
  editor.commands.focus(insertAt+1);
  return true;
 };
 const deleteAnchor=(anchorId:string)=>{if(editor&&!disabled)removeAnchorTarget(editor,anchorId);};
 const renameAnchor=(anchorId:string,label:string)=>{if(editor&&!disabled)renameAnchorTarget(editor,anchorId,label);};
 const updateLinks=(oldHref:string,newHref:string)=>{if(editor&&!disabled)replaceLinkHref(editor,oldHref,newHref);};
 const insertTable=(columns:number,rows:number,withHeaderRow:boolean)=>{
  if(!editor||disabled)return false;
  return editor.chain().focus().insertTable({cols:columns,rows:rows+(withHeaderRow?1:0),withHeaderRow}).run();
 };
 const applyTable=(action:TableAction)=>{
  if(!editor||disabled)return false;
  const command=editor.chain().focus();
  if(action==='addRowBefore')return command.addRowBefore().run();
  if(action==='addRowAfter')return command.addRowAfter().run();
  if(action==='addColumnBefore')return command.addColumnBefore().run();
  if(action==='addColumnAfter')return command.addColumnAfter().run();
  if(action==='mergeCells')return command.mergeCells().run();
  if(action==='splitCell')return command.splitCell().run();
  if(action==='deleteRow')return command.deleteRow().run();
  if(action==='deleteColumn')return command.deleteColumn().run();
  if(action==='removeBorder')return command.updateAttributes('table',{borderless:true}).run();
  if(action==='deleteTable')return command.deleteTable().run();
  return false;
 };
 const insertImage=(data:EditorImageData)=>{
  if(!editor||disabled)return false;
  if(!editor.chain().focus().insertContent({type:'editorImage',attrs:data}).run())return false;
  if(data.layout==='wrap'){
   const selection=editor.state.selection;
   const before=selection.$from.nodeBefore;
   if(before?.type.name==='editorImage'){
    const position=()=>selection.from-before.nodeSize;
    if(data.align==='center')convertImageToCenterWrap(editor,position,data);
    else alignMediaAtBlockStart(editor,position,data,'editorImage');
   }
  }
  return true;
 };
 const insertVideo=(data:EditorVideoData)=>{
  if(!editor||disabled)return false;
  if(!editor.chain().focus().insertContent({type:'editorVideo',attrs:data}).run())return false;
  if(data.layout==='wrap'){
   const selection=editor.state.selection;
   const before=selection.$from.nodeBefore;
   if(before?.type.name==='editorVideo'){
    const position=()=>selection.from-before.nodeSize;
    if(data.align==='center')convertVideoToCenterWrap(editor,position,data);
    else alignMediaAtBlockStart(editor,position,data,'editorVideo');
   }
  }
  return true;
 };
 const insertSeoImageSlot=(variant:SeoImageVariant)=>{
  if(!editor||disabled)return false;
  const content={type:'seoImageSlot',attrs:{variant,images:[],text:''},...(variant==='image-text'?{content:[{type:'paragraph'},{type:'paragraph'},{type:'paragraph'}]}:{})};
  const selection=editor.state.selection;
  for(let depth=selection.$from.depth;depth>0;depth--){
   if(selection.$from.node(depth).type.name==='seoImageSlot'){
    return editor.chain().focus().insertContentAt(selection.$from.after(depth),content).run();
   }
  }
  return selection instanceof NodeSelection
   ?editor.chain().focus().insertContentAt(selection.to,content).run()
   :editor.chain().focus().insertContent(content).run();
 };
 const search=(options:SearchOptions,requestedIndex=0):SearchSnapshot=>{
  if(!editor)return {matches:0,activeIndex:0};
  const result=findMatches(editor,options);
  const activeIndex=result.matches.length?((requestedIndex%result.matches.length)+result.matches.length)%result.matches.length:0;
  showMatches(editor,result.matches,activeIndex);
  return {matches:result.matches.length,activeIndex,error:result.error};
 };
 const replaceSearch=(options:SearchOptions,replacement:string,activeIndex:number,all=false):SearchSnapshot=>{
  if(!editor||disabled)return {matches:0,activeIndex:0};
  const found=findMatches(editor,options);
  if(found.error||!found.matches.length){showMatches(editor,[],0);return {matches:0,activeIndex:0,error:found.error};}
  const targets=all?[...found.matches].reverse():[found.matches[Math.min(activeIndex,found.matches.length-1)]];
  let transaction=editor.state.tr;
  for(const match of targets)transaction=transaction.insertText(replacement,match.from,match.to);
  editor.view.dispatch(transaction);
  return search(options,all?0:activeIndex);
 };
 const clearSearch=()=>{if(editor)showMatches(editor,[],0);};
 const editingAction=async(action:EditingAction)=>{
  if(!editor||disabled)return false;
  if(action==='undo')return editor.chain().focus().undo().run();
  if(action==='redo')return editor.chain().focus().redo().run();
  if(action==='paste'){
   try{const text=await navigator.clipboard.readText();return text?editor.chain().focus().insertContent(text).run():false;}catch{return false;}
  }
  const {from,to,empty}=editor.state.selection;
  if(empty)return false;
  const text=editor.state.doc.textBetween(from,to,'\n');
  try{
   await navigator.clipboard.writeText(text);
   if(action==='cut')editor.chain().focus().deleteSelection().run();
   return true;
  }catch{
   editor.commands.focus();
   return document.execCommand(action);
  }
 };
 return {editor,format,inline,paragraph,link,table,colors,selectedImage,selectedVideo,apply,applyInline,insertSymbol,applyColor,applyParagraph,applyLink,createAnchor,deleteAnchor,renameAnchor,updateLinks,insertTable,applyTable,insertImage,insertVideo,insertSeoImageSlot,search,replaceSearch,clearSearch,editingAction};
}
