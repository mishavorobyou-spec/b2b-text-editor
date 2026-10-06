import React, {useEffect, useRef, useState} from 'react';
import {PauseCircleOutlined, PlayCircleOutlined, SoundOutlined, MutedOutlined} from '@ant-design/icons';

export type VideoSource={kind:'youtube'|'vimeo'|'file';id:string;url:string};

export function parseVideoSource(value:string):VideoSource|null{
 let url:URL;
 try{url=new URL(value.trim());}catch{return null;}
 if(url.protocol!=='http:'&&url.protocol!=='https:')return null;
 const host=url.hostname.toLowerCase().replace(/^www\./,'');
 let id='';
 if(host==='youtu.be')id=url.pathname.split('/')[1]??'';
 else if(host==='youtube.com'||host==='m.youtube.com'||host==='youtube-nocookie.com')id=url.pathname.startsWith('/embed/')||url.pathname.startsWith('/shorts/')?url.pathname.split('/')[2]??'':url.searchParams.get('v')??'';
 if(/^[\w-]{11}$/.test(id))return {kind:'youtube',id,url:url.href};
 if(host==='vimeo.com'||host==='player.vimeo.com'){
  id=url.pathname.split('/').find(part=>/^\d+$/.test(part))??'';
  if(id)return {kind:'vimeo',id,url:url.href};
 }
 if(/\.(mp4|webm|ogv|ogg)$/i.test(url.pathname))return {kind:'file',id:'',url:url.href};
 return null;
}

export function VideoPlayer({src,muted,onMutedChange}:{src:string;muted:boolean;onMutedChange?:(value:boolean)=>void}){
 const source=parseVideoSource(src);
 const [active,setActive]=useState(false);
 const [playing,setPlaying]=useState(false);
 const [localMuted,setLocalMuted]=useState(muted);
 const [posterFailed,setPosterFailed]=useState(false);
 const videoRef=useRef<HTMLVideoElement>(null);
 const frameRef=useRef<HTMLIFrameElement>(null);
 useEffect(()=>{setActive(false);setPlaying(false);setPosterFailed(false);},[src]);
 useEffect(()=>setLocalMuted(muted),[muted]);
 const send=(method:string)=>{
  if(!source||source.kind==='file'||!frameRef.current?.contentWindow)return;
  if(source.kind==='youtube')frameRef.current.contentWindow.postMessage(JSON.stringify({event:'command',func:method,args:[]}), 'https://www.youtube.com');
  else frameRef.current.contentWindow.postMessage({method:method==='playVideo'?'play':method==='pauseVideo'?'pause':'setVolume',...(method==='mute'||method==='unMute'?{value:method==='mute'?0:1}:{})},'https://player.vimeo.com');
 };
 const togglePlay=()=>{
  if(!source)return;
  if(source.kind==='file'){
   const video=videoRef.current;
   if(!video)return;
   if(video.paused)void video.play().then(()=>setPlaying(true)).catch(()=>setPlaying(false));
   else{video.pause();setPlaying(false);}
  }else if(!active){setActive(true);setPlaying(true);}
  else{send(playing?'pauseVideo':'playVideo');setPlaying(!playing);}
 };
 const toggleSound=()=>{
  const next=!localMuted;setLocalMuted(next);onMutedChange?.(next);
  if(source?.kind==='file'&&videoRef.current)videoRef.current.muted=next;
  else if(active)send(next?'mute':'unMute');
 };
 const embed=source?.kind==='youtube'?`https://www.youtube.com/embed/${source.id}?autoplay=1&playsinline=1&enablejsapi=1&controls=0&mute=${localMuted?1:0}&origin=${encodeURIComponent(window.location.origin)}`:source?.kind==='vimeo'?`https://player.vimeo.com/video/${source.id}?autoplay=1&muted=${localMuted?1:0}&controls=0`:'';
 return <div className="video-player" data-video-provider={source?.kind??'invalid'}>
  {source?.kind==='file'?<video ref={videoRef} src={source.url} muted={localMuted} preload="metadata" playsInline onEnded={()=>setPlaying(false)} onPause={()=>setPlaying(false)} onPlay={()=>setPlaying(true)}/>:active&&source?<iframe ref={frameRef} src={embed} title="Видео" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen onLoad={()=>{if(playing)send('playVideo');}}/>:source?.kind==='youtube'&&!posterFailed?<img className="video-poster" src={`https://i.ytimg.com/vi/${source.id}/hqdefault.jpg`} alt="Превью видео" onError={()=>setPosterFailed(true)}/>:<div className="video-poster-fallback" aria-hidden="true">{source?.kind==='vimeo'?'Vimeo':'Видео'}</div>}
  <div className="video-player-controls" contentEditable={false}>
   <button type="button" aria-label={playing?'Приостановить видео':'Воспроизвести видео'} onMouseDown={event=>event.preventDefault()} onClick={togglePlay}>{playing?<PauseCircleOutlined/>:<PlayCircleOutlined/>}</button>
   <button type="button" aria-label={localMuted?'Включить звук':'Выключить звук'} onMouseDown={event=>event.preventDefault()} onClick={toggleSound}>{localMuted?<MutedOutlined/>:<SoundOutlined/>}</button>
  </div>
 </div>;
}
