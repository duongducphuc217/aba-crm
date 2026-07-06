import { clsx } from "clsx";

export function cn(...inputs: Array<string | false | null | undefined>) {
    return clsx(inputs);
}

export function toNumber(value: unknown) {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
}

export function formatMoney(value: unknown) {
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
    }).format(toNumber(value));
}

export function formatNumber(value: unknown) {
    return new Intl.NumberFormat("vi-VN").format(toNumber(value));
}

export function formatPercent(value: number | null | undefined) {
    if (value == null || Number.isNaN(value)) return "—";
    return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}
