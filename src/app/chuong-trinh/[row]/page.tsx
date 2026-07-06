import Link from "next/link";
import { ArrowLeft, Building2, Calendar, MapPin, Phone, User, Users, Tag } from "lucide-react";
import { CrmShell } from "@/components/crm-shell";
import { Card, Badge } from "@/components/ui";
import { readSheet } from "@/lib/excel-store";
import { formatMoney, formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

function s(v: unknown) {
    return v == null ? "" : String(v).trim();
}

function statusColor(value: string) {
    const v = value.toLowerCase();
    if (v.includes("chốt") || v.includes("nhận") || v.includes("xong")) return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    if (v.includes("gửi") || v.includes("cọc") || v.includes("đang")) return "bg-amber-50 text-amber-700 border border-amber-200";
    if (v.includes("mất") || v.includes("hủy")) return "bg-red-50 text-red-600 border border-red-200";
    return "bg-indigo-50 text-indigo-700 border border-indigo-200";
}

export default async function ProgramDetailPage({ params }: { params: Promise<{ row: string }> }) {
    const { row: rowParam } = await params;
    const rowNum = parseInt(rowParam, 10);

    const [allPrograms, allCustomers, allGifts] = await Promise.all([
        readSheet("chuongtrinh"),
        readSheet("danhsach"),
        readSheet("quatrian"),
    ]);

    const program = allPrograms.find((r) => r._row === rowNum);

    if (!program) {
        return (
            <CrmShell title="Chương trình">
                <div className="py-20 text-center">
                    <p className="text-lg font-semibold text-slate-500">Không tìm thấy chương trình (dòng {rowNum})</p>
                    <Link href="/chuong-trinh" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:underline">
                        <ArrowLeft size={16} /> Quay lại danh sách
                    </Link>
                </div>
            </CrmShell>
        );
    }

    const schoolName = s(program.ten_truong);
    const programName = s(program.chuong_trinh);

    // Find the customer record for this school
    const customer = allCustomers.find((c) => s(c.ten_truong) === schoolName);

    // Find other programs for the same school
    const otherPrograms = allPrograms.filter((p) => s(p.ten_truong) === schoolName && p._row !== rowNum);

    // Find gifts for the same school
    const gifts = allGifts.filter((g) => s(g.ten_truong) === schoolName);

    const revenue = Number(program.doanh_thu) || 0;
    const unitPrice = Number(program.don_gia) || 0;
    const quantity = Number(program.so_luong) || 0;

    const infoItems = [
        { icon: Building2, label: "Tên trường", value: schoolName },
        { icon: Tag, label: "Chương trình", value: programName },
        { icon: MapPin, label: "Khu vực", value: s(program.khu_vuc) },
        { icon: User, label: "Hiệu trưởng", value: s(program.hieu_truong) },
        { icon: Phone, label: "Điện thoại", value: s(program.phone) },
        { icon: User, label: "Sale phụ trách", value: s(program.sale) },
        { icon: Calendar, label: "Ngày dự kiến", value: s(program.ngay_du_kien) },
        { icon: Users, label: "Số lượng", value: formatNumber(quantity) },
    ];

    return (
        <CrmShell title="Chi tiết Chương trình">
            <div className="space-y-6">

                {/* ── Back link ── */}
                <Link href="/chuong-trinh" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-indigo-600">
                    <ArrowLeft size={16} /> Quay lại danh sách
                </Link>

                {/* ── Program info ── */}
                <Card className="p-6">
                    <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-2xl font-black tracking-tight text-slate-900">{programName || "Chưa có tên"}</h2>
                            <p className="mt-0.5 text-sm text-slate-500">
                                {schoolName} — dòng #{rowNum} trong Excel
                            </p>
                        </div>
                        {s(program.status) && (
                            <Badge className={statusColor(s(program.status))}>
                                {s(program.status)}
                            </Badge>
                        )}
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {infoItems.map((item) => (
                            <div key={item.label} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-slate-500 shadow-sm">
                                    <item.icon size={16} />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{item.label}</div>
                                    <div className="mt-0.5 truncate text-sm font-semibold text-slate-800">{item.value || "—"}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* ── Notes ── */}
                <Card className="p-5">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Ghi chú</div>
                    <div className="mt-2 whitespace-pre-wrap text-sm font-medium leading-6 text-slate-700">
                        {s(program.ghi_chu) || "Chưa có ghi chú cho chương trình này."}
                    </div>
                </Card>

                {/* ── Financial summary ── */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Card className="p-5">
                        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Đơn giá</div>
                        <div className="mt-1 text-3xl font-black text-slate-900">{formatMoney(unitPrice)}</div>
                    </Card>
                    <Card className="p-5">
                        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Số lượng</div>
                        <div className="mt-1 text-3xl font-black text-indigo-600">{formatNumber(quantity)}</div>
                    </Card>
                    <Card className="p-5">
                        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Doanh thu</div>
                        <div className="mt-1 text-3xl font-black text-emerald-600">{formatMoney(revenue)}</div>
                    </Card>
                </div>

                {/* ── Customer info (if found) ── */}
                {customer && (
                    <Card className="overflow-hidden">
                        <div className="border-b border-slate-100 px-5 py-4">
                            <h3 className="text-base font-black text-slate-900">Thông tin trường</h3>
                            <p className="text-xs text-slate-500">Dữ liệu từ danh sách khách hàng</p>
                        </div>
                        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
                            {[
                                { label: "Cấp học", value: s(customer.cap_hoc) },
                                { label: "Số học sinh", value: formatNumber(customer.so_luong_hoc_sinh) },
                                { label: "Ưu tiên", value: s(customer.muc_do_uu_tien) },
                                { label: "Sale", value: s(customer.sale) },
                            ].map((item) => (
                                <div key={item.label} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{item.label}</div>
                                    <div className="mt-0.5 text-sm font-semibold text-slate-800">{item.value || "—"}</div>
                                </div>
                            ))}
                        </div>
                        <div className="border-t border-slate-100 px-5 py-3">
                            <Link href={`/khach-hang/${customer._row}`} className="text-sm font-semibold text-indigo-600 hover:underline">
                                Xem chi tiết khách hàng →
                            </Link>
                        </div>
                    </Card>
                )}

                {/* ── Other programs for same school ── */}
                <Card className="overflow-hidden">
                    <div className="border-b border-slate-100 px-5 py-4">
                        <h3 className="text-base font-black text-slate-900">Chương trình khác cùng trường</h3>
                        <p className="text-xs text-slate-500">{otherPrograms.length} chương trình khác tại {schoolName}</p>
                    </div>
                    {otherPrograms.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50">
                                        <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Chương trình</th>
                                        <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Số lượng</th>
                                        <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Đơn giá</th>
                                        <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Doanh thu</th>
                                        <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Trạng thái</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {otherPrograms.map((p) => (
                                        <tr key={p._row} className="hover:bg-slate-50/70">
                                            <td className="px-4 py-3">
                                                <Link href={`/chuong-trinh/${p._row}`} className="font-semibold text-indigo-600 hover:underline">
                                                    {s(p.chuong_trinh) || "—"}
                                                </Link>
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">{formatNumber(p.so_luong)}</td>
                                            <td className="px-4 py-3 text-slate-600">{formatMoney(p.don_gia)}</td>
                                            <td className="px-4 py-3 font-semibold text-emerald-700">{formatMoney(p.doanh_thu)}</td>
                                            <td className="px-4 py-3">
                                                {s(p.status) ? <Badge className={statusColor(s(p.status))}>{s(p.status)}</Badge> : <span className="text-slate-400">—</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="px-5 py-10 text-center text-sm text-slate-400">Không có chương trình khác tại trường này.</div>
                    )}
                </Card>

                {/* ── Gifts for same school ── */}
                <Card className="overflow-hidden">
                    <div className="border-b border-slate-100 px-5 py-4">
                        <h3 className="text-base font-black text-slate-900">Quà tặng cùng trường</h3>
                        <p className="text-xs text-slate-500">{gifts.length} lần tặng quà tại {schoolName}</p>
                    </div>
                    {gifts.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50">
                                        <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Ngày tặng</th>
                                        <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Tên quà</th>
                                        <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">SL</th>
                                        <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Đơn giá</th>
                                        <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Tổng tiền</th>
                                        <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Trạng thái</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {gifts.map((g) => (
                                        <tr key={g._row} className="hover:bg-slate-50/70">
                                            <td className="px-4 py-3 text-slate-600">{s(g.ngay_tang) || "—"}</td>
                                            <td className="px-4 py-3 font-semibold text-slate-800">{s(g.ten_qua) || "—"}</td>
                                            <td className="px-4 py-3 text-slate-600">{formatNumber(g.so_luong_qua)}</td>
                                            <td className="px-4 py-3 text-slate-600">{formatMoney(g.don_gia_qua)}</td>
                                            <td className="px-4 py-3 font-semibold text-amber-700">{formatMoney(g.Tong_tien_qua)}</td>
                                            <td className="px-4 py-3">
                                                {s(g.status) ? <Badge className={statusColor(s(g.status))}>{s(g.status)}</Badge> : <span className="text-slate-400">—</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="px-5 py-10 text-center text-sm text-slate-400">Chưa có quà tặng nào tại trường này.</div>
                    )}
                </Card>
            </div>
        </CrmShell>
    );
}
