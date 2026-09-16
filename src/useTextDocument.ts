import {useEffect} from 'react';
import {Extension, useEditor, useEditorState, type Editor} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {TextStyle, FontFamily, FontSize} from '@tiptap/extension-text-style';
import {defaultFormat, type TextFormat, type FormatTool} from './TextFormatting';

export type InlineFormat = {bold:boolean;italic:boolean;underline:boolean;strike:boolean};
export type InlineTool = keyof InlineFormat|'clear';
export type TextAlignment = 'left'|'center'|'right'|'justify';
export type ListStyle = 'ordered'|'bullet';
export type ParagraphFormat = {alignment:TextAlignment;list?:ListStyle;lineSpacing?:string;paragraphSpacing?:string;canIndent:boolean;canOutdent:boolean};
export type ParagraphTool = 'alignment'|'list'|'indent'|'outdent'|'lineSpacing'|'paragraphSpacing';

const headingSizes:Record<number,string>={1:'38',2:'30',3:'24',4:'20',5:'16'};
const emptyInline:InlineFormat={bold:false,italic:false,underline:false,strike:false};
const emptyParagraph:ParagraphFormat={alignment:'left',canIndent:false,canOutdent:false};
const plainDocument=(value:string)=>({type:'doc',content:value.split('\n').map(text=>({type:'paragraph',content:text?[{type:'text',text}]:[]}))});

const ParagraphStyles=Extension.create({
 name:'paragraphStyles',
 addGlobalAttributes(){return [{types:['paragraph','heading'],attributes:{
  textAlign:{default:null,parseHTML:element=>element.style.textAlign||null,renderHTML:attrs=>attrs.textAlign?{style:`text-align: ${attrs.textAlign}`}:{}} ,
  lineSpacing:{default:null,parseHTML:element=>element.style.lineHeight.replace('px','')||null,renderHTML:attrs=>attrs.lineSpacing?{style:`line-height: ${attrs.lineSpacing}px`}:{}} ,
  paragraphSpacing:{default:null,parseHTML:element=>element.style.marginBottom.replace('px','')||null,renderHTML:attrs=>attrs.paragraphSpacing?{style:`margin-bottom: ${attrs.paragraphSpacing}px`}:{}} ,
 }}];},
});

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
 return {alignment:(one(alignments) as TextAlignment|undefined)??'left',list,lineSpacing:one(lineSpacings),paragraphSpacing:one(paragraphSpacings),canIndent:editor.can().chain().sinkListItem('listItem').run(),canOutdent:listItemDepth>1&&editor.can().chain().liftListItem('listItem').run()};
}

export function useTextDocument({value,onChange,disabled,placeholder,onFocus,onBlur}:{value:string;onChange:(v:string)=>void;disabled:boolean;placeholder:string;onFocus:()=>void;onBlur:()=>void}){
 const editor=useEditor({
  extensions:[StarterKit.configure({heading:{levels:[1,2,3,4,5]},bold:{},italic:{},strike:{},underline:{},code:false,codeBlock:false,blockquote:false,bulletList:{},orderedList:{},listItem:{},listKeymap:{},horizontalRule:false,link:false,trailingNode:false}),ParagraphStyles,TextStyle,FontFamily,FontSize],
  content:plainDocument(value),editable:!disabled,
  editorProps:{attributes:state=>({role:'textbox','aria-label':'Текст редактора','aria-multiline':'true','aria-disabled':String(disabled),'data-placeholder':placeholder,'data-empty':String(!state.doc.textContent)})},
  onUpdate:({editor})=>onChange(editor.getText({blockSeparator:'\n'})),onFocus,onBlur,
 });
 const format=useEditorState({editor,selector:({editor})=>editor?selectionFormat(editor):defaultFormat})??defaultFormat;
 const inline=useEditorState({editor,selector:({editor})=>editor?({bold:editor.isActive('bold'),italic:editor.isActive('italic'),underline:editor.isActive('underline'),strike:editor.isActive('strike')}):emptyInline})??emptyInline;
 const paragraph=useEditorState({editor,selector:({editor})=>editor?selectionParagraph(editor):emptyParagraph})??emptyParagraph;
 useEffect(()=>{if(editor&&editor.isEditable===disabled)editor.setEditable(!disabled,false);},[editor,disabled]);
 useEffect(()=>{if(editor&&value!==editor.getText({blockSeparator:'\n'}))editor.commands.setContent(plainDocument(value),{emitUpdate:false});},[editor,value]);
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
  if(tool==='clear')command.unsetAllMarks().run();
 };
 const applyParagraph=(tool:ParagraphTool,value?:string)=>{
  if(!editor||disabled)return;
  if(tool==='list'){if(value==='ordered')editor.chain().focus().toggleOrderedList().run();if(value==='bullet')editor.chain().focus().toggleBulletList().run();return;}
  if(tool==='indent'){editor.chain().focus().sinkListItem('listItem').run();return;}
  if(tool==='outdent'){if(paragraph.canOutdent)editor.chain().focus().liftListItem('listItem').run();return;}
  const attrs=tool==='alignment'?{textAlign:value}:tool==='lineSpacing'?{lineSpacing:value}:tool==='paragraphSpacing'?{paragraphSpacing:value}:{};
  editor.chain().focus().updateAttributes('paragraph',attrs).updateAttributes('heading',attrs).run();
 };
 return {editor,format,inline,paragraph,apply,applyInline,applyParagraph};
}
