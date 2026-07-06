import { NextResponse } from "next/server";
import { ensureLocalReadable } from "@/lib/excel-store";

export async function GET() {
    return NextResponse.json({ ok: true, readable: await ensureLocalReadable() });
}
