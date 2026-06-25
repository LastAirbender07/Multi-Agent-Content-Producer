"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FlaskConical,
  Image as ImageIcon,
  Newspaper,
  Zap,
  MessageSquare,
  ChevronRight,
  Menu,
  PencilRuler,
  BarChart2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const nav = [
  { href: "/pipeline",   icon: Zap,         label: "Pipeline"   },
  { href: "/research",   icon: FlaskConical, label: "Research"   },
  { href: "/images",    icon: ImageIcon,     label: "Images"    },
  { href: "/news",      icon: Newspaper,     label: "News"      },
  { href: "/chat",      icon: MessageSquare, label: "Chat"      },
  { href: "/editor",     icon: PencilRuler,  label: "Editor"     },
  { href: "/analytics",  icon: BarChart2,    label: "Analytics"  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("sidebar_expanded");
    if (saved !== null) setExpanded(saved === "true");
  }, []);

  function toggle() {
    setExpanded(v => {
      localStorage.setItem("sidebar_expanded", String(!v));
      return !v;
    });
  }

  return (
    <motion.aside
      animate={{ width: expanded ? 256 : 80 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="shrink-0 flex flex-col bg-black border-r border-zinc-900/50 h-screen sticky top-0 z-40 overflow-hidden"
    >
      {/* Header — hamburger always visible, brand slides in on expand */}
      <div className="flex items-center min-h-18 shrink-0 border-b border-zinc-900/50">
        {/* Hamburger — fixed 80px width, always centred in collapsed state */}
        <button
          onClick={toggle}
          aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
          className="w-20 h-18 flex items-center justify-center shrink-0 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60 transition-all"
        >
          <Menu size={18} />
        </button>

        {/* Brand — fades in when expanded */}
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              key="brand"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-3 min-w-0 pr-4"
            >
              <div className="w-8 h-8 rounded-xl bg-linear-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/20 shrink-0">
                <Zap size={16} className="text-white fill-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-black text-white tracking-tighter leading-none">CONTENT</h1>
                <p className="text-[10px] font-black text-violet-500 uppercase tracking-widest mt-0.5">Studio AI</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-2 space-y-1">
        {nav.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              title={!expanded ? label : undefined}
              className={`relative flex items-center gap-3 px-3 py-3 rounded-2xl text-sm font-bold transition-all duration-200 group overflow-hidden ${
                active ? "text-white" : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900/50"
              }`}
            >
              {active && (
                <motion.div
                  layoutId="active-nav"
                  className="absolute inset-0 bg-linear-to-r from-violet-600 to-violet-500 -z-10 shadow-lg shadow-violet-500/20"
                />
              )}
              <Icon
                size={20}
                className={`shrink-0 transition-transform group-hover:scale-110 ${
                  active ? "text-white" : "text-zinc-500"
                }`}
              />
              <AnimatePresence initial={false}>
                {expanded && (
                  <motion.span
                    key="label"
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -6 }}
                    transition={{ duration: 0.12 }}
                    className="flex-1 truncate"
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
              {active && expanded && (
                <ChevronRight size={14} className="shrink-0 text-white/50" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 mt-auto border-t border-zinc-900/50">
        <div className="rounded-2xl bg-zinc-900/30 border border-zinc-800/30 p-3">
          <AnimatePresence initial={false}>
            {expanded && (
              <motion.p
                key="version"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest"
              >
                v1.0.0 Standard
              </motion.p>
            )}
          </AnimatePresence>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <AnimatePresence initial={false}>
              {expanded && (
                <motion.p
                  key="status"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.1 }}
                  className="text-[10px] font-bold text-emerald-500/80 uppercase tracking-widest"
                >
                  Active Session
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.aside>
  );
}
