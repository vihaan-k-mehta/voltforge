"use client";

import { Zap } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { LoginModal } from "@/components/ui/LoginModal";

export function Navbar() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  return (
    <>
      <header className="h-16 flex items-center justify-between px-6 border-b border-white/10 bg-black/40 backdrop-blur-md z-50">
        <div className="flex items-center gap-2 text-white">
          <Zap className="w-6 h-6 text-blue-500 fill-blue-500" />
          <span className="font-bold text-xl tracking-tight">VoltForge</span>
        </div>
        
        <nav className="flex items-center gap-6">
          <Link href="/" className="text-sm font-medium text-white/80 hover:text-white transition-colors">
            Configurator
          </Link>
          <Link href="/builds" className="text-sm font-medium text-white/80 hover:text-white transition-colors">
            Community Builds
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsLoginOpen(true)}
            className="text-sm font-medium text-white/80 hover:text-white transition-colors"
          >
            Log In
          </button>
          <button 
            onClick={() => setIsLoginOpen(true)}
            className="glass-button px-4 py-2 rounded-md text-sm font-medium text-white"
          >
            Sign Up
          </button>
        </div>
      </header>
      
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </>
  );
}
