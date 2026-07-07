"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BarChart3, Columns3, Gift, GraduationCap, Home, RefreshCw, Settings, Sparkles, Users, LogOut, User as UserIcon, Key, Menu, X } from "lucide-react";

const nav = [
    ["Dashboard Báo cáo", "/dashboard", BarChart3],
    ["Quản lý Khách hàng", "/khach-hang", Users],
    ["Quà tặng Tri ân", "/qua-tang", Gift],
    ["Chương trình", "/chuong-trinh", GraduationCap],
    ["Pipeline", "/pipeline", Columns3],
    ["ABA AI", "/aba-ai", Sparkles],
] as const;

function isActive(label: string, title: string) {
    return label === title || label.includes(title.replace("Quản lý ", "")) || (title.includes("Dashboard") && label.includes("Dashboard")) || (title.includes("Quà") && label.includes("Quà")) || (title.includes("Chương") && label.includes("Chương")) || (title.includes("Pipeline") && label.includes("Pipeline")) || (title.includes("ABA AI") && label.includes("ABA AI"));
}

export function CrmShell({ children, title = "Dashboard Báo cáo" }: { children: React.ReactNode; title?: string }) {
    const router = useRouter();
    const [user, setUser] = useState<{ name: string; role: string; username: string } | null>(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        fetch("/api/auth/me")
            .then((res) => {
                if (res.ok) return res.json();
                throw new Error("Chưa đăng nhập");
            })
            .then((data) => setUser(data.user))
            .catch(() => setUser(null));
    }, []);

    async function handleLogout() {
        try {
            const res = await fetch("/api/auth/logout", { method: "POST" });
            if (res.ok) {
                window.location.href = "/login";
            }
        } catch (error) {
            console.error("Lỗi đăng xuất:", error);
        }
    }

    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmNewPassword, setConfirmNewPassword] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");
    const [changing, setChanging] = useState(false);

    async function handlePasswordChange(e: React.FormEvent) {
        e.preventDefault();
        setErrorMsg("");
        setSuccessMsg("");

        if (!currentPassword || !newPassword || !confirmNewPassword) {
            setErrorMsg("Vui lòng nhập đầy đủ các trường.");
            return;
        }

        if (newPassword.length < 6) {
            setErrorMsg("Mật khẩu mới phải từ 6 ký tự trở lên.");
            return;
        }

        if (newPassword !== confirmNewPassword) {
            setErrorMsg("Mật khẩu xác nhận không khớp.");
            return;
        }

        setChanging(true);
        try {
            const res = await fetch("/api/auth/change-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ currentPassword, newPassword }),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Không đổi được mật khẩu.");
            }
            setSuccessMsg("Đổi mật khẩu thành công!");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmNewPassword("");
            setTimeout(() => {
                setShowPasswordModal(false);
                setSuccessMsg("");
            }, 1500);
        } catch (error) {
            setErrorMsg(error instanceof Error ? error.message : "Có lỗi xảy ra.");
        } finally {
            setChanging(false);
        }
    }

    const sidebarContent = (
        <>
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-br from-indigo-100 via-sky-50 to-transparent pointer-events-none" />
            <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className="relative flex items-center gap-3 px-6 py-7">
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
                            <Link key={label} href={href} onClick={() => setIsMobileMenuOpen(false)} className={`group flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition ${active ? "bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-100" : "text-slate-600 hover:bg-white hover:text-indigo-700 hover:shadow-sm"}`}>
                                <span className={`grid h-9 w-9 place-items-center rounded-xl transition ${active ? "bg-white text-indigo-600 shadow-sm" : "bg-slate-100 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600"}`}>
                                    <Icon size={18} />
                                </span>
                                <span>{label}</span>
                            </Link>
                        );
                    })}
                </nav>
            </div>

            <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-slate-200 bg-white/80 p-3.5 shadow-sm backdrop-blur">
                {user ? (
                    <div className="flex items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600 font-black text-sm uppercase">
                                {user.name ? user.name.slice(0, 2) : "US"}
                            </div>
                            <div className="min-w-0">
                                <div className="text-xs font-black text-slate-900 truncate leading-tight">{user.name}</div>
                                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">{user.role}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                            <button
                                onClick={() => {
                                    setIsMobileMenuOpen(false);
                                    setShowPasswordModal(true);
                                }}
                                title="Đổi mật khẩu"
                                className="grid h-8 w-8 place-items-center rounded-lg border border-slate-100 text-slate-400 hover:border-indigo-100 hover:bg-indigo-50 hover:text-indigo-600 transition cursor-pointer"
                            >
                                <Key size={14} />
                            </button>
                            <button
                                onClick={handleLogout}
                                title="Đăng xuất"
                                className="grid h-8 w-8 place-items-center rounded-lg border border-slate-100 text-slate-400 hover:border-red-100 hover:bg-red-50 hover:text-red-500 transition cursor-pointer"
                            >
                                <LogOut size={14} />
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-400">
                            <UserIcon size={15} />
                        </div>
                        <div>
                            <div className="text-xs font-bold text-slate-400">Đang xác thực...</div>
                        </div>
                    </div>
                )}
                <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        CRM Google Sheets Connected
                    </div>
                </div>
            </div>
        </>
    );

    return (
        <div className="min-h-screen text-slate-950">
            {/* Desktop Sidebar aside */}
            <aside className="fixed left-4 top-4 z-30 hidden h-[calc(100vh-32px)] w-[264px] overflow-hidden rounded-[2rem] border border-white/70 bg-white/80 shadow-2xl shadow-slate-200/70 backdrop-blur-xl xl:block">
                {sidebarContent}
            </aside>

            {/* Mobile Sidebar overlay & drawer */}
            <div
                className={`fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 xl:hidden ${
                    isMobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
            />
            <aside
                className={`fixed left-4 top-4 z-50 h-[calc(100vh-32px)] w-[264px] overflow-hidden rounded-[2rem] border border-white/70 bg-white/80 shadow-2xl shadow-slate-200/70 backdrop-blur-xl transition-all duration-300 ease-out xl:hidden ${
                    isMobileMenuOpen ? "translate-x-0 opacity-100" : "-translate-x-[290px] opacity-0"
                }`}
            >
                <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="absolute right-4 top-4 z-50 grid h-9 w-9 place-items-center rounded-xl bg-slate-100/80 text-slate-500 hover:bg-slate-200/80 active:bg-slate-300/80 transition cursor-pointer"
                    title="Đóng menu"
                >
                    <X size={16} />
                </button>
                {sidebarContent}
            </aside>

            <div className="xl:pl-[296px]">
                <header className="sticky top-0 z-20 border-b border-white/70 bg-white/70 px-4 py-3 backdrop-blur-xl md:px-10 md:py-4">
                    <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                            {/* Hamburger Menu Toggle Button */}
                            <button
                                onClick={() => setIsMobileMenuOpen(true)}
                                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 active:bg-slate-100/80 transition xl:hidden cursor-pointer"
                                title="Menu"
                            >
                                <Menu size={20} />
                            </button>

                            <div className="min-w-0">
                                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-indigo-500">
                                    <Home size={14} className="shrink-0" /> <span className="truncate">CRM Workspace</span>
                                </div>
                                <h1 className="mt-0.5 text-lg font-black tracking-tight text-slate-950 md:text-2xl md:mt-1 truncate">{title}</h1>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <span className="hidden h-10 items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 text-sm font-semibold text-emerald-600 md:inline-flex">● Đã cập nhật</span>
                            <button className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 cursor-pointer" title="Làm mới"><RefreshCw size={17} /></button>
                            <button className="hidden h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 md:inline-flex"><Settings size={16} /> Thiết lập</button>
                        </div>
                    </div>
                </header>
                <main className="min-h-[calc(100vh-81px)] px-3 py-5 md:px-10 md:py-8">
                    <div className="mx-auto max-w-[1400px]">{children}</div>
                </main>
            </div>

            {/* Change Password Modal */}
            {showPasswordModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
                    onClick={() => setShowPasswordModal(false)}
                >
                    <div
                        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal header */}
                        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
                            <div>
                                <h3 className="text-lg font-black text-slate-900">Đổi mật khẩu</h3>
                                <p className="mt-0.5 text-xs text-slate-500 font-medium">Mật khẩu mới phải từ 6 ký tự trở lên.</p>
                            </div>
                            <button
                                onClick={() => setShowPasswordModal(false)}
                                title="Đóng"
                                className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-slate-300 hover:text-slate-700"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                            </button>
                        </div>

                        {/* Modal body */}
                        <form onSubmit={handlePasswordChange}>
                            <div className="space-y-4 px-6 py-5">
                                {errorMsg && (
                                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-600">
                                        {errorMsg}
                                    </div>
                                )}
                                {successMsg && (
                                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-600">
                                        {successMsg}
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Mật khẩu hiện tại</label>
                                    <input
                                        type="password"
                                        required
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                                        placeholder="••••••••"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Mật khẩu mới</label>
                                    <input
                                        type="password"
                                        required
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                                        placeholder="••••••••"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Xác nhận mật khẩu mới</label>
                                    <input
                                        type="password"
                                        required
                                        value={confirmNewPassword}
                                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            {/* Modal footer */}
                            <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4">
                                <button
                                    type="button"
                                    onClick={() => setShowPasswordModal(false)}
                                    className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={changing || !!successMsg}
                                    className="inline-flex h-10 items-center justify-center rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm shadow-indigo-100 transition hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-40"
                                >
                                    {changing ? "Đang xử lý…" : "Xác nhận đổi"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
