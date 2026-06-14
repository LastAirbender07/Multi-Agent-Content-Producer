"use client";
import { User, Bot } from "lucide-react";
import { motion } from "framer-motion";

interface Message {
  role: string;
  content: string;
}

export function MessageBubble({ msg, index }: { msg: Message; index: number }) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={`flex gap-4 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
        isUser ? "bg-violet-600 text-white" : "bg-zinc-900 border border-zinc-800 text-violet-400"
      }`}>
        {isUser ? <User size={18} /> : <Bot size={18} />}
      </div>
      <div className={`max-w-[80%] rounded-4xl px-6 py-4 text-sm leading-relaxed shadow-sm ${
        isUser
          ? "bg-violet-600 text-white rounded-tr-none"
          : "bg-zinc-900/50 backdrop-blur-md border border-zinc-800/50 text-zinc-200 rounded-tl-none"
      }`}>
        <pre className="whitespace-pre-wrap font-sans leading-relaxed">{msg.content}</pre>
      </div>
    </motion.div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex gap-4 flex-row">
      <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 bg-zinc-900 border border-zinc-800 text-violet-400">
        <Bot size={18} />
      </div>
      <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800/50 rounded-4xl rounded-tl-none px-6 py-4 flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            animate={{ scale: [1, 1.2, 1], opacity: [0.4, 1, 0.4] }}
            transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
            className="w-1.5 h-1.5 bg-violet-500 rounded-full"
          />
        ))}
      </div>
    </div>
  );
}
