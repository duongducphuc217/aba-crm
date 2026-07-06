"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { Calendar, CheckCircle2, CircleDot, Clock3, GripVertical, PartyPopper, User, XCircle } from "lucide-react";
import { Card } from "@/components/ui";
import { formatMoney, formatNumber } from "@/lib/utils";
import type { RowRecord } from "@/lib/types";

const COLUMNS = [
    {
        key: "Order mới" as const,
        title: "Order mới",
        description: "Các chương trình mới cần tiếp nhận và xử lý ban đầu.",
        icon: CircleDot,
        color: "border-sky-200 bg-sky-50/80 text-sky-700",
        pill: "bg-sky-100 text-sky-700",
        dropBg: "bg-sky-100/60",
    },
    {
        key: "Thực hiện" as const,
        title: "Thực hiện",
        description: "Các chương trình đang tư vấn, báo giá, thương lượng hoặc triển khai.",
        icon: Clock3,
        color: "border-amber-200 bg-amber-50/80 text-amber-700",
        pill: "bg-amber-100 text-amber-700",
        dropBg: "bg-amber-100/60",
    },
    {
        key: "Đã chốt" as const,
        title: "Đã chốt",
        description: "Các chương trình đã chốt triển khai với nhà trường.",
        icon: CheckCircle2,
        color: "border-emerald-200 bg-emerald-50/80 text-emerald-700",
        pill: "bg-emerald-100 text-emerald-700",
        dropBg: "bg-emerald-100/60",
    },
    {
        key: "Đã xong" as const,
        title: "Đã xong",
        description: "Các chương trình đã hoàn thành hoặc quá ngày dự kiến.",
        icon: PartyPopper,
        color: "border-violet-200 bg-violet-50/80 text-violet-700",
        pill: "bg-violet-100 text-violet-700",
        dropBg: "bg-violet-100/60",
    },
    {
        key: "Đã mất" as const,
        title: "Đã mất",
        description: "Các chương trình bị huỷ hoặc không triển khai.",
        icon: XCircle,
        color: "border-red-200 bg-red-50/80 text-red-700",
        pill: "bg-red-100 text-red-700",
        dropBg: "bg-red-100/60",
    },
] as const;

type PipelineStatus = typeof COLUMNS[number]["key"];

function s(v: unknown) {
    return v == null ? "" : String(v).trim();
}

function parseDate(v: unknown): Date | null {
    if (!v) return null;
    const str = String(v).trim();
    // Handle dd/mm/yyyy format
    const dmy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dmy) return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
    // Handle yyyy-mm-dd or ISO format
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
}

function normalizeStatus(row: RowRecord): PipelineStatus {
    const raw = s(row.status).toLowerCase();
    if (raw.includes("mất") || raw.includes("huỷ") || raw.includes("hủy")) return "Đã mất";
    if (raw.includes("xong") || raw.includes("hoàn thành")) return "Đã xong";
    if (raw.includes("chốt")) {
        // Auto-move to "Đã xong" if past due date
        const dueDate = parseDate(row.ngay_du_kien);
        if (dueDate) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (dueDate < today) return "Đã xong";
        }
        return "Đã chốt";
    }
    if (raw.includes("thực hiện") || raw.includes("trao đổi") || raw.includes("đang") || raw.includes("tư vấn") || raw.includes("báo giá")) return "Thực hiện";
    return "Order mới";
}

function totalRevenue(rows: RowRecord[]) {
    return rows.reduce((sum, row) => sum + (Number(row.doanh_thu) || 0), 0);
}

export function PipelineBoard({ initialRows }: { initialRows: RowRecord[] }) {
    const [rows, setRows] = useState<RowRecord[]>(() =>
        initialRows.map((r) => ({ ...r, status: r.status || normalizeStatus(r) }))
    );
    const [dragRow, setDragRow] = useState<number | null>(null);
    const [dropTarget, setDropTarget] = useState<PipelineStatus | null>(null);
    const [saving, setSaving] = useState<number | null>(null);
    const dragRef = useRef<number | null>(null);

    const grouped = Object.fromEntries(COLUMNS.map((col) => [col.key, [] as RowRecord[]])) as Record<PipelineStatus, RowRecord[]>;
    rows.forEach((row) => {
        grouped[normalizeStatus(row)].push(row);
    });

    const handleDragStart = useCallback((e: React.DragEvent, row: RowRecord) => {
        dragRef.current = row._row as number;
        setDragRow(row._row as number);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", String(row._row));
    }, []);

    const handleDragEnd = useCallback(() => {
        setDragRow(null);
        setDropTarget(null);
        dragRef.current = null;
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent, status: PipelineStatus) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDropTarget(status);
    }, []);

    const handleDragLeave = useCallback(() => {
        setDropTarget(null);
    }, []);

    const handleDrop = useCallback(async (e: React.DragEvent, newStatus: PipelineStatus) => {
        e.preventDefault();
        setDropTarget(null);

        const rowNum = Number(e.dataTransfer.getData("text/plain"));
        if (!rowNum) return;

        const row = rows.find((r) => r._row === rowNum);
        if (!row) return;

        const currentStatus = normalizeStatus(row);
        if (currentStatus === newStatus) {
            setDragRow(null);
            return;
        }

        // Optimistic update
        setRows((prev) =>
            prev.map((r) => (r._row === rowNum ? { ...r, status: newStatus } : r))
        );
        setDragRow(null);
        setSaving(rowNum);

        try {
            const res = await fetch("/api/sheets/chuongtrinh", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ _row: rowNum, status: newStatus }),
            });
            if (!res.ok) {
                // Revert on error
                setRows((prev) =>
                    prev.map((r) => (r._row === rowNum ? { ...r, status: currentStatus } : r))
                );
                const data = await res.json().catch(() => ({}));
                alert(data.error || "Không thể cập nhật trạng thái. Vui lòng thử lại.");
            }
        } catch {
            // Revert on network error
            setRows((prev) =>
                prev.map((r) => (r._row === rowNum ? { ...r, status: currentStatus } : r))
            );
            alert("Lỗi kết nối. Vui lòng thử lại.");
        } finally {
            setSaving(null);
        }
    }, [rows]);

    return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            {COLUMNS.map((col) => {
                const items = grouped[col.key];
                const Icon = col.icon;
                const isOver = dropTarget === col.key;

                return (
                    <div
                        key={col.key}
                        onDragOver={(e) => handleDragOver(e, col.key)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, col.key)}
                    >
                        <Card className={`overflow-hidden border transition-all duration-200 ${col.color} ${isOver ? `ring-2 ring-offset-2 ring-indigo-400 ${col.dropBg}` : ""}`}>
                            <div className="border-b border-white/70 p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/80 shadow-sm">
                                            <Icon size={18} />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-black text-slate-900">{col.title}</h3>
                                            <p className="text-xs font-medium text-slate-500">{items.length} chương trình</p>
                                        </div>
                                    </div>
                                    <span className={`rounded-full px-2.5 py-1 text-xs font-black ${col.pill}`}>
                                        {formatMoney(totalRevenue(items))}
                                    </span>
                                </div>
                                <p className="mt-3 text-xs leading-5 text-slate-500">{col.description}</p>
                            </div>

                            <div className="max-h-[calc(100vh-260px)] space-y-3 overflow-y-auto p-3">
                                {items.map((row) => {
                                    const isDragging = dragRow === row._row;
                                    const isSaving = saving === row._row;

                                    return (
                                        <div
                                            key={row._row}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, row)}
                                            onDragEnd={handleDragEnd}
                                            className={`group/card relative rounded-2xl border border-white/70 bg-white p-4 shadow-sm transition-all duration-200 ${isDragging ? "scale-95 rotate-1 opacity-50 ring-2 ring-indigo-300" : "hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"} ${isSaving ? "animate-pulse" : ""} cursor-grab active:cursor-grabbing`}
                                        >
                                            <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover/card:opacity-40">
                                                <GripVertical size={16} className="text-slate-400" />
                                            </div>

                                            <Link href={`/chuong-trinh/${row._row}`} className="block" onClick={(e) => { if (isDragging) e.preventDefault(); }}>
                                                <div className="flex items-start justify-between gap-3 pr-5">
                                                    <div className="min-w-0">
                                                        <h4 className="line-clamp-2 text-base font-black leading-6 text-slate-900">
                                                            {s(row.chuong_trinh) || "Chưa có tên chương trình"}
                                                        </h4>
                                                        <p className="mt-1 truncate text-xs font-semibold text-indigo-600">
                                                            {s(row.ten_truong) || "—"}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-slate-500">
                                                    <div className="flex items-center gap-2"><User size={13} /> <span className="truncate">Sale: {s(row.sale) || "—"}</span></div>
                                                    <div className="flex items-center gap-2"><Calendar size={13} /> <span className="truncate">{s(row.ngay_du_kien) || "Chưa có ngày dự kiến"}</span></div>
                                                </div>

                                                <div className="mt-4 grid grid-cols-2 gap-2">
                                                    <div className="rounded-xl bg-slate-50 p-2">
                                                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Số lượng</div>
                                                        <div className="text-sm font-black text-slate-800">{formatNumber(row.so_luong)}</div>
                                                    </div>
                                                    <div className="rounded-xl bg-emerald-50 p-2">
                                                        <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Doanh thu</div>
                                                        <div className="text-sm font-black text-emerald-700">{formatMoney(row.doanh_thu)}</div>
                                                    </div>
                                                </div>

                                                {s(row.ghi_chu) && (
                                                    <div className="mt-3 line-clamp-2 rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
                                                        {s(row.ghi_chu)}
                                                    </div>
                                                )}
                                            </Link>

                                            {isSaving && (
                                                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/70 backdrop-blur-sm">
                                                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-600">
                                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-300 border-t-indigo-600" />
                                                        Đang lưu...
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {items.length === 0 && (
                                    <div className={`rounded-2xl border-2 border-dashed px-4 py-10 text-center text-sm font-semibold transition-colors ${isOver ? "border-indigo-300 bg-indigo-50/50 text-indigo-400" : "border-slate-200 bg-white/70 text-slate-400"}`}>
                                        {isOver ? "Thả vào đây" : "Chưa có chương trình nào."}
                                    </div>
                                )}

                                {items.length > 0 && isOver && (
                                    <div className="rounded-2xl border-2 border-dashed border-indigo-300 bg-indigo-50/50 px-4 py-6 text-center text-sm font-semibold text-indigo-400">
                                        Thả vào đây
                                    </div>
                                )}
                            </div>
                        </Card>
                    </div>
                );
            })}
        </div>
    );
}
