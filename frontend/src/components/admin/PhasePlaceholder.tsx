import React from "react";
import Link from "next/link";
import { ArrowLeft, Clock } from "lucide-react";

interface PhasePlaceholderProps {
  title: string;
  phase: string;
  description: string;
  scopeNote: string;
}

export function PhasePlaceholder({
  title,
  phase,
  description,
  scopeNote,
}: PhasePlaceholderProps) {
  return (
    <div className="max-w-2xl mx-auto py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-6">
        <Clock className="w-8 h-8" />
      </div>
      <div className="inline-block px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300 uppercase tracking-wider mb-4">
        {phase}
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-white mb-2">{title}</h1>
      <p className="text-sm text-slate-400 mb-6">{description}</p>
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 text-left mb-8 space-y-2">
        <p className="font-semibold text-slate-200">Phase Isolation Note:</p>
        <p className="text-slate-400">{scopeNote}</p>
      </div>
      <Link
        href="/admin"
        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Dashboard</span>
      </Link>
    </div>
  );
}
