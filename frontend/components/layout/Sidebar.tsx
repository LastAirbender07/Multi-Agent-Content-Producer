"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FlaskConical,
  Image as ImageIcon,
  Newspaper,
  Zap,
  MessageSquare,
  ChevronRight
} from "lucide-react";
import { motion } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const nav = [
  { href: "/pipeline", icon: Zap, label: "Pipeline" },
  { href: "/research", icon: FlaskConical, label: "Research" },
  { href: "/images", icon: ImageIcon, label: "Images" },
  { href: "/news", icon: Newspaper, label: "News" },
  { href: "/chat", icon: MessageSquare, label: "Chat" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-20 md:w-64 shrink-0 flex flex-col bg-black border-r border-zinc-900/50 h-screen sticky top-0 z-40 overflow-hidden">
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Zap size={22} className="text-white fill-white" />
          </div>
          <div className="hidden md:block">
            <h1 className="text-sm font-black text-white tracking-tighter leading-none">CONTENT</h1>
            <p className="text-[10px] font-black text-violet-500 uppercase tracking-widest mt-0.5">Studio AI</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-2">
        {nav.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all duration-300 group overflow-hidden",
                active
                  ? "text-white"
                  : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900/50"
              )}
            >
              {active && (
                <motion.div
                  layoutId="active-nav"
                  className="absolute inset-0 bg-gradient-to-r from-violet-600 to-violet-500 -z-10 shadow-lg shadow-violet-500/20"
                />
              )}
              <Icon size={20} className={cn("transition-transform group-hover:scale-110", active ? "text-white" : "text-zinc-500")} />
              <span className="hidden md:block flex-1">{label}</span>
              {active && <ChevronRight size={14} className="hidden md:block text-white/50" />}
            </Link>
          );
        })}
      </nav>

      <div className="p-6 mt-auto border-t border-zinc-900/50">
        <div className="p-4 rounded-2xl bg-zinc-900/30 border border-zinc-800/30">
          <p className="hidden md:block text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-relaxed">
            v1.0.0 Standard
          </p>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <p className="text-[10px] font-bold text-emerald-500/80 uppercase tracking-widest">Active Session</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
