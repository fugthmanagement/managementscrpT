"use client";
import {useEffect,useState} from "react";
/** One selected prospect across Cold Calling, SMS, Email and Website Maker.
 * Only identity is stored locally; the actual business record is read fresh
 * from its founder-scoped Firestore campaigns collection.
 */
const ID=/^[A-Za-z0-9_-]{8,128}$/;
const KEY=uid=>"fugth:active-prospect:"+uid;
const EVENT="fugth:active-prospect";
export const validProspectId=id=>ID.test(String(id||""));
export function readActiveProspect(uid){
 if(!validProspectId(uid)||typeof window==="undefined")return "";
 try{const id=localStorage.getItem(KEY(uid))||"";return validProspectId(id)?id:""}catch{return ""}
}
export function rememberActiveProspect(uid,id){
 if(!validProspectId(uid)||typeof window==="undefined")return false;
 if(id!==""&&!validProspectId(id))return false;
 try{
  if(readActiveProspect(uid)===id)return true;
  if(id)localStorage.setItem(KEY(uid),id);else localStorage.removeItem(KEY(uid));
  window.dispatchEvent(new CustomEvent(EVENT,{detail:{uid,id}}));
  return true;
 }catch{return false}
}
export function useActiveProspect(uid){
 const [activeId,setActiveId]=useState("");
 useEffect(()=>{
  if(!validProspectId(uid))return;
  setActiveId(readActiveProspect(uid));
  const onCustom=e=>{if(e.detail?.uid===uid)setActiveId(e.detail.id||"")};
  const onStorage=e=>{if(e.key===KEY(uid))setActiveId(validProspectId(e.newValue)?e.newValue:"")};
  window.addEventListener(EVENT,onCustom);window.addEventListener("storage",onStorage);
  return()=>{window.removeEventListener(EVENT,onCustom);window.removeEventListener("storage",onStorage)};
 },[uid]);
 return [activeId,id=>rememberActiveProspect(uid,id)];
}
