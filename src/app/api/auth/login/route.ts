import { NextRequest, NextResponse } from "next/server";
import { readSheet, updateRow } from "@/lib/excel-store";
import { hashPassword, signToken, generateSalt } from "@/lib/auth-utils";

export async function POST(req: NextRequest) {
    try {
        const { username, password } = await req.json();
        if (!username || !password) {
            return NextResponse.json({ error: "Thiếu tên đăng nhập hoặc mật khẩu" }, { status: 400 });
        }

        const users = await readSheet("taikhoan");
        const user = users.find((u) => String(u.username).trim().toLowerCase() === username.trim().toLowerCase());
        if (!user) {
            return NextResponse.json({ error: "Tài khoản hoặc mật khẩu không chính xác" }, { status: 401 });
        }

        const storedPass = String(user.password || "").trim();
        const storedSalt = String(user.salt || "").trim();
        let isValid = false;

        if (!storedSalt || storedPass.length !== 128) {
            // Salt is empty or password is plain text
            if (storedPass === password) {
                isValid = true;
                // Auto-upgrade plain text to hashed password
                try {
                    const newSalt = generateSalt();
                    const newHash = hashPassword(password, newSalt);
                    const updatePayload: Record<string, string> = {
                        password: newHash,
                        salt: newSalt,
                        role: String(user.role || "admin")
                    };
                    if (user.fullname !== undefined) {
                        updatePayload.fullname = String(user.fullname || "Quản trị viên");
                    } else {
                        updatePayload.name = String(user.name || "Quản trị viên");
                    }
                    await updateRow("taikhoan", user._row, updatePayload);
                } catch (e) {
                    console.error("Failed to auto-upgrade plain text password:", e);
                }
            }
        } else {
            const calculatedHash = hashPassword(password, storedSalt);
            if (calculatedHash === storedPass) {
                isValid = true;
            }
        }

        if (!isValid) {
            return NextResponse.json({ error: "Tài khoản hoặc mật khẩu không chính xác" }, { status: 401 });
        }

        const payload = {
            username: String(user.username),
            name: String(user.fullname || user.name || user.username),
            role: String(user.role || "viewer"),
        };

        const token = signToken(payload);

        const response = NextResponse.json({ success: true, user: payload });
        
        // Set HTTP-only session cookie
        response.cookies.set("session", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
            path: "/",
        });

        return response;
    } catch (error) {
        console.error("Login API error:", error);
        return NextResponse.json({ error: "Lỗi hệ thống khi xử lý đăng nhập" }, { status: 500 });
    }
}
