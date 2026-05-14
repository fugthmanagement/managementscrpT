"use client";
import { useState, useEffect } from "react";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("calls");
  const [chatInput, setChatInput] = useState("");
  const [chatLog, setChatLog] = useState([{ role: "ai", text: "Hello. I am your Executive AI Consultant. How can I help you manage your business today?" }]);
  const [isTyping, setIsTyping] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="min-h-screen bg-black p-10">Loading Secure Dashboard...</div>;

  const sendToGemini = async () => {
    if (!chatInput) return;
    const newChat = [...chatLog, { role: "user", text: chatInput }];
    setChatLog(newChat);
    setChatInput("");
    setIsTyping(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({ prompt: chatInput })
      });
      const data = await res.json();
      setChatLog([...newChat, { role: "ai", text: data.reply }]);
    } catch (e) {
      setChatLog([...newChat, { role: "ai", text: "Error connecting to AI network." }]);
    }
    setIsTyping(false);
  };

  return (
    <div className="flex h-screen bg-black text-white font-sans">
      <div className="w-64 bg-zinc-950 border-r border-zinc-800 p-6 flex flex-col gap-3">
        <h1 className="text-xl font-bold mb-8 tracking-wider">FUGTH<br/><span className="text-zinc-500 text-xs">MANAGEMENT</span></h1>
        <button onClick={() => setActiveTab("calls")} className={`text-left p-3 rounded-lg text-sm font-semibold transition-colors ${activeTab === "calls" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:bg-zinc-900"}`}>🎙️ Call Intelligence</button>
        <button onClick={() => setActiveTab("marketing")} className={`text-left p-3 rounded-lg text-sm font-semibold transition-colors ${activeTab === "marketing" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:bg-zinc-900"}`}>📈 Marketing & Leads</button>
        <button onClick={() => setActiveTab("ai")} className={`text-left p-3 rounded-lg text-sm font-semibold transition-colors ${activeTab === "ai" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:bg-zinc-900"}`}>🤖 Executive AI</button>
      </div>

      <div className="flex-1 p-10 overflow-y-auto">
        {activeTab === "calls" && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Recent AI Calls</h2>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800">
                  <tr><th className="p-4">Date</th><th className="p-4">Caller ID</th><th className="p-4">Outcome</th><th className="p-4">Action</th></tr>
                </thead>
                <tbody>
                  <tr className="border-b border-zinc-800">
                    <td className="p-4">Today, 2:30 PM</td><td className="p-4 font-bold text-white">(512) 555-0199</td>
                    <td className="p-4"><span className="bg-green-900/50 text-green-400 border border-green-800 px-2 py-1 rounded text-xs">Appointment Booked</span></td>
                    <td className="p-4"><button className="text-blue-400 hover:text-blue-300 underline text-xs">Listen & Rate ⭐⭐⭐⭐⭐</button></td>
                  </tr>
                  <tr>
                    <td className="p-4">Today, 11:15 AM</td><td className="p-4 font-bold text-white">(415) 555-0122</td>
                    <td className="p-4"><span className="bg-zinc-800 text-zinc-300 border border-zinc-700 px-2 py-1 rounded text-xs">Quote Requested</span></td>
                    <td className="p-4"><button className="text-blue-400 hover:text-blue-300 underline text-xs">Listen & Rate ⭐⭐⭐⭐</button></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "marketing" && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Marketing Engine</h2>
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-xl shadow-xl">
                <p className="text-zinc-400 text-sm mb-2 font-semibold">Emails Sent This Week</p>
                <p className="text-5xl font-bold text-white">1,402</p>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-xl shadow-xl">
                <p className="text-zinc-400 text-sm mb-2 font-semibold">New Local Leads Scraped</p>
                <p className="text-5xl font-bold text-green-400">+ 84</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "ai" && (
          <div className="h-full flex flex-col">
            <h2 className="text-2xl font-bold mb-4">Executive AI Consultant</h2>
            <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col shadow-xl">
              <div className="flex-1 overflow-y-auto mb-4 space-y-4">
                {chatLog.map((msg, idx) => (
                  <div key={idx} className={`p-4 rounded-xl text-sm max-w-[80%] ${msg.role === "ai" ? "bg-zinc-800 text-zinc-200 self-start" : "bg-white text-black self-end ml-auto font-medium"}`}>
                    {msg.text}
                  </div>
                ))}
                {isTyping && <div className="p-4 rounded-xl bg-zinc-800 text-zinc-400 text-sm self-start animate-pulse">Consulting data...</div>}
              </div>
              <div className="flex gap-3">
                <input 
                  type="text" 
                  value={chatInput} 
                  onChange={e => setChatInput(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && sendToGemini()}
                  placeholder="Ask about your operations, pricing, or leads..." 
                  className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg p-4 text-white text-sm focus:outline-none focus:border-zinc-500"
                />
                <button onClick={sendToGemini} className="bg-white text-black font-bold px-8 rounded-lg hover:bg-zinc-200 transition-colors">Send</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}