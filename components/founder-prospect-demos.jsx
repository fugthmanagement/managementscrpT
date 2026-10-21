"use client";
import { useEffect, useState } from "react";
import { auth, db } from "../lib/firebase";
import {collection,limit,onSnapshot,orderBy,query} from "firebase/firestore";
import FounderDemoAgentSettings from "./founder-demo-agent-settings";
const kinds = [
  ["electrician", "⚡ Electrician"],
  ["mechanic", "🔧 Mechanic"],
  ["plumber", "💧 Plumber"],
];
const initial = {
  kind: "electrician",
  name: "",
  phone: "",
  email: "",
  hours: "72",
  assignedUid: "",
  prospectId: "",
};
export default function FounderProspectDemos({user,onOpenSiteMaker}) {
  const [prospects,setProspects]=useState([]);
  const [listStatus,setListStatus]=useState("loading"),[listError,setListError]=useState(""),[listHint,setListHint]=useState(""),[listWarning,setListWarning]=useState("");
  const [form, setForm] = useState(initial),
    [rows, setRows] = useState([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const edit = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setMessage("");
  };
  async function request(path, options = {}) {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw Error("Sign in to your founder account.");
    const response = await fetch(path, {
        ...options,
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }),
      data = await response.json();
    if (!response.ok) {
      const err=Error(data.error||"Request failed");
      err.hint=data.hint||"";
      err.code=data.code||"";
      throw err;
    }
    return data;
  }
  async function refresh() {
    setListStatus("loading");
    setListError("");
    setListHint("");
    try {
      const data=await request("/api/dev/prospect-demos");
      if(data.loaded===false)throw Error(data.error||"Demo list could not be loaded.");
      setRows(Array.isArray(data.demos)?data.demos:[]);
      setListStatus("loaded");
      setListWarning(data.warning||(data.partial?"Some newer previews may not be included in the first 100 returned results.":""));
    }catch(e){
      // A failed read is NOT proof that the user's saved previews are missing.
      setListStatus("error");
      setListError(e.message||"Could not read existing website previews.");
      setListHint(e.hint||"");
      setListWarning("");
    }
  }
  useEffect(() => {
    refresh();
  }, []);
  useEffect(()=>{
    if(!db||!user?.uid)return;
    return onSnapshot(query(collection(db,"users",user.uid,"campaigns"),orderBy("createdAt","desc"),limit(800)),
      snap=>setProspects(snap.docs.map(d=>({id:d.id,...d.data()})).filter(d=>d.type==="cold_call_prospect")));
  },[user?.uid]);
  function selectProspect(id){
    const chosen=prospects.find(p=>p.id===id);
    setForm(current=>({...current,prospectId:id,
      ...(chosen?{name:chosen.businessName||"",phone:chosen.phone||"",email:chosen.email||""}:{})}));
  }

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = await request("/api/dev/prospect-demos", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setMessage("Saved preview: " + data.url);
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function change(id, update) {
    try {
      await request("/api/demo/" + id, {
        method: "PATCH",
        body: JSON.stringify(update),
      });
      await refresh();
    } catch (e) {
      setError(e.message);
    }
  }
  const absolute = (id) => "https://www.fugthmanagement.space/demo/site/" + id;
  return (
    <section className="space-y-7 text-[#26342d]">
      <div className="rounded-3xl border border-[#d8dfd6] bg-white p-5 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-widest text-[#78927a]">
          FUGTH founder studio
        </p>
        <h3 className="mt-2 text-3xl font-bold">Saved website previews</h3>
        <p className="mt-3 text-sm leading-7 text-[#65756b]">
          All three demo types are generated from your existing Site Studio
          engine. Each link is a saved Firebase snapshot, with an independent
          expiration and optional customer-account assignment.
        </p>
        <form onSubmit={save} className="mt-7 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-bold">
            Industry
            <select
              className="mt-2 w-full rounded-xl border p-3"
              value={form.kind}
              onChange={(e) => edit("kind", e.target.value)}
            >
              {kinds.map(([k, t]) => (
                <option key={k} value={k}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-bold">
            Link this new website to a saved prospect (optional)
            <select className="mt-2 w-full rounded-xl border p-3" value={form.prospectId} onChange={e=>selectProspect(e.target.value)}>
              <option value="">Not linked — create a standalone preview</option>
              {prospects.map(p=><option key={p.id} value={p.id}>{p.businessName} · {p.phone||"No phone"}</option>)}
            </select>
          </label>
          <label className="text-sm font-bold">
            Business name
            <input
              required
              minLength={2}
              maxLength={80}
              className="mt-2 w-full rounded-xl border p-3"
              value={form.name}
              onChange={(e) => edit("name", e.target.value)}
              placeholder="CHAMPS ELECTRIC INC"
            />
          </label>
          <label className="text-sm font-bold">
            Public phone (optional)
            <input
              className="mt-2 w-full rounded-xl border p-3"
              value={form.phone}
              onChange={(e) => edit("phone", e.target.value)}
            />
          </label>
          <label className="text-sm font-bold">
            Public email (optional)
            <input
              type="email"
              className="mt-2 w-full rounded-xl border p-3"
              value={form.email}
              onChange={(e) => edit("email", e.target.value)}
            />
          </label>
          <label className="text-sm font-bold">
            Expires after (hours, 0 = never)
            <input
              type="number"
              min="0"
              max="2160"
              className="mt-2 w-full rounded-xl border p-3"
              value={form.hours}
              onChange={(e) => edit("hours", e.target.value)}
            />
          </label>
          <label className="text-sm font-bold">
            Assign existing account UID (optional)
            <input
              className="mt-2 w-full rounded-xl border p-3"
              value={form.assignedUid}
              onChange={(e) => edit("assignedUid", e.target.value)}
              placeholder="Firebase customer UID"
            />
          </label>
          {form.prospectId&&onOpenSiteMaker&&<button type="button" onClick={()=>{const p=prospects.find(x=>x.id===form.prospectId);if(p)onOpenSiteMaker(p)}} className="rounded-xl border border-[#b7d9e8] bg-[#edfaff] px-4 py-3 text-xs font-black text-[#205a77]">✦ Open selected business in the full Site Maker ↗</button>}
                    {form.prospectId&&<p className="text-xs leading-5 text-[#668271] sm:col-span-2">This preview will automatically appear as the assigned website in the selected prospect's Text workbench. The business name must match the prospect.</p>}
          <button
            disabled={busy}
            className="rounded-xl bg-[#255447] px-6 py-4 font-bold text-white sm:col-span-2"
          >
            {busy ? "Saving…" : "Generate & save Firestore link"}
          </button>
        </form>
        {listStatus==="error"&&<div role="alert" className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
         <strong>Saved preview directory is temporarily unavailable.</strong>
         <p className="mt-2">{listError}</p>
         {listHint&&<p className="mt-2 text-xs leading-6">{listHint}</p>}
         <p className="mt-2 text-xs font-semibold">This does not mean any of your Firestore previews were deleted. The form can still create a new preview when Firestore writes are working.</p>
         <button type="button" className="mt-3 rounded-lg border border-amber-400 bg-white px-4 py-2 text-xs font-bold" onClick={refresh}>Retry saved preview list</button>
        </div>}
        {error && (
          <p role="alert" className="mt-4 text-sm text-red-700">
            {error}
          </p>
        )}
        {message && (
          <p className="mt-4 break-all text-sm text-green-800">{message}</p>
        )}
      </div>
      <div className="rounded-3xl border border-[#d8dfd6] bg-white p-5 sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xl font-bold">Saved links</h3>
          <button
            onClick={refresh}
            className="rounded-lg border px-4 py-2 text-sm"
          >
            Refresh
          </button>
        </div>
        <div className="mt-5 grid gap-4">
          {listStatus==="loading"&&<p className="text-sm text-[#6e7a71]">Checking your private Firestore demo directory…</p>}
          {listStatus==="error"&&rows.length===0&&<p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">Cannot confirm saved links while the directory request is failing. Use Retry above; existing links may still work.</p>}
          {listStatus==="loaded"&&rows.length===0&&<p className="text-sm text-[#6e7a71]">No saved previews were found for this signed-in founder account.</p>}
          {listWarning&&<p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs">{listWarning}</p>}
          {rows.map((r) => (
            <article
              key={r.id}
              className="rounded-xl border border-[#dde5da] p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong>{r.name}</strong>
                <span className="text-xs">
                  {r.revoked
                    ? "Revoked"
                    : r.expiresAt && new Date(r.expiresAt) < new Date()
                      ? "Expired"
                      : "Active"}{" "}
                  · {r.kind}
                </span>
              </div>
              <p className="mt-2 break-all font-mono text-xs text-[#576a5d]">
                {absolute(r.id)}
              </p>
              <p className="mt-2 text-xs text-[#6a776c]">
                {r.expiresAt
                  ? "Expires " + new Date(r.expiresAt).toLocaleString()
                  : "No expiration"}
                {r.assignedUid
                  ? " · Assigned: " + r.assignedUid
                  : " · Unassigned"}
              </p>
              {r.prospectId&&onOpenSiteMaker&&<button type="button" onClick={()=>{const p=prospects.find(x=>x.id===r.prospectId);if(p)onOpenSiteMaker(p)}} className="mt-3 rounded-xl border border-[#b7d9e8] bg-[#edfaff] px-4 py-3 text-xs font-black text-[#205a77]">Customize saved design in Site Maker ↗</button>}
              <FounderDemoAgentSettings key={"ai-"+r.id} demo={r} onSaved={refresh}/>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  className="rounded-lg bg-[#255447] px-4 py-2 text-xs font-bold text-white"
                  onClick={() => navigator.clipboard.writeText(absolute(r.id))}
                >
                  Copy link
                </button>
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  href={absolute(r.id)}
                  className="rounded-lg border px-4 py-2 text-xs font-bold"
                >
                  View
                </a>
                <button
                  onClick={() => change(r.id, { hours: 72, revoked: false })}
                  className="rounded-lg border px-4 py-2 text-xs"
                >
                  Renew 72h
                </button>
                <button
                  onClick={() => change(r.id, { revoked: !r.revoked })}
                  className="rounded-lg border px-4 py-2 text-xs"
                >
                  {r.revoked ? "Restore" : "Revoke"}
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
      <div className="rounded-2xl bg-[#f8f4e9] p-5 text-sm">
        <h3 className="font-bold">Cold email & SMS preparation</h3>
        <p className="mt-2 leading-6">
          Copy a saved preview URL into your individually reviewed outreach.
          Record consent, opt-outs, contact source and follow-up status in your
          existing prospect list. Automated bulk sends are not enabled. For
          commercial email use accurate sender identity, a physical postal
          address and working opt-out; for SMS confirm consent and honor STOP
          requests.
        </p>
      </div>
    </section>
  );
}
