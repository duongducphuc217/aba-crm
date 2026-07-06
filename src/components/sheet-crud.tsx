"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge, Button, Card, Input, Select } from "@/components/ui";
import type { RowRecord, SheetName } from "@/lib/types";
import { formatMoney } from "@/lib/utils";

type Props = {
    sheet: SheetName;
    title: string;
    subtitle: string;
    addLabel: string;
    columns: string[];
    rows: RowRecord[];
    primaryCol: string;
    secondaryCol?: string;
    statusCol?: string;
    displayOrder?: string[];
    /** If provided, primaryCol cells become links to this path + /{_row} */
    detailBasePath?: string;
};

function stringify(value: unknown) {
    return value == null ? "" : String(value);
}

function emptyRecord(columns: string[]) {
    return Object.fromEntries(columns.map((col) => [col, ""]));
}

function statusColor(value: string) {
    const v = value.toLowerCase();
    if (v.includes("chốt") || v.includes("nhận") || v.includes("xong")) return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    if (v.includes("gửi") || v.includes("cọc") || v.includes("ut1")) return "bg-amber-50 text-amber-700 border border-amber-200";
    if (v.includes("mất") || v.includes("hủy")) return "bg-red-50 text-red-600 border border-red-200";
    return "bg-indigo-50 text-indigo-700 border border-indigo-200";
}

const COLUMN_LABELS: Record<string, string> = {
    MA_KH: "Mã KH",
    ten_truong: "Tên trường",
    cap_hoc: "Cấp học",
    so_luong_hoc_sinh: "Số HS",
    khu_vuc: "Khu vực",
    hieu_truong: "Hiệu trưởng",
    phone: "Điện thoại",
    muc_do_uu_tien: "Ưu tiên",
    sale: "Sale",
    ngay_tang: "Ngày tặng",
    ten_qua: "Tên quà",
    so_luong_qua: "SL quà",
    don_gia_qua: "Đơn giá",
    Tong_tien_qua: "Tổng tiền",
    dip_tang: "Dịp tặng",
    status: "Trạng thái",
    chuong_trinh: "Chương trình",
    so_luong: "Số lượng",
    don_gia: "Đơn giá",
    doanh_thu: "Doanh thu",
    ngay_du_kien: "Ngày dự kiến",
    ghi_chu: "Ghi chú",
};

const MONEY_COLUMNS = new Set(["don_gia", "doanh_thu", "don_gia_qua", "Tong_tien_qua"]);

function columnLabel(column: string) {
    return COLUMN_LABELS[column] || column;
}

function formatCellValue(column: string, value: unknown) {
    if (value == null || String(value).trim() === "") return "";
    if (MONEY_COLUMNS.has(column)) return formatMoney(value);
    return stringify(value);
}

export function SheetCrud({ sheet, title, subtitle, addLabel, columns, rows, primaryCol, statusCol, displayOrder, detailBasePath }: Props) {
    const router = useRouter();
    const [items, setItems] = useState(rows);
    const [editing, setEditing] = useState<RowRecord | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState<Record<string, string>>(() => emptyRecord(columns));
    const [query, setQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [capHocFilter, setCapHocFilter] = useState("");
    const [khuVucFilter, setKhuVucFilter] = useState("");
    const [saleFilter, setSaleFilter] = useState("");
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => { setItems(rows); }, [rows]);

    const statusOptions = useMemo(() => {
        if (!statusCol) return [];
        return Array.from(new Set(items.map((r) => stringify(r[statusCol]).trim()).filter(Boolean)));
    }, [items, statusCol]);

    const capHocOptions = useMemo(() =>
        columns.includes("cap_hoc")
            ? Array.from(new Set(items.map((r) => stringify(r.cap_hoc).trim()).filter(Boolean)))
            : [],
        [columns, items]);

    const khuVucOptions = useMemo(() =>
        columns.includes("khu_vuc")
            ? Array.from(new Set(items.map((r) => stringify(r.khu_vuc).trim()).filter(Boolean)))
            : [],
        [columns, items]);

    const saleOptions = useMemo(() =>
        columns.includes("sale")
            ? Array.from(new Set(items.map((r) => stringify(r.sale).trim()).filter(Boolean)))
            : [],
        [columns, items]);

    const tableColumns = displayOrder?.length ? displayOrder.filter((c) => columns.includes(c)) : columns;

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return items.filter((row) => {
            const matchQ = !q || columns.some((col) => stringify(row[col]).toLowerCase().includes(q));
            const matchS = !statusFilter || (statusCol && stringify(row[statusCol]).trim() === statusFilter);
            const matchCap = !capHocFilter || stringify(row.cap_hoc).trim() === capHocFilter;
            const matchKhu = !khuVucFilter || stringify(row.khu_vuc).trim() === khuVucFilter;
            const matchSale = !saleFilter || stringify(row.sale).trim() === saleFilter;
            return matchQ && matchS && matchCap && matchKhu && matchSale;
        });
    }, [columns, items, query, statusFilter, statusCol, capHocFilter, khuVucFilter, saleFilter]);

    function openAdd() {
        setEditing(null);
        setForm(emptyRecord(columns));
        setMessage("");
        setShowForm(true);
    }

    function openEdit(row: RowRecord) {
        setEditing(row);
        setForm(Object.fromEntries(columns.map((col) => [col, stringify(row[col])])));
        setMessage("");
        setShowForm(true);
    }

    async function save() {
        setSaving(true);
        setMessage("");
        try {
            const body = editing ? { ...form, _row: editing._row } : form;
            const res = await fetch(`/api/sheets/${sheet}`, {
                method: editing ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Không lưu được dữ liệu");
            if (editing) {
                setItems((prev) => prev.map((row) => (row._row === editing._row ? data.row : row)));
            } else {
                setItems((prev) => [data.row, ...prev]);
            }
            setShowForm(false);
            setEditing(null);
            router.refresh();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Có lỗi xảy ra");
        } finally {
            setSaving(false);
        }
    }

    async function remove(row: RowRecord) {
        if (!confirm("Xóa bản ghi này? Sẽ ghi trực tiếp vào file Excel.")) return;
        try {
            const res = await fetch(`/api/sheets/${sheet}?row=${row._row}`, { method: "DELETE" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Không xóa được");
            setItems((prev) => prev.filter((item) => item._row !== row._row));
            router.refresh();
        } catch (error) {
            alert(error instanceof Error ? error.message : "Có lỗi xảy ra");
        }
    }

    /* ── Active filters count (for UX indicator) ── */
    const activeFilters = [statusFilter, capHocFilter, khuVucFilter, saleFilter].filter(Boolean).length;

    return (
        <div className="space-y-5">

            {/* ── Page header ─────────────────────────────── */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-2xl font-black tracking-tight text-slate-900">{title}</h2>
                    <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
                </div>
                {/* Primary action — h-10 consistent with filters */}
                <Button
                    onClick={openAdd}
                    className="shrink-0 bg-indigo-600 text-white shadow-sm shadow-indigo-200 hover:bg-indigo-700 active:bg-indigo-800"
                >
                    <span className="text-base leading-none">+</span>
                    {addLabel}
                </Button>
            </div>

            {/* ── Filter bar ──────────────────────────────── */}
            <Card className="px-4 py-3">
                <div className="mb-2.5 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Bộ lọc
                        {activeFilters > 0 && (
                            <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                                {activeFilters}
                            </span>
                        )}
                    </span>
                    <span className="text-xs text-slate-400">
                        {filtered.length}/{items.length} bản ghi
                    </span>
                </div>

                {/* All controls share h-10 via the ui primitives */}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
                    <Input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Tìm tên, SĐT, khu vực..."
                    />
                    {capHocOptions.length > 0 && (
                        <Select value={capHocFilter} onChange={(e) => setCapHocFilter(e.target.value)}>
                            <option value="">Tất cả cấp học</option>
                            {capHocOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                        </Select>
                    )}
                    {khuVucOptions.length > 0 && (
                        <Select value={khuVucFilter} onChange={(e) => setKhuVucFilter(e.target.value)}>
                            <option value="">Tất cả khu vực</option>
                            {khuVucOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                        </Select>
                    )}
                    {saleOptions.length > 0 && (
                        <Select value={saleFilter} onChange={(e) => setSaleFilter(e.target.value)}>
                            <option value="">Tất cả sale</option>
                            {saleOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                        </Select>
                    )}
                    {statusCol && statusOptions.length > 0 && (
                        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                            <option value="">Tất cả trạng thái</option>
                            {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                        </Select>
                    )}
                </div>
            </Card>

            {/* ── Data table ──────────────────────────────── */}
            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50">
                                {tableColumns.map((h) => (
                                    <th key={h} className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        {columnLabel(h)}
                                    </th>
                                ))}
                                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    Thao tác
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filtered.map((row) => (
                                <tr key={row._row} className="hover:bg-slate-50/70">
                                    {tableColumns.map((col) => (
                                        <td key={col} className="px-4 py-3 text-slate-600">
                                            {col === primaryCol ? (
                                                detailBasePath ? (
                                                    <Link href={`${detailBasePath}/${row._row}`} className="font-semibold text-indigo-600 hover:underline">
                                                        {stringify(row[primaryCol]) || "—"}
                                                    </Link>
                                                ) : (
                                                    <span className="font-semibold text-slate-900">
                                                        {stringify(row[primaryCol]) || "—"}
                                                    </span>
                                                )
                                            ) : col === statusCol ? (
                                                stringify(row[col])
                                                    ? <Badge className={statusColor(stringify(row[col]))}>{stringify(row[col])}</Badge>
                                                    : <span className="text-slate-400">—</span>
                                            ) : (
                                                <span className="whitespace-nowrap">{formatCellValue(col, row[col]) || "—"}</span>
                                            )}
                                        </td>
                                    ))}
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-end gap-1.5">
                                            {/* Edit — ghost, h-8 compact action */}
                                            <button
                                                onClick={() => openEdit(row)}
                                                title="Sửa"
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                            </button>
                                            {/* Delete — ghost danger */}
                                            <button
                                                onClick={() => remove(row)}
                                                title="Xóa"
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" /></svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={tableColumns.length + 1} className="px-4 py-12 text-center text-sm text-slate-400">
                                        Không có dữ liệu phù hợp với bộ lọc hiện tại.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* ── Add / Edit Modal ────────────────────────── */}
            {showForm && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
                    onClick={() => setShowForm(false)}
                >
                    <div
                        className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal header */}
                        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500">
                                    {editing ? "Chỉnh sửa" : "Thêm mới"}
                                </p>
                                <h3 className="mt-1 text-xl font-black text-slate-900">
                                    {editing ? "Cập nhật khách hàng" : addLabel}
                                </h3>
                                <p className="mt-0.5 text-sm text-slate-500">
                                    Dữ liệu sẽ được lưu trực tiếp vào file Excel.
                                </p>
                            </div>
                            <button
                                onClick={() => setShowForm(false)}
                                title="Đóng"
                                className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-slate-300 hover:text-slate-700"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                            </button>
                        </div>

                        {/* Modal body — scrollable, fields share h-10 Input primitive */}
                        <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                {columns.map((col) => (
                                    <div key={col} className="flex flex-col gap-1.5">
                                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                            {columnLabel(col)}
                                        </label>
                                        <Input
                                            value={form[col] ?? ""}
                                            onChange={(e) => setForm((prev) => ({ ...prev, [col]: e.target.value }))}
                                            placeholder={columnLabel(col)}
                                        />
                                    </div>
                                ))}
                            </div>

                            {message && (
                                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                                    {message}
                                </div>
                            )}
                        </div>

                        {/* Modal footer — action buttons same h-10 as all controls */}
                        <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4">
                            <Button
                                onClick={() => setShowForm(false)}
                                className="border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                            >
                                Hủy
                            </Button>
                            <Button
                                disabled={saving}
                                onClick={save}
                                className="bg-indigo-600 text-white shadow-sm shadow-indigo-200 hover:bg-indigo-700 active:bg-indigo-800"
                            >
                                {saving ? "Đang lưu…" : editing ? "Cập nhật" : "Lưu vào Excel"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
