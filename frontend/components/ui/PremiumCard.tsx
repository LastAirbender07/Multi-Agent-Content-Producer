"use client";
import { motion } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Props {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function PremiumCard({ children, className, delay = 0 }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={cn(
        "bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/50 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:border-zinc-700/50 transition-all duration-300",
        className
      )}
    >
      {children}
    </motion.div>
  );
}
