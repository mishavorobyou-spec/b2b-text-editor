import {useEffect} from 'react';
import {useEditor, useEditorState, type Editor} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {TextStyle, FontFamily, FontSize} from '@tiptap/extension-text-style';
import {defaultFormat, type TextFormat, type FormatTool} from './TextFormatting';

export type InlineFormat = {bold:boolean;italic:boolean;underline:boolean;strike:boolean};
export type InlineTool = keyof InlineFormat|'clear';

const headingSizes:Record<number,string>={1:'38',2:'30',3:'24',4:'20',5:'16'};
const emptyInline:InlineFormat={bold:false,italic:false,underline:false,strike:false};
const plainDocument=(value:string)=>({type:'doc',content:value.split('\n').map(text=>({type:'paragraph',content:text?[{type:'text',text}]:[]}))});

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

export function useTextDocument({value,onChange,disabled,placeholder,onFocus,onBlur}:{value:string;onChange:(v:string)=>void;disabled:boolean;placeholder:string;onFocus:()=>void;onBlur:()=>void}){
 const editor=useEditor({
  extensions:[StarterKit.configure({heading:{levels:[1,2,3,4,5]},bold:{},italic:{},strike:{},underline:{},code:false,codeBlock:false,blockquote:false,bulletList:false,orderedList:false,listItem:false,listKeymap:false,horizontalRule:false,link:false,trailingNode:false}),TextStyle,FontFamily,FontSize],
  content:plainDocument(value),editable:!disabled,
  editorProps:{attributes:state=>({role:'textbox','aria-label':'Текст редактора','aria-multiline':'true','aria-disabled':String(disabled),'data-placeholder':placeholder,'data-empty':String(!state.doc.textContent)})},
  onUpdate:({editor})=>onChange(editor.getText({blockSeparator:'\n'})),onFocus,onBlur,
 });
 const format=useEditorState({editor,selector:({editor})=>editor?selectionFormat(editor):defaultFormat})??defaultFormat;
 const inline=useEditorState({editor,selector:({editor})=>editor?({bold:editor.isActive('bold'),italic:editor.isActive('italic'),underline:editor.isActive('underline'),strike:editor.isActive('strike')}):emptyInline})??emptyInline;
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
 return {editor,format,inline,apply,applyInline};
}
