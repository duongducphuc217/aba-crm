import Link from "next/link";
import { ArrowLeft, Building2, GraduationCap, Gift, MapPin, Phone, Star, User, Users } from "lucide-react";
import { CrmShell } from "@/components/crm-shell";
import { Card, Badge } from "@/components/ui";
import { readSheet } from "@/lib/excel-store";
import { formatMoney, formatNumber } from "@/lib/utils";

function s(v: unknown) {
    return v == null ? "" : String(v).trim();
}

function fmt(n: unknown) {
    return formatNumber(n);
}

function statusColor(value: string) {
    const v = value.toLowerCase();
    if (v.includes("chốt") || v.includes("nhận") || v.includes("xong")) return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    if (v.includes("gửi") || v.includes("cọc") || v.includes("ut1")) return "bg-amber-50 text-amber-700 border border-amber-200";
    if (v.includes("mất") || v.includes("hủy")) return "bg-red-50 text-red-600 border border-red-200";
    return "bg-indigo-50 text-indigo-700 border border-indigo-200";
}

export default async function CustomerDetailPage({ params }: { params: Promise<{ row: string }> }) {
    const { row: rowParam } = await params;
    const rowNum = parseInt(rowParam, 10);

    const [allCustomers, allGifts, allPrograms] = await Promise.all([
        readSheet("danhsach"),
        readSheet("quatrian"),
        readSheet("chuongtrinh"),
    ]);

    const customer = allCustomers.find((r) => r._row === rowNum);

    if (!customer) {
        return (
            <CrmShell title="Khách hàng">
                <div className="py-20 text-center">
                    <p className="text-lg font-semibold text-slate-500">Không tìm thấy khách hàng (dòng {rowNum})</p>
                    <Link href="/khach-hang" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:underline">
                        <ArrowLeft size={16} /> Quay lại danh sách
                    </Link>
                </div>
            </CrmShell>
        );
    }

    const name = s(customer.ten_truong);

    // Match gifts & programs by ten_truong
    const gifts = allGifts.filter((g) => s(g.ten_truong) === name);
    const programs = allPrograms.filter((p) => s(p.ten_truong) === name);

    const totalGiftCost = gifts.reduce((sum, g) => sum + (Number(g.Tong_tien_qua) || 0), 0);
    const totalRevenue = programs.reduce((sum, p) => sum + (Number(p.doanh_thu) || 0), 0);

    const infoItems = [
        { icon: Building2, label: "Tên trường", value: name },
        { icon: GraduationCap, label: "Cấp học", value: s(customer.cap_hoc) },
        { icon: MapPin, label: "Khu vực", value: s(customer.khu_vuc) },
        { icon: User, label: "Hiệu trưởng", value: s(customer.hieu_truong) },
        { icon: Phone, label: "Điện thoại", value: s(customer.phone) },
        { icon: Users, label: "Số học sinh", value: fmt(customer.so_luong_hoc_sinh) },
        { icon: Star, label: "Ưu tiên", value: s(customer.muc_do_uu_tien) },
        { icon: User, label: "Sale phụ trách", value: s(customer.sale) },
    ];

    return (
        <CrmShell title="Chi tiết Khách hàng">
            <div className="space-y-6">

                {/* ── Back link ── */}
                <Link href="/khach-hang" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-indigo-600">
                    <ArrowLeft size={16} /> Quay lại danh sách
                </Link>

                {/* ── Customer info ── */}
                <Card className="p-6">
                    <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-2xl font-black tracking-tight text-slate-900">{name || "Chưa có tên"}</h2>
                            <p className="mt-0.5 text-sm text-slate-500">Thông tin chi tiết khách hàng — dòng #{rowNum} trong Excel</p>
                        </div>
                        {s(customer.muc_do_uu_tien) && (
                            <Badge className={statusColor(s(customer.muc_do_uu_tien))}>
                                {s(customer.muc_do_uu_tien)}
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

                {/* ── Summary stats ── */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Card className="p-5">
                        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Chương trình đã tổ chức</div>
                        <div className="mt-1 text-3xl font-black text-slate-900">{programs.length}</div>
                    </Card>
                    <Card className="p-5">
                        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tổng doanh thu</div>
                        <div className="mt-1 text-3xl font-black text-emerald-600">{formatMoney(totalRevenue)}</div>
                    </Card>
                    <Card className="p-5">
                        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Quà tặng / Chi phí</div>
                        <div className="mt-1 text-3xl font-black text-amber-600">{gifts.length} quà · {formatMoney(totalGiftCost)}</div>
                    </Card>
                </div>

                {/* ── Programs history ── */}
                <Card className="overflow-hidden">
                    <div className="border-b border-slate-100 px-5 py-4">
                        <h3 className="text-base font-black text-slate-900">Lịch sử chương trình</h3>
                        <p className="text-xs text-slate-500">{programs.length} chương trình được ghi nhận cho trường này</p>
                    </div>
                    {programs.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50">
                                        <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Chương trình</th>
                                        <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Số lượng</th>
                                        <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Đơn giá</th>
                                        <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Doanh thu</th>
                                        <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Ngày dự kiến</th>
                                        <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Trạng thái</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {programs.map((p) => (
                                        <tr key={p._row} className="hover:bg-slate-50/70">
                                            <td className="px-4 py-3 font-semibold text-slate-800">{s(p.chuong_trinh) || "—"}</td>
                                            <td className="px-4 py-3 text-slate-600">{fmt(p.so_luong)}</td>
                                            <td className="px-4 py-3 text-slate-600">{formatMoney(p.don_gia)}</td>
                                            <td className="px-4 py-3 font-semibold text-emerald-700">{formatMoney(p.doanh_thu)}</td>
                                            <td className="px-4 py-3 text-slate-600">{s(p.ngay_du_kien) || "—"}</td>
                                            <td className="px-4 py-3">
                                                {s(p.status) ? <Badge className={statusColor(s(p.status))}>{s(p.status)}</Badge> : <span className="text-slate-400">—</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="px-5 py-10 text-center text-sm text-slate-400">Chưa có chương trình nào được ghi nhận.</div>
                    )}
                </Card>

                {/* ── Gifts history ── */}
                <Card className="overflow-hidden">
                    <div className="border-b border-slate-100 px-5 py-4">
                        <h3 className="text-base font-black text-slate-900">Lịch sử quà tặng</h3>
                        <p className="text-xs text-slate-500">{gifts.length} lần tặng quà được ghi nhận cho trường này</p>
                    </div>
                    {gifts.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50">
                                        <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Ngày tặng</th>
                                        <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Tên quà</th>
                                        <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Số lượng</th>
                                        <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Đơn giá</th>
                                        <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Tổng tiền</th>
                                        <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Dịp tặng</th>
                                        <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Trạng thái</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {gifts.map((g) => (
                                        <tr key={g._row} className="hover:bg-slate-50/70">
                                            <td className="px-4 py-3 text-slate-600">{s(g.ngay_tang) || "—"}</td>
                                            <td className="px-4 py-3 font-semibold text-slate-800">{s(g.ten_qua) || "—"}</td>
                                            <td className="px-4 py-3 text-slate-600">{fmt(g.so_luong_qua)}</td>
                                            <td className="px-4 py-3 text-slate-600">{formatMoney(g.don_gia_qua)}</td>
                                            <td className="px-4 py-3 font-semibold text-amber-700">{formatMoney(g.Tong_tien_qua)}</td>
                                            <td className="px-4 py-3 text-slate-600">{s(g.dip_tang) || "—"}</td>
                                            <td className="px-4 py-3">
                                                {s(g.status) ? <Badge className={statusColor(s(g.status))}>{s(g.status)}</Badge> : <span className="text-slate-400">—</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="px-5 py-10 text-center text-sm text-slate-400">Chưa có quà tặng nào được ghi nhận.</div>
                    )}
                </Card>
            </div>
        </CrmShell>
    );
}
