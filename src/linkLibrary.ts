import {useCallback, useEffect, useState} from 'react';

export type UrlLinkEntry={id:string;type:'url';label:string;href:string};
export type AnchorEntry={id:string;type:'anchor';label:string;href:string};
export type LinkEntry=UrlLinkEntry|AnchorEntry;

const storageKey='b2b-text-editor-link-library-v2';
const changeEvent='b2b-text-editor-link-library-change';

function readLibrary():LinkEntry[]{
 try{
  const value=localStorage.getItem(storageKey);
  if(!value)return [];
  const parsed=JSON.parse(value) as unknown;
  if(!Array.isArray(parsed))return [];
  return parsed.filter((item):item is LinkEntry=>Boolean(item&&typeof item==='object'&&'id' in item&&'type' in item&&'label' in item&&'href' in item));
 }catch{return [];}
}

function writeLibrary(entries:LinkEntry[]){
 localStorage.setItem(storageKey,JSON.stringify(entries));
 window.dispatchEvent(new Event(changeEvent));
}

export function createEntryId(prefix:string){
 const suffix=globalThis.crypto?.randomUUID?.()??`${Date.now()}-${Math.random().toString(36).slice(2)}`;
 return `${prefix}-${suffix}`;
}

export function useLinkLibrary(){
 const [entries,setEntries]=useState<LinkEntry[]>(()=>readLibrary());
 useEffect(()=>{
  const sync=()=>setEntries(readLibrary());
  window.addEventListener('storage',sync);
  window.addEventListener(changeEvent,sync);
  return()=>{window.removeEventListener('storage',sync);window.removeEventListener(changeEvent,sync);};
 },[]);
 const add=useCallback((entry:LinkEntry)=>writeLibrary([...readLibrary().filter(item=>item.id!==entry.id),entry]),[]);
 const update=useCallback((entry:LinkEntry)=>writeLibrary(readLibrary().map(item=>item.id===entry.id?entry:item)),[]);
 const remove=useCallback((id:string)=>writeLibrary(readLibrary().filter(item=>item.id!==id)),[]);
 return {entries,add,update,remove};
}
