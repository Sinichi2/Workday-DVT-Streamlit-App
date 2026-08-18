import { HTMLAttributes } from "react";

/** Surface shell used by every dashboard panel. Padding is left to the caller
 *  because some cards (e.g. the divided stat list) pad their rows, not the box. */
export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-2xl border border-border bg-surface ${className}`}
      {...props}
    />
  );
}
