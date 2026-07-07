"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

export function formatVND(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === "") return "";
    const clean = String(value).replace(/\D/g, "");
    if (!clean) return "";
    const num = parseInt(clean, 10);
    return new Intl.NumberFormat("vi-VN").format(num);
}

export function stripVND(value: string | number | null | undefined): string {
    if (value === null || value === undefined) return "";
    return String(value).replace(/\./g, "");
}

const COLUMN_LABELS: Record<string, string> = {
    MA_KH: "Mã KH",
    ten_truong: "Tên khách hàng",
    cap_hoc: "Cấp học",
    so_luong_hoc_sinh: "Số HS",
    khu_vuc: "Khu vực",
    chuc_danh: "Chức danh",
    dau_moi_lien_he: "Đầu mối liên hệ",
    nguoi_nhan: "Người nhận",
    phone: "Số điện thoại",
    muc_do_uu_tien: "Mức độ ưu tiên",
    sale: "Sale",
    dac_diem_khach_hang: "Đặc điểm khách hàng",
    ngay_tang: "Ngày tặng",
    ten_qua: "Tên quà",
    so_luong_qua: "SL quà",
    don_gia_qua: "Đơn giá",
    Tong_tien_qua: "Thành tiền",
    dip_tang: "Dịp tặng",
    status: "Trạng thái",
    chuong_trinh: "Tên chương trình",
    so_luong: "Số lượng",
    don_gia: "Đơn giá",
    doanh_thu: "Doanh thu",
    ngay_du_kien: "Ngày dự kiến",
    ghi_chu: "Ghi chú",
    ngay_cap_nhat: "Ngày cập nhật",
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
    const searchParams = useSearchParams();
    const [items, setItems] = useState(rows);
    const [editing, setEditing] = useState<RowRecord | null>(null);

    useEffect(() => {
        const editRowStr = searchParams.get("edit");
        if (editRowStr) {
            const editRowNum = parseInt(editRowStr, 10);
            const found = items.find(r => r._row === editRowNum);
            if (found) {
                openEdit(found);
            }
            // Clear the query parameter after opening
            const url = new URL(window.location.href);
            url.searchParams.delete("edit");
            window.history.replaceState({}, "", url.pathname + url.search);
        }
    }, [searchParams, items]);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState<Record<string, string>>(() => emptyRecord(columns));
    const [query, setQuery] = useState("");
    const [showFilters, setShowFilters] = useState(false);
    const [statusFilter, setStatusFilter] = useState("");
    const [capHocFilter, setCapHocFilter] = useState("");
    const [khuVucFilter, setKhuVucFilter] = useState("");
    const [saleFilter, setSaleFilter] = useState("");
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [salesList, setSalesList] = useState<{ username: string; name: string }[]>([]);
    const [pendingDelete, setPendingDelete] = useState<RowRecord | null>(null);
    const [customers, setCustomers] = useState<RowRecord[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const suggestionsRef = useRef<HTMLDivElement>(null);
    const [extraGifts, setExtraGifts] = useState<Record<string, string>[]>([]);

    const updateExtraGift = (index: number, key: string, value: string) => {
        setExtraGifts(prev => prev.map((item, idx) => {
            if (idx !== index) return item;
            
            let formattedValue = value;
            if (key === "so_luong_qua" || key === "don_gia_qua") {
                formattedValue = formatVND(value);
            }
            
            const newItem = { ...item, [key]: formattedValue };
            if (key === "so_luong_qua" || key === "don_gia_qua") {
                const qty = Number(String(newItem.so_luong_qua || "").replace(/\./g, "")) || 0;
                const price = Number(String(newItem.don_gia_qua || "").replace(/\./g, "")) || 0;
                newItem.Tong_tien_qua = formatVND(qty * price);
            }
            return newItem;
        }));
    };

    // Auto-calculate gift total & program revenue
    useEffect(() => {
        if (sheet === "quatrian") {
            const qty = Number(String(form.so_luong_qua || "").replace(/\./g, "")) || 0;
            const price = Number(String(form.don_gia_qua || "").replace(/\./g, "")) || 0;
            const total = qty * price;
            setForm(prev => ({
                ...prev,
                Tong_tien_qua: formatVND(total)
            }));
        } else if (sheet === "chuongtrinh") {
            const qty = Number(String(form.so_luong || "").replace(/\./g, "")) || 0;
            const price = Number(String(form.don_gia || "").replace(/\./g, "")) || 0;
            const total = qty * price;
            setForm(prev => ({
                ...prev,
                doanh_thu: formatVND(total)
            }));
        }
    }, [form.so_luong_qua, form.don_gia_qua, form.so_luong, form.don_gia, sheet]);

    // Click outside suggest list
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Load customers list
    useEffect(() => {
        if (sheet === "quatrian" || sheet === "chuongtrinh") {
            fetch("/api/sheets/danhsach")
                .then((res) => res.json())
                .then((data) => {
                    if (data.rows) setCustomers(data.rows);
                })
                .catch((err) => console.error("Failed to load customers:", err));
        }
    }, [sheet]);

    useEffect(() => {
        if (columns.includes("sale")) {
            fetch("/api/auth/sales")
                .then((res) => res.json())
                .then((data) => {
                    if (data.sales) {
                        setSalesList(data.sales);
                    }
                })
                .catch((err) => console.error("Failed to load sales list:", err));
        }
    }, [columns]);

    const saleOptions = useMemo(() =>
        columns.includes("sale")
            ? Array.from(new Set(items.map((r) => stringify(r.sale).trim()).filter(Boolean)))
            : [],
        [columns, items]);

    const finalSales = useMemo(() => {
        const list = new Set<string>();
        salesList.forEach(s => {
            if (s.name && !s.name.includes("@")) {
                list.add(s.name);
            }
        });
        return Array.from(list).sort((a, b) => a.localeCompare(b, "vi"));
    }, [salesList]);

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

    const rawTableCols = displayOrder?.length ? displayOrder.filter((c) => columns.includes(c)) : columns;
    const tableColumns = sheet === "quatrian" ? rawTableCols.filter((c) => c !== "sale") : rawTableCols;

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

    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 25;

    useEffect(() => {
        setCurrentPage(1);
    }, [query, statusFilter, capHocFilter, khuVucFilter, saleFilter]);

    const sorted = useMemo(() => {
        return [...filtered].sort((a, b) => {
            const dateA = stringify(a.ngay_cap_nhat || "");
            const dateB = stringify(b.ngay_cap_nhat || "");
            if (dateA && dateB) {
                return dateB.localeCompare(dateA);
            }
            if (dateA) return -1;
            if (dateB) return 1;
            return b._row - a._row;
        });
    }, [filtered]);

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
    const paginatedItems = useMemo(() => {
        const start = (currentPage - 1) * PAGE_SIZE;
        return sorted.slice(start, start + PAGE_SIZE);
    }, [sorted, currentPage]);

    function openAdd() {
        setEditing(null);
        setForm(emptyRecord(columns));
        setExtraGifts([]);
        setMessage("");
        setShowForm(true);
    }

    function parseDateForInput(val: string) {
        if (!val) return "";
        if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
        const parts = val.split("/");
        if (parts.length === 3) {
            const d = parts[0].padStart(2, '0');
            const m = parts[1].padStart(2, '0');
            const y = parts[2];
            if (y.length === 4) return `${y}-${m}-${d}`;
        }
        return val;
    }

    function openEdit(row: RowRecord) {
        setEditing(row);
        const f: Record<string, string> = {};
        columns.forEach((col) => {
            let val = stringify(row[col]);
            if (col === "ngay_tang" || col === "ngay_du_kien") {
                val = parseDateForInput(val);
            } else if (["don_gia_qua", "so_luong_qua", "Tong_tien_qua", "so_luong", "don_gia", "doanh_thu"].includes(col)) {
                val = formatVND(val);
            }
            f[col] = val;
        });
        setForm(f);
        setExtraGifts([]);
        setMessage("");
        setShowForm(true);
    }

    async function save() {
        setSaving(true);
        setMessage("");
        try {
            const cleanPayload = (rec: Record<string, any>) => {
                const copy = { ...rec };
                const numericKeys = ["so_luong_qua", "don_gia_qua", "Tong_tien_qua", "so_luong", "don_gia", "doanh_thu"];
                for (const key of numericKeys) {
                    if (key in copy) {
                        copy[key] = stripVND(copy[key]);
                    }
                }
                return copy;
            };

            // Check if sheet is quatrian or chuongtrinh, and verify customer existence
            let finalTenTruong = form.ten_truong?.trim();
            if (finalTenTruong && (sheet === "quatrian" || sheet === "chuongtrinh")) {
                const exists = customers.some(c => String(c.ten_truong).trim().toLowerCase() === finalTenTruong.toLowerCase());
                if (!exists) {
                    // Automatically add new customer
                    const newCust = {
                        ten_truong: finalTenTruong,
                        dau_moi_lien_he: form.nguoi_nhan || form.dau_moi_lien_he || "",
                        chuc_danh: form.chuc_danh || "",
                        sale: form.sale || "",
                        phone: form.phone || "",
                        khu_vuc: form.khu_vuc || "",
                        cap_hoc: form.cap_hoc || "",
                    };
                    try {
                        const custRes = await fetch("/api/sheets/danhsach", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(newCust)
                        });
                        if (custRes.ok) {
                            const custData = await custRes.json();
                            if (custData.row) {
                                setCustomers(prev => [...prev, custData.row]);
                            }
                        }
                    } catch (e) {
                        console.error("Failed to auto-create customer:", e);
                    }
                }
            }

            // Automate multi-row creation if extraGifts array is populated (only for adding new gifts)
            if (!editing && sheet === "quatrian" && extraGifts.length > 0) {
                const savedRows: RowRecord[] = [];
                
                // 1. Save the main entry first
                const mainRes = await fetch(`/api/sheets/${sheet}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(cleanPayload(form)),
                });
                const mainData = await mainRes.json();
                if (!mainRes.ok) throw new Error(mainData.error || "Không lưu được dữ liệu người nhận chính");
                savedRows.push(mainData.row);
                
                // 2. Save each extra entry sequentially
                for (let i = 0; i < extraGifts.length; i++) {
                    const extra = extraGifts[i];
                    if (!extra.nguoi_nhan?.trim()) continue;
                    
                    const singleForm = {
                        ...form, // Copy shared fields: ngay_tang, ten_truong, sale, dip_tang, status
                        nguoi_nhan: extra.nguoi_nhan,
                        chuc_danh: extra.chuc_danh,
                        ten_qua: extra.ten_qua,
                        so_luong_qua: extra.so_luong_qua,
                        don_gia_qua: extra.don_gia_qua,
                        Tong_tien_qua: extra.Tong_tien_qua,
                    };
                    
                    const res = await fetch(`/api/sheets/${sheet}`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(cleanPayload(singleForm)),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || `Không lưu được dữ liệu người nhận thứ ${i + 2}`);
                    savedRows.push(data.row);
                }

                setItems((prev) => [...savedRows, ...prev]);
                setShowForm(false);
                setEditing(null);
                setExtraGifts([]);
                router.refresh();
                return;
            }

            const body = editing ? { ...form, _row: editing._row } : form;
            const res = await fetch(`/api/sheets/${sheet}`, {
                method: editing ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(cleanPayload(body)),
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

    function remove(row: RowRecord) {
        setPendingDelete(row);
    }

    async function executeDelete(row: RowRecord) {
        try {
            const res = await fetch(`/api/sheets/${sheet}?row=${row._row}`, { method: "DELETE" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Không xóa được");
            setItems((prev) => prev.filter((item) => item._row !== row._row));
            router.refresh();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Có lỗi xảy ra khi xóa");
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

            {/* ── Statistical overview cards (only for gifts) ───────────────── */}
            {sheet === "quatrian" && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <Card className="p-3 md:p-4 space-y-1 bg-white border border-slate-200 shadow-sm rounded-xl">
                        <span className="text-xs font-semibold text-slate-500">Tổng quà</span>
                        <div className="text-xl md:text-3xl font-black text-slate-900">
                            {filtered.length}
                        </div>
                        <p className="text-[10px] text-slate-400 truncate">Theo bộ lọc hiện tại</p>
                    </Card>
                    <Card className="p-3 md:p-4 space-y-1 bg-white border border-slate-200 shadow-sm rounded-xl">
                        <span className="text-xs font-semibold text-slate-500">Tổng số lượng</span>
                        <div className="text-xl md:text-3xl font-black text-slate-900">
                            {new Intl.NumberFormat("vi-VN").format(filtered.reduce((acc, row) => acc + (Number(row.so_luong_qua) || 0), 0))}
                        </div>
                        <p className="text-[10px] text-slate-400 truncate">Số lượng quà đã ghi nhận</p>
                    </Card>
                    <Card className="p-3 md:p-4 space-y-1 bg-white border border-slate-200 shadow-sm rounded-xl col-span-2 sm:col-span-1">
                        <span className="text-xs font-semibold text-slate-500">Tổng chi phí</span>
                        <div className="text-xl md:text-3xl font-black text-blue-600">
                            {formatMoney(filtered.reduce((acc, row) => acc + (Number(row.Tong_tien_qua) || 0), 0))}
                        </div>
                        <p className="text-[10px] text-slate-400 truncate">Format VND theo bộ lọc</p>
                    </Card>
                </div>
            )}

            {/* ── Statistical overview cards (only for programs) ────────────── */}
            {sheet === "chuongtrinh" && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <Card className="p-3 md:p-4 space-y-1 bg-white border border-slate-200 shadow-sm rounded-xl">
                        <span className="text-xs font-semibold text-slate-500">Tổng chương trình</span>
                        <div className="text-xl md:text-3xl font-black text-slate-900">
                            {filtered.length}
                        </div>
                        <p className="text-[10px] text-slate-400 truncate">Theo bộ lọc hiện tại</p>
                    </Card>
                    <Card className="p-3 md:p-4 space-y-1 bg-white border border-slate-200 shadow-sm rounded-xl">
                        <span className="text-xs font-semibold text-slate-500">Tổng số lượng</span>
                        <div className="text-xl md:text-3xl font-black text-slate-900">
                            {new Intl.NumberFormat("vi-VN").format(filtered.reduce((acc, row) => acc + (Number(row.so_luong) || 0), 0))}
                        </div>
                        <p className="text-[10px] text-slate-400 truncate">Số lượng triển khai đã ghi nhận</p>
                    </Card>
                    <Card className="p-3 md:p-4 space-y-1 bg-white border border-slate-200 shadow-sm rounded-xl col-span-2 sm:col-span-1">
                        <span className="text-xs font-semibold text-slate-500">Tổng doanh thu dự kiến</span>
                        <div className="text-xl md:text-3xl font-black text-blue-600">
                            {formatMoney(filtered.reduce((acc, row) => acc + (Number(row.doanh_thu) || 0), 0))}
                        </div>
                        <p className="text-[10px] text-slate-400 truncate">Format VND theo bộ lọc</p>
                    </Card>
                </div>
            )}

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
                    <div className="flex gap-2 sm:col-span-2 xl:col-span-1">
                        <Input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Tìm tên, SĐT, khu vực..."
                        />
                        {(capHocOptions.length > 0 || khuVucOptions.length > 0 || saleOptions.length > 0 || (statusCol && statusOptions.length > 0)) && (
                            <Button
                                type="button"
                                onClick={() => setShowFilters(!showFilters)}
                                className={`flex items-center gap-1.5 px-3 border border-slate-200 rounded-xl shadow-sm cursor-pointer ${showFilters || activeFilters > 0 ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-white text-slate-600 hover:bg-slate-50"} xl:hidden shrink-0`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                                <span className="hidden sm:inline">Lọc</span>
                                {activeFilters > 0 && (
                                    <span className="grid h-4 min-w-4 place-items-center rounded-full bg-indigo-600 px-1 text-[10px] font-black text-white">
                                        {activeFilters}
                                    </span>
                                )}
                            </Button>
                        )}
                    </div>

                    <div className={`contents ${showFilters ? "" : "hidden xl:contents"}`}>
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
                            {paginatedItems.map((row) => (
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

            {/* ── Pagination Controls ──────────────────────── */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-100 bg-white px-4 py-3 sm:px-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex flex-1 items-center justify-between sm:hidden">
                        <Button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-30 cursor-pointer"
                        >
                            Trước
                        </Button>
                        <span className="text-xs font-bold text-slate-500">Trang {currentPage} / {totalPages}</span>
                        <Button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-30 cursor-pointer"
                        >
                            Sau
                        </Button>
                    </div>
                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm text-slate-700">
                                Hiển thị <span className="font-semibold">{Math.min((currentPage - 1) * PAGE_SIZE + 1, filtered.length)}</span> đến{" "}
                                <span className="font-semibold">{Math.min(currentPage * PAGE_SIZE, filtered.length)}</span> trong tổng số{" "}
                                <span className="font-semibold">{filtered.length}</span> bản ghi
                            </p>
                        </div>
                        <div>
                            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="relative inline-flex items-center rounded-l-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-40 disabled:cursor-not-allowed bg-white"
                                >
                                    <span className="sr-only">Trang trước</span>
                                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                        <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                                    </svg>
                                </button>
                                
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                    <button
                                        key={page}
                                        onClick={() => setCurrentPage(page)}
                                        aria-current={page === currentPage ? "page" : undefined}
                                        className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold focus:z-20 ${
                                            page === currentPage
                                                ? "z-10 bg-indigo-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                                                : "text-slate-900 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 bg-white"
                                        }`}
                                    >
                                        {page}
                                    </button>
                                ))}

                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="relative inline-flex items-center rounded-r-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-40 disabled:cursor-not-allowed bg-white"
                                >
                                    <span className="sr-only">Trang sau</span>
                                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                        <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </nav>
                        </div>
                    </div>
                </div>
            )}

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
                                    Dữ liệu sẽ được lưu trực tiếp vào Google Sheets.
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
                            {sheet === "quatrian" ? (
                                <div className="space-y-6">
                                    {/* 1. General Info Block */}
                                    <div className="rounded-xl border border-slate-100 bg-slate-50/30 p-4 space-y-4">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Thông tin chung</h4>
                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                            {/* Ngày tặng */}
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Ngày tặng</label>
                                                <Input
                                                    type="date"
                                                    value={form.ngay_tang ?? ""}
                                                    onChange={(e) => setForm((prev) => ({ ...prev, ngay_tang: e.target.value }))}
                                                />
                                            </div>
                                            {/* Tên khách hàng */}
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tên khách hàng</label>
                                                <div className="relative">
                                                    <Input
                                                        value={form.ten_truong ?? ""}
                                                        onChange={(e) => {
                                                            setForm((prev) => ({ ...prev, ten_truong: e.target.value }));
                                                            setShowSuggestions(true);
                                                        }}
                                                        onFocus={() => setShowSuggestions(true)}
                                                        placeholder="Tên khách hàng"
                                                    />
                                                    {showSuggestions && (
                                                        <div
                                                            ref={suggestionsRef}
                                                            className="absolute left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
                                                        >
                                                            {customers
                                                                .filter((c) => {
                                                                    const search = (form.ten_truong ?? "").toLowerCase().trim();
                                                                    return !search || String(c.ten_truong).toLowerCase().includes(search);
                                                                })
                                                                .map((c) => (
                                                                    <button
                                                                        key={c._row}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setForm((prev) => ({
                                                                                ...prev,
                                                                                ten_truong: String(c.ten_truong || ""),
                                                                                nguoi_nhan: String(c.dau_moi_lien_he || prev.nguoi_nhan || ""),
                                                                                chuc_danh: String(c.chuc_danh || prev.chuc_danh || ""),
                                                                                sale: (() => {
                                                                                    const rawSale = String(c.sale || "");
                                                                                    const matched = salesList.find((s) => s.username === rawSale || s.name === rawSale);
                                                                                    return matched ? matched.name : (rawSale || prev.sale || "");
                                                                                })(),
                                                                            }));
                                                                            setShowSuggestions(false);
                                                                        }}
                                                                        className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 transition-colors duration-150"
                                                                    >
                                                                        <div className="font-semibold text-slate-800">{String(c.ten_truong)}</div>
                                                                        <div className="text-[10px] text-slate-400">
                                                                            {c.dau_moi_lien_he ? `Liên hệ: ${c.dau_moi_lien_he}` : ""}
                                                                            {c.sale ? ` · Sale: ${c.sale}` : ""}
                                                                        </div>
                                                                    </button>
                                                                ))}
                                                            {customers.filter((c) => {
                                                                const search = (form.ten_truong ?? "").toLowerCase().trim();
                                                                return !search || String(c.ten_truong).toLowerCase().includes(search);
                                                            }).length === 0 && (
                                                                <div className="px-3 py-2 text-xs text-slate-400 italic">Thêm khách hàng mới...</div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            {/* Sale phụ trách */}
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Sale phụ trách</label>
                                                <Select
                                                    value={form.sale ?? ""}
                                                    onChange={(e) => setForm((prev) => ({ ...prev, sale: e.target.value }))}
                                                >
                                                    <option value="">-- Chọn Sale --</option>
                                                    {finalSales.map((s) => (
                                                        <option key={s} value={s}>{s}</option>
                                                    ))}
                                                </Select>
                                            </div>
                                            {/* Trạng thái */}
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Trạng thái</label>
                                                <Select
                                                    value={form.status ?? ""}
                                                    onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                                                >
                                                    <option value="">-- Chọn Trạng thái --</option>
                                                    <option value="Đã tặng">Đã tặng</option>
                                                    <option value="Đã gửi">Đã gửi</option>
                                                </Select>
                                            </div>
                                            {/* Dịp tặng */}
                                            <div className="flex flex-col gap-1.5 sm:col-span-2">
                                                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Dịp tặng</label>
                                                <Input
                                                    value={form.dip_tang ?? ""}
                                                    onChange={(e) => setForm((prev) => ({ ...prev, dip_tang: e.target.value }))}
                                                    placeholder="Dịp tặng"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* 2. Recipient #1 Section */}
                                    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-4 shadow-sm">
                                        <h4 className="text-sm font-bold text-slate-800">Thông tin người nhận #1</h4>
                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                            {/* Người nhận */}
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-bold uppercase text-slate-400">Người nhận</label>
                                                <Input
                                                    value={form.nguoi_nhan ?? ""}
                                                    onChange={(e) => setForm((prev) => ({ ...prev, nguoi_nhan: e.target.value }))}
                                                    placeholder="Người nhận"
                                                />
                                            </div>
                                            {/* Chức danh */}
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-bold uppercase text-slate-400">Chức danh</label>
                                                <Input
                                                    value={form.chuc_danh ?? ""}
                                                    onChange={(e) => setForm((prev) => ({ ...prev, chuc_danh: e.target.value }))}
                                                    placeholder="Chức danh"
                                                />
                                            </div>
                                            {/* Tên quà */}
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-bold uppercase text-slate-400">Tên quà</label>
                                                <Input
                                                    value={form.ten_qua ?? ""}
                                                    onChange={(e) => setForm((prev) => ({ ...prev, ten_qua: e.target.value }))}
                                                    placeholder="Tên quà"
                                                />
                                            </div>
                                            {/* Số lượng quà */}
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-bold uppercase text-slate-400">Số lượng quà</label>
                                                <Input
                                                    value={form.so_luong_qua ?? ""}
                                                    onChange={(e) => setForm((prev) => ({ ...prev, so_luong_qua: formatVND(e.target.value) }))}
                                                    placeholder="Số lượng quà"
                                                />
                                            </div>
                                            {/* Đơn giá */}
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-bold uppercase text-slate-400">Đơn giá</label>
                                                <Input
                                                    value={form.don_gia_qua ?? ""}
                                                    onChange={(e) => setForm((prev) => ({ ...prev, don_gia_qua: formatVND(e.target.value) }))}
                                                    placeholder="Đơn giá"
                                                />
                                            </div>
                                            {/* Thành tiền */}
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-bold uppercase text-slate-400">Thành tiền</label>
                                                <Input
                                                    value={form.Tong_tien_qua ?? ""}
                                                    disabled
                                                    placeholder="Thành tiền"
                                                    className="disabled:bg-slate-100 disabled:text-slate-500 font-semibold text-slate-800"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* 3. Extra Recipients Section */}
                                    {!editing && (
                                        <div className="space-y-4">
                                            {extraGifts.length > 0 && (
                                                <h4 className="text-sm font-bold text-slate-800">Danh sách người nhận phụ thêm</h4>
                                            )}
                                            {extraGifts.map((gift, index) => (
                                                <div key={index} className="relative rounded-xl border border-slate-100 bg-slate-50/50 p-4 shadow-sm">
                                                    <div className="mb-3 flex items-center justify-between">
                                                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-500">
                                                            Người nhận #{index + 2}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setExtraGifts(prev => prev.filter((_, idx) => idx !== index))}
                                                            className="text-xs font-semibold text-red-500 hover:text-red-700 transition"
                                                        >
                                                            Xóa người nhận này
                                                        </button>
                                                    </div>
                                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-[10px] font-bold uppercase text-slate-400">Người nhận</label>
                                                            <Input
                                                                value={gift.nguoi_nhan}
                                                                onChange={(e) => updateExtraGift(index, "nguoi_nhan", e.target.value)}
                                                                placeholder="Người nhận"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-[10px] font-bold uppercase text-slate-400">Chức danh</label>
                                                            <Input
                                                                value={gift.chuc_danh}
                                                                onChange={(e) => updateExtraGift(index, "chuc_danh", e.target.value)}
                                                                placeholder="Chức danh"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-[10px] font-bold uppercase text-slate-400">Tên quà</label>
                                                            <Input
                                                                value={gift.ten_qua}
                                                                onChange={(e) => updateExtraGift(index, "ten_qua", e.target.value)}
                                                                placeholder="Tên quà"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-[10px] font-bold uppercase text-slate-400">Số lượng quà</label>
                                                            <Input
                                                                value={gift.so_luong_qua}
                                                                onChange={(e) => updateExtraGift(index, "so_luong_qua", e.target.value)}
                                                                placeholder="Số lượng quà"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-[10px] font-bold uppercase text-slate-400">Đơn giá</label>
                                                            <Input
                                                                value={gift.don_gia_qua}
                                                                onChange={(e) => updateExtraGift(index, "don_gia_qua", e.target.value)}
                                                                placeholder="Đơn giá"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-[10px] font-bold uppercase text-slate-400">Thành tiền</label>
                                                            <Input
                                                                value={gift.Tong_tien_qua}
                                                                disabled
                                                                placeholder="Thành tiền"
                                                                className="disabled:bg-slate-100 disabled:text-slate-500 font-semibold text-slate-800"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : sheet === "chuongtrinh" ? (
                                <div className="space-y-6">
                                    {/* 1. General Info Block */}
                                    <div className="rounded-xl border border-slate-100 bg-slate-50/30 p-4 space-y-4">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Thông tin chung</h4>
                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                            {/* Ngày dự kiến */}
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Ngày dự kiến</label>
                                                <Input
                                                    type="date"
                                                    value={form.ngay_du_kien ?? ""}
                                                    onChange={(e) => setForm((prev) => ({ ...prev, ngay_du_kien: e.target.value }))}
                                                />
                                            </div>
                                            {/* Tên khách hàng */}
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tên khách hàng</label>
                                                <div className="relative">
                                                    <Input
                                                        value={form.ten_truong ?? ""}
                                                        onChange={(e) => {
                                                            setForm((prev) => ({ ...prev, ten_truong: e.target.value }));
                                                            setShowSuggestions(true);
                                                        }}
                                                        onFocus={() => setShowSuggestions(true)}
                                                        placeholder="Tên khách hàng"
                                                    />
                                                    {showSuggestions && (
                                                        <div
                                                            ref={suggestionsRef}
                                                            className="absolute left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
                                                        >
                                                            {customers
                                                                .filter((c) => {
                                                                    const search = (form.ten_truong ?? "").toLowerCase().trim();
                                                                    return !search || String(c.ten_truong).toLowerCase().includes(search);
                                                                })
                                                                .map((c) => (
                                                                    <button
                                                                        key={c._row}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setForm((prev) => ({
                                                                                ...prev,
                                                                                ten_truong: String(c.ten_truong || ""),
                                                                                dau_moi_lien_he: String(c.dau_moi_lien_he || prev.dau_moi_lien_he || ""),
                                                                                phone: String(c.phone || prev.phone || ""),
                                                                                khu_vuc: String(c.khu_vuc || prev.khu_vuc || ""),
                                                                                sale: (() => {
                                                                                    const rawSale = String(c.sale || "");
                                                                                    const matched = salesList.find((s) => s.username === rawSale || s.name === rawSale);
                                                                                    return matched ? matched.name : (rawSale || prev.sale || "");
                                                                                })(),
                                                                            }));
                                                                            setShowSuggestions(false);
                                                                        }}
                                                                        className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 transition-colors duration-150"
                                                                    >
                                                                        <div className="font-semibold text-slate-800">{String(c.ten_truong)}</div>
                                                                        <div className="text-[10px] text-slate-400">
                                                                            {c.dau_moi_lien_he ? `Liên hệ: ${c.dau_moi_lien_he}` : ""}
                                                                            {c.sale ? ` · Sale: ${c.sale}` : ""}
                                                                        </div>
                                                                    </button>
                                                                ))}
                                                            {customers.filter((c) => {
                                                                const search = (form.ten_truong ?? "").toLowerCase().trim();
                                                                return !search || String(c.ten_truong).toLowerCase().includes(search);
                                                            }).length === 0 && (
                                                                <div className="px-3 py-2 text-xs text-slate-400 italic">Thêm khách hàng mới...</div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            {/* Sale phụ trách */}
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Sale phụ trách</label>
                                                <Select
                                                    value={form.sale ?? ""}
                                                    onChange={(e) => setForm((prev) => ({ ...prev, sale: e.target.value }))}
                                                >
                                                    <option value="">-- Chọn Sale --</option>
                                                    {finalSales.map((s) => (
                                                        <option key={s} value={s}>{s}</option>
                                                    ))}
                                                </Select>
                                            </div>
                                            {/* Trạng thái */}
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Trạng thái</label>
                                                <Select
                                                    value={form.status ?? ""}
                                                    onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                                                >
                                                    <option value="">-- Chọn Trạng thái --</option>
                                                    <option value="Order mới">Order mới</option>
                                                    <option value="Thực hiện">Thực hiện</option>
                                                    <option value="Đã chốt">Đã chốt</option>
                                                    <option value="Đã xong">Đã xong</option>
                                                    <option value="Đã mất">Đã mất</option>
                                                </Select>
                                            </div>

                                            {/* Đầu mối liên hệ */}
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Đầu mối liên hệ</label>
                                                <Input
                                                    value={form.dau_moi_lien_he ?? ""}
                                                    onChange={(e) => setForm((prev) => ({ ...prev, dau_moi_lien_he: e.target.value }))}
                                                    placeholder="Đầu mối liên hệ"
                                                />
                                            </div>
                                            {/* Điện thoại */}
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Số điện thoại</label>
                                                <Input
                                                    value={form.phone ?? ""}
                                                    onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                                                    placeholder="Điện thoại"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* 2. Program Info Block */}
                                    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-4 shadow-sm">
                                        <h4 className="text-sm font-bold text-slate-800">Thông tin chương trình</h4>
                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                            {/* Tên chương trình */}
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-bold uppercase text-slate-400">Tên chương trình</label>
                                                <Input
                                                    value={form.chuong_trinh ?? ""}
                                                    onChange={(e) => setForm((prev) => ({ ...prev, chuong_trinh: e.target.value }))}
                                                    placeholder="Tên chương trình"
                                                />
                                            </div>
                                            {/* Số lượng */}
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-bold uppercase text-slate-400">Số lượng</label>
                                                <Input
                                                     value={form.so_luong ?? ""}
                                                     onChange={(e) => setForm((prev) => ({ ...prev, so_luong: formatVND(e.target.value) }))}
                                                    placeholder="Số lượng"
                                                />
                                            </div>
                                            {/* Đơn giá */}
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-bold uppercase text-slate-400">Đơn giá</label>
                                                <Input
                                                    value={form.don_gia ?? ""}
                                                    onChange={(e) => setForm((prev) => ({ ...prev, don_gia: formatVND(e.target.value) }))}
                                                    placeholder="Đơn giá"
                                                />
                                            </div>
                                            {/* Doanh thu dự kiến */}
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-bold uppercase text-slate-400">Doanh thu dự kiến</label>
                                                <Input
                                                    value={form.doanh_thu ?? ""}
                                                    disabled
                                                    placeholder="Doanh thu dự kiến"
                                                    className="disabled:bg-slate-100 disabled:text-slate-500 font-semibold text-slate-800"
                                                />
                                            </div>
                                            {/* Ghi chú chi tiết */}
                                            <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-3">
                                                <label className="text-[10px] font-bold uppercase text-slate-400">Ghi chú chi tiết</label>
                                                <textarea
                                                    value={form.ghi_chu ?? ""}
                                                    onChange={(e) => setForm((prev) => ({ ...prev, ghi_chu: e.target.value }))}
                                                    placeholder="Ghi chú chi tiết"
                                                    className="w-full min-h-[80px] px-3 py-2 text-sm rounded-lg border border-slate-200 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    {columns.filter((col) => col !== "ngay_cap_nhat").map((col) => (
                                        <div key={col} className={`flex flex-col gap-1.5 ${col === "dac_diem_khach_hang" ? "col-span-1 sm:col-span-2" : ""}`}>
                                            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                                {columnLabel(col)}
                                            </label>
                                            {col === "MA_KH" ? (
                                                <Input
                                                    value={form[col] ?? ""}
                                                    onChange={(e) => setForm((prev) => ({ ...prev, [col]: e.target.value }))}
                                                    placeholder={columnLabel(col)}
                                                    disabled={!!editing}
                                                    className="disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                                                />
                                            ) : col === "cap_hoc" ? (
                                                <Select
                                                    value={form[col] ?? ""}
                                                    onChange={(e) => setForm((prev) => ({ ...prev, [col]: e.target.value }))}
                                                >
                                                    <option value="">-- Chọn Cấp học --</option>
                                                    <option value="Mầm Non">Mầm Non</option>
                                                    <option value="Tiểu học">Tiểu học</option>
                                                    <option value="THCS">THCS</option>
                                                    <option value="THPT">THPT</option>
                                                    <option value="Tư thục">Tư thục</option>
                                                </Select>
                                            ) : col === "sale" ? (
                                                <Select
                                                    value={form[col] ?? ""}
                                                    onChange={(e) => setForm((prev) => ({ ...prev, [col]: e.target.value }))}
                                                >
                                                    <option value="">-- Chọn Sale --</option>
                                                    {finalSales.map((s) => (
                                                        <option key={s} value={s}>{s}</option>
                                                    ))}
                                                </Select>
                                            ) : col === "muc_do_uu_tien" ? (
                                                <Select
                                                    value={form[col] ?? ""}
                                                    onChange={(e) => setForm((prev) => ({ ...prev, [col]: e.target.value }))}
                                                >
                                                    <option value="">-- Chọn Ưu tiên --</option>
                                                    <option value="Khách hàng SVIP">Khách hàng SVIP</option>
                                                    <option value="Khách hàng VIP">Khách hàng VIP</option>
                                                    <option value="Khách hàng cũ">Khách hàng cũ</option>
                                                    <option value="Khách mới">Khách mới</option>
                                                </Select>
                                            ) : col === "dac_diem_khach_hang" ? (
                                                <textarea
                                                    value={String(form[col] ?? "")}
                                                    onChange={(e) => setForm((prev) => ({ ...prev, [col]: e.target.value }))}
                                                    placeholder={columnLabel(col)}
                                                    className="w-full min-h-[80px] px-3 py-2 text-sm rounded-lg border border-slate-200 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                                />
                                            ) : col === "status" && (sheet as string) === "chuongtrinh" ? (
                                                <Select
                                                    value={form[col] ?? ""}
                                                    onChange={(e) => setForm((prev) => ({ ...prev, [col]: e.target.value }))}
                                                >
                                                    <option value="">-- Chọn Trạng thái --</option>
                                                    <option value="Chốt">Chốt</option>
                                                    <option value="Đặt cọc">Đặt cọc</option>
                                                    <option value="Đã xong">Đã xong</option>
                                                    <option value="Hủy">Hủy</option>
                                                    <option value="Mất">Mất</option>
                                                </Select>
                                            ) : col === "ngay_du_kien" ? (
                                                <Input
                                                    type="date"
                                                    value={form[col] ?? ""}
                                                    onChange={(e) => setForm((prev) => ({ ...prev, [col]: e.target.value }))}
                                                    placeholder={columnLabel(col)}
                                                />
                                            ) : col === "doanh_thu" ? (
                                                <Input
                                                    value={form[col] ?? ""}
                                                    disabled
                                                    placeholder={columnLabel(col)}
                                                    className="disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed font-semibold text-slate-800"
                                                />
                                            ) : col === "ten_truong" && (sheet as string) === "chuongtrinh" ? (
                                                <div className="relative">
                                                    <Input
                                                        value={form[col] ?? ""}
                                                        onChange={(e) => {
                                                            setForm((prev) => ({ ...prev, [col]: e.target.value }));
                                                            setShowSuggestions(true);
                                                        }}
                                                        onFocus={() => setShowSuggestions(true)}
                                                        placeholder={columnLabel(col)}
                                                    />
                                                    {showSuggestions && (
                                                        <div
                                                            ref={suggestionsRef}
                                                            className="absolute left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
                                                        >
                                                            {customers
                                                                .filter((c) => {
                                                                    const search = (form[col] ?? "").toLowerCase().trim();
                                                                    return !search || String(c.ten_truong).toLowerCase().includes(search);
                                                                })
                                                                .map((c) => (
                                                                    <button
                                                                        key={c._row}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setForm((prev) => ({
                                                                                ...prev,
                                                                                ten_truong: String(c.ten_truong || ""),
                                                                                dau_moi_lien_he: String(c.dau_moi_lien_he || prev.dau_moi_lien_he || ""),
                                                                                phone: String(c.phone || prev.phone || ""),
                                                                                khu_vuc: String(c.khu_vuc || prev.khu_vuc || ""),
                                                                                sale: (() => {
                                                                                    const rawSale = String(c.sale || "");
                                                                                    const matched = salesList.find((s) => s.username === rawSale || s.name === rawSale);
                                                                                    return matched ? matched.name : (rawSale || prev.sale || "");
                                                                                })(),
                                                                            }));
                                                                            setShowSuggestions(false);
                                                                        }}
                                                                        className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 transition-colors duration-150"
                                                                    >
                                                                        <div className="font-semibold text-slate-800">{String(c.ten_truong)}</div>
                                                                        <div className="text-[10px] text-slate-400">
                                                                            {c.dau_moi_lien_he ? `Liên hệ: ${c.dau_moi_lien_he}` : ""}
                                                                            {c.sale ? ` · Sale: ${c.sale}` : ""}
                                                                        </div>
                                                                    </button>
                                                                ))}
                                                            {customers.filter((c) => {
                                                                const search = (form[col] ?? "").toLowerCase().trim();
                                                                return !search || String(c.ten_truong).toLowerCase().includes(search);
                                                            }).length === 0 && (
                                                                <div className="px-3 py-2 text-xs text-slate-400 italic">Thêm khách hàng mới...</div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <Input
                                                    value={form[col] ?? ""}
                                                    onChange={(e) => setForm((prev) => ({ ...prev, [col]: e.target.value }))}
                                                    placeholder={columnLabel(col)}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                            {message && (
                                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                                    {message}
                                </div>
                            )}
                        </div>

                        {/* Modal footer — action buttons same h-10 as all controls */}
                        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-4">
                            <div>
                                {sheet === "quatrian" && !editing && (
                                    <Button
                                        type="button"
                                        onClick={() => setExtraGifts(prev => [...prev, { nguoi_nhan: "", chuc_danh: "", ten_qua: "", so_luong_qua: "", don_gia_qua: "", Tong_tien_qua: "" }])}
                                        className="border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 shadow-sm"
                                    >
                                        + Thêm người nhận
                                    </Button>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    onClick={() => {
                                        setShowForm(false);
                                        setExtraGifts([]);
                                    }}
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
                </div>
            )}

            {/* ── Custom Delete Confirmation Modal ────────── */}
            {pendingDelete && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
                    onClick={() => setPendingDelete(null)}
                >
                    <div
                        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-lg font-black text-slate-900">Xác nhận xóa</h3>
                        <p className="mt-2 text-sm text-slate-500">
                            Bạn có chắc chắn muốn xóa bản ghi này? Hành động này sẽ xóa vĩnh viễn dòng #{pendingDelete._row} trực tiếp trong file Excel.
                        </p>
                        <div className="mt-6 flex items-center justify-end gap-2">
                            <Button
                                onClick={() => setPendingDelete(null)}
                                className="border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                            >
                                Hủy
                            </Button>
                            <Button
                                onClick={async () => {
                                    const row = pendingDelete;
                                    setPendingDelete(null);
                                    await executeDelete(row);
                                }}
                                className="bg-red-600 text-white shadow-sm shadow-red-200 hover:bg-red-700 active:bg-red-800"
                            >
                                Xác nhận xóa
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
