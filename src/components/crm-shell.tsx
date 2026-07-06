import Link from "next/link";
import { BarChart3, Columns3, Gift, GraduationCap, Home, RefreshCw, Settings, Sparkles, TableProperties, Users } from "lucide-react";

const nav = [
    ["Dashboard Báo cáo", "/dashboard", BarChart3],
    ["Quản lý Khách hàng", "/khach-hang", Users],
    ["Quà tặng Tri ân", "/qua-tang", Gift],
    ["Chương trình", "/chuong-trinh", GraduationCap],
    ["Pipeline", "/pipeline", Columns3],
] as const;

function isActive(label: string, title: string) {
    return label.includes(title.replace("Quản lý ", "")) || (title.includes("Dashboard") && label.includes("Dashboard")) || (title.includes("Quà") && label.includes("Quà")) || (title.includes("Chương") && label.includes("Chương")) || (title.includes("Pipeline") && label.includes("Pipeline"));
}

export function CrmShell({ children, title = "Dashboard Báo cáo" }: { children: React.ReactNode; title?: string }) {
    return (
        <div className="min-h-screen text-slate-950">
            <aside className="fixed left-4 top-4 z-30 hidden h-[calc(100vh-32px)] w-[264px] overflow-hidden rounded-[2rem] border border-white/70 bg-white/80 shadow-2xl shadow-slate-200/70 backdrop-blur-xl xl:block">
                <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-br from-indigo-100 via-sky-50 to-transparent" />
                <Link href="/" className="relative flex items-center gap-3 px-6 py-7">
                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 to-sky-500 text-white shadow-lg shadow-indigo-200">
                        <Sparkles size={22} />
                    </div>
                    <div>
                        <div className="text-xl font-black leading-5 tracking-tight text-slate-950">ABA</div>
                        <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">School CRM</div>
                    </div>
                </Link>

                <div className="relative px-4">
                    <div className="mb-3 px-3 text-[11px] font-black uppercase tracking-widest text-slate-400">Quản lý tổng</div>
                    <nav className="space-y-2">
                        {nav.map(([label, href, Icon]) => {
                            const active = isActive(label, title);
                            return (
                                <Link key={label} href={href} className={`group flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition ${active ? "bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-100" : "text-slate-600 hover:bg-white hover:text-indigo-700 hover:shadow-sm"}`}>
                                    <span className={`grid h-9 w-9 place-items-center rounded-xl transition ${active ? "bg-white text-indigo-600 shadow-sm" : "bg-slate-100 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600"}`}>
                                        <Icon size={18} />
                                    </span>
                                    <span>{label}</span>
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur">
                    <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
                            <TableProperties size={18} />
                        </div>
                        <div>
                            <div className="text-sm font-black text-slate-950">CRM Excel</div>
                            <div className="text-xs font-semibold text-slate-500">Đồng bộ file nội bộ</div>
                        </div>
                    </div>
                    <div className="mt-3 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-600">● Đang hoạt động</div>
                </div>
            </aside>

            <div className="xl:pl-[296px]">
                <header className="sticky top-0 z-20 border-b border-white/70 bg-white/70 px-5 py-4 backdrop-blur-xl md:px-10">
                    <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-indigo-500">
                                <Home size={14} /> CRM Workspace
                            </div>
                            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">{title}</h1>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="hidden h-10 items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 text-sm font-semibold text-emerald-600 md:inline-flex">● Đã cập nhật</span>
                            <button className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50" title="Làm mới"><RefreshCw size={17} /></button>
                            <button className="hidden h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 md:inline-flex"><Settings size={16} /> Thiết lập</button>
                            <Link href={title.includes("Khách") ? "/khach-hang" : title.includes("Quà") ? "/qua-tang" : "/chuong-trinh"} className="inline-flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm shadow-indigo-200 transition hover:bg-indigo-700">+ Tạo mới</Link>
                        </div>
                    </div>
                </header>
                <main className="min-h-[calc(100vh-81px)] px-5 py-8 md:px-10">
                    <div className="mx-auto max-w-[1400px]">{children}</div>
                </main>
            </div>
        </div>
    );
}
