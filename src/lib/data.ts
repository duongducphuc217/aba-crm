import { endOfMonth, endOfWeek, endOfYear, startOfMonth, startOfWeek, startOfYear, subDays } from "date-fns";
import { readSheet } from "./excel-store";
import { type RowRecord, type SheetName } from "./types";

export type FilterParams = {
    search?: string;
    sale?: string;
    khu_vuc?: string;
    cap_hoc?: string;
    status?: string;
    muc_do_uu_tien?: string;
    chuong_trinh?: string;
    dip_tang?: string;
    start_date?: string;
    end_date?: string;
};

function text(value: unknown) {
    return String(value ?? "").toLowerCase().trim();
}

function number(value: unknown) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

export function parseDate(value: unknown): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    const raw = String(value).trim();
    const iso = new Date(raw);
    if (!Number.isNaN(iso.getTime())) return iso;
    const m = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (m) {
        const d = new Date(`${m[3]}-${m[2]}-${m[1]}`);
        return Number.isNaN(d.getTime()) ? null : d;
    }
    return null;
}

export function resolveRange(period?: string, start?: string, end?: string) {
    if (start || end) {
        return {
            start: start ? parseDate(start) : null,
            end: end ? parseDate(end) : null,
        };
    }
    const now = new Date();
    if (period === "week") return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    if (period === "month") return { start: startOfMonth(now), end: endOfMonth(now) };
    if (period === "year") return { start: startOfYear(now), end: endOfYear(now) };
    return { start: null, end: null };
}

export function previousRange(start: Date | null, end: Date | null) {
    if (!start || !end) return { start: null, end: null };
    const diffDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
    const prevEnd = subDays(start, 1);
    const prevStart = subDays(prevEnd, diffDays - 1);
    return { start: prevStart, end: prevEnd };
}

export function inRange(value: unknown, start: Date | null, end: Date | null) {
    if (!start && !end) return true;
    const d = parseDate(value);
    if (!d) return false;
    if (start && d < start) return false;
    if (end && d > end) return false;
    return true;
}

export function filterRows(rows: RowRecord[], sheet: SheetName, params: FilterParams) {
    const dateCol = sheet === "quatrian" ? "ngay_tang" : sheet === "chuongtrinh" ? "ngay_du_kien" : "";
    return rows.filter((row) => {
        const haystack = Object.entries(row)
            .filter(([k]) => !k.startsWith("_"))
            .map(([, v]) => text(v))
            .join(" ");
        if (params.search && !haystack.includes(text(params.search))) return false;
        if (params.sale && !text(row.sale).includes(text(params.sale))) return false;
        if (params.khu_vuc && !text(row.khu_vuc).includes(text(params.khu_vuc))) return false;
        if (params.cap_hoc && !text(row.cap_hoc).includes(text(params.cap_hoc))) return false;
        if (params.status && !text(row.status).includes(text(params.status))) return false;
        if (params.muc_do_uu_tien && !text(row.muc_do_uu_tien).includes(text(params.muc_do_uu_tien))) return false;
        if (params.chuong_trinh && !text(row.chuong_trinh).includes(text(params.chuong_trinh))) return false;
        if (params.dip_tang && !text(row.dip_tang).includes(text(params.dip_tang))) return false;
        if (dateCol && !inRange(row[dateCol], params.start_date ? parseDate(params.start_date) : null, params.end_date ? parseDate(params.end_date) : null)) return false;
        return true;
    });
}

export function distinct(rows: RowRecord[], key: string) {
    return [...new Set(rows.map((r) => String(r[key] ?? "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "vi"));
}

export async function getOptions() {
    const [danhsach, quatrian, chuongtrinh] = await Promise.all([
        readSheet("danhsach"),
        readSheet("quatrian"),
        readSheet("chuongtrinh"),
    ]);
    return {
        sale: distinct([...danhsach, ...quatrian, ...chuongtrinh], "sale"),
        khu_vuc: distinct(danhsach, "khu_vuc"),
        cap_hoc: distinct(danhsach, "cap_hoc"),
        priority: distinct(danhsach, "muc_do_uu_tien"),
        gift_status: distinct(quatrian, "status"),
        gift_occasions: distinct(quatrian, "dip_tang"),
        program_status: distinct(chuongtrinh, "status"),
        program_names: distinct(chuongtrinh, "chuong_trinh"),
    };
}

export async function getDashboard(period?: string, start?: string, end?: string) {
    const [customers, gifts, programs] = await Promise.all([
        readSheet("danhsach"),
        readSheet("quatrian"),
        readSheet("chuongtrinh"),
    ]);

    const current = resolveRange(period, start, end);
    const prev = previousRange(current.start, current.end);
    const giftsCurrent = gifts.filter((r) => inRange(r.ngay_tang, current.start, current.end));
    const giftsPrev = gifts.filter((r) => inRange(r.ngay_tang, prev.start, prev.end));
    const programsCurrent = programs.filter((r) => inRange(r.ngay_du_kien, current.start, current.end));
    const programsPrev = programs.filter((r) => inRange(r.ngay_du_kien, prev.start, prev.end));

    const revenue = programsCurrent.reduce((s, r) => s + number(r.doanh_thu), 0);
    const prevRevenue = programsPrev.reduce((s, r) => s + number(r.doanh_thu), 0);
    const giftCost = giftsCurrent.reduce((s, r) => s + number(r.Tong_tien_qua), 0);
    const prevGiftCost = giftsPrev.reduce((s, r) => s + number(r.Tong_tien_qua), 0);

    const pct = (a: number, b: number) => (b === 0 ? null : Number((((a - b) / b) * 100).toFixed(1)));

    const revenueByArea = Object.entries(programsCurrent.reduce<Record<string, number>>((acc, row) => {
        const key = String(row.khu_vuc || "Chưa có khu vực");
        acc[key] = (acc[key] || 0) + number(row.doanh_thu);
        return acc;
    }, {})).map(([name, value]) => ({ name, value }));

    const revenueByProgram = Object.entries(programsCurrent.reduce<Record<string, number>>((acc, row) => {
        const key = String(row.chuong_trinh || "Khác");
        acc[key] = (acc[key] || 0) + number(row.doanh_thu);
        return acc;
    }, {})).map(([name, value]) => ({ name, value }));

    const giftStatus = Object.entries(giftsCurrent.reduce<Record<string, number>>((acc, row) => {
        const key = String(row.status || "Chưa rõ");
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {})).map(([name, value]) => ({ name, value }));

    return {
        range: {
            start: current.start?.toISOString().slice(0, 10) ?? null,
            end: current.end?.toISOString().slice(0, 10) ?? null,
        },
        previous_range: {
            start: prev.start?.toISOString().slice(0, 10) ?? null,
            end: prev.end?.toISOString().slice(0, 10) ?? null,
        },
        cards: {
            customers: customers.length,
            programs: programsCurrent.length,
            gifts: giftsCurrent.length,
            revenue,
            gift_cost: giftCost,
        },
        comparison: {
            revenue_change_pct: pct(revenue, prevRevenue),
            gift_cost_change_pct: pct(giftCost, prevGiftCost),
            program_count_change_pct: pct(programsCurrent.length, programsPrev.length),
            gift_count_change_pct: pct(giftsCurrent.length, giftsPrev.length),
        },
        charts: {
            revenue_by_area: revenueByArea,
            revenue_by_program: revenueByProgram,
            gift_status: giftStatus,
        },
    };
}
