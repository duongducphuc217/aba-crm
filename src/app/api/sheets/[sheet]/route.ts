import { NextRequest, NextResponse } from "next/server";
import { addRow, deleteRow, readSheet, updateRow } from "@/lib/excel-store";
import { filterRows } from "@/lib/data";
import { SHEETS, type SheetName } from "@/lib/types";

function isSheet(value: string): value is SheetName {
    return value in SHEETS;
}

function paramsToObject(req: NextRequest) {
    return Object.fromEntries(req.nextUrl.searchParams.entries());
}

function apiError(error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err.code === "EBUSY") {
        return NextResponse.json(
            { error: "File Excel đang được mở hoặc bị khóa. Vui lòng đóng file danhsachkhachang.xlsx rồi thử lưu lại." },
            { status: 423 }
        );
    }
    return NextResponse.json({ error: err.message || "Có lỗi xảy ra khi xử lý file Excel" }, { status: 500 });
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ sheet: string }> }) {
    const { sheet } = await ctx.params;
    if (!isSheet(sheet)) return NextResponse.json({ error: "Sheet không hợp lệ" }, { status: 400 });
    const rows = filterRows(await readSheet(sheet), sheet, paramsToObject(req));
    return NextResponse.json({ sheet, columns: SHEETS[sheet], rows });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ sheet: string }> }) {
    try {
        const { sheet } = await ctx.params;
        if (!isSheet(sheet)) return NextResponse.json({ error: "Sheet không hợp lệ" }, { status: 400 });
        const body = await req.json();
        const row = await addRow(sheet, body);
        return NextResponse.json({ row }, { status: 201 });
    } catch (error) {
        return apiError(error);
    }
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ sheet: string }> }) {
    try {
        const { sheet } = await ctx.params;
        if (!isSheet(sheet)) return NextResponse.json({ error: "Sheet không hợp lệ" }, { status: 400 });
        const body = await req.json();
        const rowNumber = Number(body._row);
        if (!Number.isFinite(rowNumber)) return NextResponse.json({ error: "Thiếu _row" }, { status: 400 });
        const row = await updateRow(sheet, rowNumber, body);
        return NextResponse.json({ row });
    } catch (error) {
        return apiError(error);
    }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ sheet: string }> }) {
    try {
        const { sheet } = await ctx.params;
        if (!isSheet(sheet)) return NextResponse.json({ error: "Sheet không hợp lệ" }, { status: 400 });
        const rowNumber = Number(req.nextUrl.searchParams.get("row"));
        if (!Number.isFinite(rowNumber)) return NextResponse.json({ error: "Thiếu row" }, { status: 400 });
        await deleteRow(sheet, rowNumber);
        return NextResponse.json({ ok: true });
    } catch (error) {
        return apiError(error);
    }
}
