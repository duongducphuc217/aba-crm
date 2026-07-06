import { NextRequest, NextResponse } from "next/server";
import { getDashboard } from "@/lib/data";

export async function GET(req: NextRequest) {
    const sp = req.nextUrl.searchParams;
    const data = await getDashboard(
        sp.get("period") ?? undefined,
        sp.get("start_date") ?? undefined,
        sp.get("end_date") ?? undefined
    );
    return NextResponse.json(data);
}
