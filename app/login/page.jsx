"use client";
import { useState } from "react";
import { auth } from "../../lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!auth) {
       setError("System loading. Try again in a moment.");
       return;
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
      window.location.href = "/dashboard";
    } catch (err) {
      setError("Invalid email or password.");
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-xl p-8 shadow-2xl">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">Fugth Management</h2>
        {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
        <form onSubmit={handleLogin} className="space-y-4">
          <input type="email" placeholder="Email Address" className="w-full bg-zinc-950 border border-zinc-800 p-3 rounded-lg text-white focus:outline-none focus:border-zinc-500" onChange={e => setEmail(e.target.value)} />
          <input type="password" placeholder="Password" className="w-full bg-zinc-950 border border-zinc-800 p-3 rounded-lg text-white focus:outline-none focus:border-zinc-500" onChange={e => setPassword(e.target.value)} />
          <button type="submit" className="w-full bg-white text-black font-bold p-3 rounded-lg hover:bg-zinc-200">Secure Login</button>
        </form>
      </div>
    </div>
  );
}