"use client";
import {useEffect,useState} from "react";
import {doc,getDoc} from "firebase/firestore";
import {db} from "../../../../lib/firebase";
import SiteChat from "../../../../components/site-chat";

export default function EmbeddedBusinessChat({params}){
 const uid=params?.uid||"";
 const [state,setState]=useState({loading:true,site:null,error:""});
 useEffect(()=>{
  let alive=true;
  if(!db||!/^[A-Za-z0-9_-]{8,128}$/.test(uid)){setState({loading:false,site:null,error:"Business chat is not available."});return;}
  getDoc(doc(db,"publicSites",uid)).then(snap=>{
   if(!alive)return;
   const site=snap.data();
   if(!snap.exists()||!site||!["published","preview"].includes(site.visibility))
    setState({loading:false,site:null,error:"This business's chat is not available yet."});
   else setState({loading:false,site,error:""});
  }).catch(()=>{if(alive)setState({loading:false,site:null,error:"Could not load business chat."});});
  return()=>{alive=false;};
 },[uid]);
 return <main className="h-screen w-screen overflow-hidden bg-transparent">
  {state.site?<SiteChat site={state.site}/>:!state.loading&&<p className="absolute bottom-6 right-5 rounded-xl bg-white p-3 text-xs text-[#637664] shadow-lg">{state.error}</p>}
 </main>;
}
