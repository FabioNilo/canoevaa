import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type ButtonProps = ComponentProps<"button"> & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
};

type LinkProps = ComponentProps<typeof Link> & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
};

const variants = {
  primary:
    "bg-ocean text-white shadow-lg shadow-[#0077be]/20 hover:bg-deep hover:-translate-y-0.5",
  secondary:
    "border border-turquoise bg-white text-deep hover:bg-turquoise/10 hover:-translate-y-0.5",
  ghost: "text-deep hover:bg-deep/5",
};

const base =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 py-3 text-center font-display text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50";

export function PrimaryButton({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function ButtonLink({
  children,
  variant = "primary",
  className = "",
  ...props
}: LinkProps) {
  return (
    <Link className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </Link>
  );
}
