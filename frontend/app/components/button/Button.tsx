import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "ai" | "outline";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-foreground hover:bg-accent-hover",
  ai: "bg-accent-subtle text-accent-strong hover:brightness-95",
  outline: "border border-border bg-surface text-foreground hover:bg-surface-muted",
};

export function Button({
  variant = "outline",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
