import Link from "next/link";
import { Zap } from "lucide-react";

export default function BuildsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-center px-6">
      <Zap className="w-12 h-12 text-blue-500 fill-blue-500 mb-6" />
      <h1 className="text-4xl font-bold text-white tracking-tight mb-3">Community Builds</h1>
      <p className="text-zinc-400 text-lg max-w-md mb-8">
        Share and discover electric bike builds from the VoltForge community. Coming soon.
      </p>
      <Link
        href="/"
        className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
      >
        Build yours now
      </Link>
    </div>
  );
}
