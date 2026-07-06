import { CrmShell } from "@/components/crm-shell";
import { Badge, Card } from "@/components/ui";
import { getDashboard } from "@/lib/data";
import { formatMoney, formatPercent } from "@/lib/utils";
import { ArrowUpRight, Coins, Gift, GraduationCap, MapPinned, Users } from "lucide-react";

export default async function DashboardPage() {
    const data = await getDashboard();
    const cards = [
        ["Khách hàng", data.cards.customers, null, Users],
        ["Chương trình", data.cards.programs, formatPercent(data.comparison.program_count_change_pct), GraduationCap],
        ["Quà tặng", data.cards.gifts, formatPercent(data.comparison.gift_count_change_pct), Gift],
        ["Doanh thu", formatMoney(data.cards.revenue), formatPercent(data.comparison.revenue_change_pct), Coins],
        ["Chi phí quà", formatMoney(data.cards.gift_cost), formatPercent(data.comparison.gift_cost_change_pct), ArrowUpRight],
    ] as const;

    return (
        <CrmShell>
            <div className="grid gap-4 xl:grid-cols-5">
                {cards.map(([label, value, change, Icon]) => (
                    <Card key={String(label)} className="overflow-hidden p-5">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <div className="text-sm font-semibold text-slate-500">{label}</div>
                                <div className="mt-3 text-3xl font-black tracking-tight text-slate-950">{value}</div>
                            </div>
                            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                                <Icon size={20} />
                            </div>
                        </div>
                        {change ? <Badge className="mt-4 bg-emerald-50 text-emerald-600">↗ So với kỳ trước: {change}</Badge> : <div className="mt-4 text-sm text-slate-400">Tổng hợp hiện tại</div>}
                    </Card>
                ))}
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-3">
                <Card className="p-6 xl:col-span-2">
                    <div className="mb-5 flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-xl font-black tracking-tight text-slate-950">Doanh thu theo khu vực</h2>
                            <p className="mt-1 text-sm text-slate-500">Tổng hợp doanh thu dự kiến theo từng cụm trường/khu vực.</p>
                        </div>
                        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
                            <MapPinned size={20} />
                        </div>
                    </div>
                    <div className="space-y-3">
                        {data.charts.revenue_by_area.map((item, index) => (
                            <div key={item.name} className="rounded-3xl border border-slate-200/80 bg-slate-50/80 p-4">
                                <div className="mb-3 flex items-center justify-between gap-3">
                                    <span className="font-bold text-slate-700">{index + 1}. {item.name}</span>
                                    <strong className="text-slate-950">{formatMoney(item.value)}</strong>
                                </div>
                                <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                                    <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-sky-400" style={{ width: `${Math.max(10, Math.min(100, item.value ? (item.value / Math.max(...data.charts.revenue_by_area.map((x) => x.value || 0))) * 100 : 0))}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="mb-5 flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-xl font-black tracking-tight text-slate-950">Trạng thái quà tặng</h2>
                            <p className="mt-1 text-sm text-slate-500">Theo dõi tiến độ gửi và xác nhận quà tri ân.</p>
                        </div>
                        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
                            <Gift size={20} />
                        </div>
                    </div>
                    <div className="space-y-3">
                        {data.charts.gift_status.map((item) => (
                            <div key={item.name} className="flex items-center justify-between rounded-3xl border border-slate-200/80 bg-slate-50/80 px-4 py-4">
                                <span className="font-semibold text-slate-700">{item.name}</span>
                                <Badge className="bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">{item.value}</Badge>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </CrmShell>
    );
}
