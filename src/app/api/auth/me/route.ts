import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth-utils";

export async function GET(req: NextRequest) {
    const token = req.cookies.get("session")?.value;
    if (!token) {
        return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }
    
    const payload = verifyToken(token);
    if (!payload) {
        return NextResponse.json({ error: "Phiên đăng nhập không hợp lệ hoặc hết hạn" }, { status: 401 });
    }
    
    return NextResponse.json({ user: payload });
}
