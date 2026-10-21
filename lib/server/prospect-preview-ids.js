import {createHash} from "node:crypto";
export const isPreviewId=id=>/^[a-f0-9]{24}$/.test(String(id||""));
export const isProspectId=id=>/^[A-Za-z0-9_-]{8,128}$/.test(String(id||""));
export function stableProspectPreviewId(uid,prospectId){
 if(!isProspectId(uid)||!isProspectId(prospectId))throw Error("Invalid owner or prospect");
 return createHash("sha256").update("fugth-prospect-preview-v1:"+uid+":"+prospectId).digest("hex").slice(0,24);
}
export const previewSiteUrl=id=>isPreviewId(id)?
 "https://www.fugthmanagement.space/demo/site/"+id:"";
export const previewOwnedBy=(record,uid,prospectId)=>
 Boolean(record&&record.founderId===uid&&record.prospectId===prospectId);
