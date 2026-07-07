import { NextRequest, NextResponse } from "next/server";
import { readSheet, updateRow } from "@/lib/excel-store";
import { hashPassword, generateSalt, verifyToken } from "@/lib/auth-utils";

export async function POST(req: NextRequest) {
    try {
        // 1. Authenticate user from session cookie
        const token = req.cookies.get("session")?.value;
        if (!token) {
            return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
        }

        const sessionUser = verifyToken(token);
        if (!sessionUser) {
            return NextResponse.json({ error: "Phiên đăng nhập hết hạn hoặc không hợp lệ" }, { status: 401 });
        }

        // 2. Parse request body
        const { currentPassword, newPassword } = await req.json();
        if (!currentPassword || !newPassword) {
            return NextResponse.json({ error: "Vui lòng cung cấp mật khẩu hiện tại và mật khẩu mới" }, { status: 400 });
        }

        if (newPassword.length < 6) {
            return NextResponse.json({ error: "Mật khẩu mới phải từ 6 ký tự trở lên" }, { status: 400 });
        }

        // 3. Read Google Sheet and locate user row
        const users = await readSheet("taikhoan");
        const user = users.find((u) => String(u.username).trim().toLowerCase() === sessionUser.username.toLowerCase());
        
        if (!user) {
            return NextResponse.json({ error: "Không tìm thấy thông tin tài khoản" }, { status: 404 });
        }

        // 4. Verify current password
        const storedPass = String(user.password || "").trim();
        const storedSalt = String(user.salt || "").trim();
        
        const calculatedHash = hashPassword(currentPassword, storedSalt);
        if (calculatedHash !== storedPass) {
            return NextResponse.json({ error: "Mật khẩu hiện tại không chính xác" }, { status: 400 });
        }

        // 5. Hash new password and update in Google Sheet
        const newSalt = generateSalt();
        const newHash = hashPassword(newPassword, newSalt);

        await updateRow("taikhoan", user._row, {
            password: newHash,
            salt: newSalt
        });

        return NextResponse.json({ success: true, message: "Đổi mật khẩu thành công" });
    } catch (error) {
        console.error("Change Password API error:", error);
        return NextResponse.json({ error: "Lỗi hệ thống khi đổi mật khẩu" }, { status: 500 });
    }
}
