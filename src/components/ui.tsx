import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/* ─── Card ──────────────────────────────────────────────────────────── */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                "rounded-2xl border border-slate-200 bg-white shadow-sm",
                className,
            )}
            {...props}
        />
    );
}

/* ─── Button ─────────────────────────────────────────────────────────
   Base: h-10, px-4, text-sm, rounded-xl
   Override per-use with className for primary / ghost / destructive.
*/
export function Button({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            className={cn(
                "inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold",
                "transition-all duration-150",
                "disabled:pointer-events-none disabled:opacity-40",
                className,
            )}
            {...props}
        />
    );
}

/* ─── Input ──────────────────────────────────────────────────────────
   Base: h-10, px-3, text-sm, rounded-xl — same height as Button/Select.
*/
export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
    return (
        <input
            className={cn(
                "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800",
                "outline-none transition",
                "placeholder:text-slate-400",
                "focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100",
                className,
            )}
            {...props}
        />
    );
}

/* ─── Select ─────────────────────────────────────────────────────────
   Base: h-10, px-3, text-sm, rounded-xl — identical to Input.
*/
export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <select
            className={cn(
                "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700",
                "outline-none transition",
                "focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100",
                className,
            )}
            {...props}
        />
    );
}

/* ─── Badge ──────────────────────────────────────────────────────────*/
export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                className,
            )}
            {...props}
        />
    );
}
