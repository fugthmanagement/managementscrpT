"use client";
import {useCallback,useEffect,useRef,useState} from "react";

/**
 * Top navigation behavior shared by the public site and signed-in workspace.
 * The large brand header remains in normal document flow; only the tabs stick.
 * After the header scrolls away, idle tabs tuck up into a visible grab handle.
 * Movement, scrolling upward, touching the top edge, focus, and hover reveal them.
 */
export function useSmartNavigation({compactAt=125,idleMs=1900}={}){
 const [compact,setCompact]=useState(false);
 const [visible,setVisible]=useState(true);
 const [hovered,setHovered]=useState(false);
 const hover=useRef(false);
 const lastScroll=useRef(0);
 const idleTimer=useRef(null);
 const lastMovement=useRef(0);
 const show=useCallback(()=>{setVisible(true);},[]);
 const arm=useCallback(()=>{
  if(idleTimer.current!==null)window.clearTimeout(idleTimer.current);
  idleTimer.current=window.setTimeout(()=>{
   if(window.scrollY>compactAt&&document.visibilityState==="visible"&&!hover.current&&
     !document.querySelector(":focus-visible"))setVisible(false);
  },idleMs);
 },[compactAt,idleMs]);
 useEffect(()=>{
  lastScroll.current=window.scrollY;
  setCompact(window.scrollY>compactAt);
  const scrolling=()=>{
   const top=Math.max(0,window.scrollY),delta=top-lastScroll.current;
   lastScroll.current=top;
   setCompact(top>compactAt);
   if(top<=compactAt){setVisible(true);}
   else if(Math.abs(delta)>2){show();arm();}
  };
  const moving=e=>{
   const now=Date.now();
   if(now-lastMovement.current<115)return;
   lastMovement.current=now;
   if(e.clientY<100&&window.scrollY>compactAt){show();arm();}
  };
  const touching=e=>{
   if(e.touches?.[0]?.clientY<110){show();arm();}
  };
  const focused=e=>{
   if(e.target?.closest?.("[data-smart-navigation]")){show();arm();}
  };
  const visibleAgain=()=>{if(document.visibilityState==="visible"){show();arm();}};
  window.addEventListener("scroll",scrolling,{passive:true});
  window.addEventListener("pointermove",moving,{passive:true});
  window.addEventListener("touchstart",touching,{passive:true});
  document.addEventListener("focusin",focused);
  document.addEventListener("visibilitychange",visibleAgain);
  if(window.scrollY>compactAt)arm();
  return ()=>{
   window.removeEventListener("scroll",scrolling);
   window.removeEventListener("pointermove",moving);
   window.removeEventListener("touchstart",touching);
   document.removeEventListener("focusin",focused);
   document.removeEventListener("visibilitychange",visibleAgain);
   if(idleTimer.current!==null)window.clearTimeout(idleTimer.current);
  };
 },[compactAt,arm,show]);
 const interact=useCallback(()=>{show();arm()},[show,arm]);
 const enter=useCallback(()=>{hover.current=true;setHovered(true);show();if(idleTimer.current!==null)window.clearTimeout(idleTimer.current)},[show]);
 const leave=useCallback(()=>{hover.current=false;setHovered(false);if(window.scrollY>compactAt)arm()},[compactAt,arm]);
 return {compact,visible:visible||hovered,reveal:interact,onEnter:enter,onLeave:leave};
}
