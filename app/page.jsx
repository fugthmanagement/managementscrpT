import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-4">
      <h1 className="text-4xl font-bold mb-4">Fugth Management</h1>
      <p className="text-zinc-400 mb-8">AI That Sounds Like a Human.</p>
      <Link href="/login" className="bg-white text-black px-6 py-3 rounded-lg font-bold hover:bg-zinc-200">
        Client Login
      </Link>
    </div>
  );
}