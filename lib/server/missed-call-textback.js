import {createHash} from "node:crypto";
export * from "../missed-call-textback.js";
export const phoneHash=(phone,secret)=>createHash("sha256").update(secret+"|"+phone).digest("hex").slice(0,32);
