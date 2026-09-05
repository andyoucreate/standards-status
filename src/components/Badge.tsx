import type { ReactNode } from "react";
import type { Tone } from "../standards/options";
import { toneClasses } from "./classes";

export function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className={`rounded-lg px-2 py-0.5 text-xs font-medium ${toneClasses(tone).badge}`}>
      {children}
    </span>
  );
}
