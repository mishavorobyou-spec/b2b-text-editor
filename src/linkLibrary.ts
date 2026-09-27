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

export function updateLinkEntry(entry:LinkEntry){const entries=readLibrary();writeLibrary(entries.some(item=>item.id===entry.id)?entries.map(item=>item.id===entry.id?entry:item):[...entries,entry]);}
export function removeLinkEntry(id:string){writeLibrary(readLibrary().filter(item=>item.id!==id));}

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
 const add=useCallback(updateLinkEntry,[]);
 const update=useCallback(updateLinkEntry,[]);
 const remove=useCallback(removeLinkEntry,[]);
 return {entries,add,update,remove};
}
