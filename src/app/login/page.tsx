"use client";

import { Suspense, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound, Sparkles, User, AlertCircle } from "lucide-react";
import { Button, Card, Input } from "@/components/ui";

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isPending, startTransition] = useTransition();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");

        if (!username.trim() || !password) {
            setError("Vui lòng điền đầy đủ thông tin đăng nhập.");
            return;
        }

        startTransition(async () => {
            try {
                const res = await fetch("/api/auth/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ 
                        username: username.trim(), 
                        password 
                    }),
                });

                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.error || "Đăng nhập không thành công.");
                }

                router.push(callbackUrl);
                router.refresh();
            } catch (err) {
                setError(err instanceof Error ? err.message : "Đăng nhập thất bại. Vui lòng thử lại.");
            }
        });
    }

    return (
        <main className="relative flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8 overflow-hidden bg-slate-50">
            {/* Background design accents */}
            <div className="absolute right-[-10%] top-[-10%] h-[500px] w-[500px] rounded-full bg-indigo-100/70 blur-3xl" />
            <div className="absolute left-[-5%] bottom-[-10%] h-[400px] w-[400px] rounded-full bg-sky-100/70 blur-3xl" />
            
            <div className="relative w-full max-w-[440px]">
                {/* Brand Logo Header */}
                <div className="flex flex-col items-center mb-8">
                    <div className="flex items-center gap-2.5 rounded-2xl border border-indigo-100 bg-indigo-50/80 px-4 py-2 text-sm font-black text-indigo-600 shadow-sm backdrop-blur-sm">
                        <Sparkles size={16} className="animate-pulse" /> ABA School CRM
                    </div>
                    <h2 className="mt-4 text-center text-3xl font-black tracking-tight text-slate-900">
                        Đăng nhập hệ thống
                    </h2>
                    <p className="mt-2 text-center text-sm text-slate-500 font-medium">
                        Quản trị dữ liệu trường học và doanh thu dự kiến
                    </p>
                </div>

                <Card className="p-6 md:p-8 border-white/70 bg-white/80 shadow-2xl shadow-slate-200/80 backdrop-blur-xl rounded-[2rem]">
                    <form className="space-y-5" onSubmit={handleSubmit}>
                        {error && (
                            <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="space-y-4">
                            {/* Username input */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                    <User size={13} /> Tên đăng nhập
                                </label>
                                <Input
                                    type="text"
                                    required
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Ví dụ: admin"
                                    disabled={isPending}
                                    className="h-11 rounded-xl"
                                />
                            </div>

                            {/* Password input */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                    <KeyRound size={13} /> Mật khẩu
                                </label>
                                <Input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    disabled={isPending}
                                    className="h-11 rounded-xl"
                                />
                            </div>
                        </div>

                        {/* Submit button with micro-animations & loading states */}
                        <Button
                            type="submit"
                            disabled={isPending}
                            className="w-full h-11 bg-indigo-600 text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:bg-indigo-800 transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:shadow-none"
                        >
                            {isPending ? (
                                <div className="flex items-center justify-center gap-2">
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-300 border-t-white" />
                                    <span>Đang xác thực...</span>
                                </div>
                            ) : (
                                "Đăng nhập"
                            )}
                        </Button>
                    </form>

                    {/* Hint for developers / admins */}
                    <div className="mt-6 border-t border-slate-100 pt-4 text-center">
                        <span className="text-[11px] font-semibold text-slate-400 bg-slate-50 px-2.5 py-1.5 rounded-full inline-block">
                            Tài khoản mặc định: <strong className="text-slate-600 font-bold">admin</strong> / <strong className="text-slate-600 font-bold">admin123</strong>
                        </span>
                    </div>
                </Card>
            </div>
        </main>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="h-8 w-8 animate-spin rounded-full border-3 border-slate-200 border-t-indigo-600" />
            </div>
        }>
            <LoginForm />
        </Suspense>
    );
}
