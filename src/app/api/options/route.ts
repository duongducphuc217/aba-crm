import { NextResponse } from "next/server";
import { getOptions } from "@/lib/data";

export async function GET() {
    return NextResponse.json(await getOptions());
}
