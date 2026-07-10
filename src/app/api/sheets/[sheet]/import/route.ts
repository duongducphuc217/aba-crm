import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { addRows } from "@/lib/excel-store";
import { SHEETS, type SheetName } from "@/lib/types";

function isSheet(value: string): value is SheetName {
    return value in SHEETS;
}

const HEADER_MAP: Record<string, string> = {
    "mã kh": "MA_KH",
    "ma_kh": "MA_KH",
    "tên khách hàng": "ten_truong",
    "ten_truong": "ten_truong",
    "tên trường": "ten_truong",
    "cấp học": "cap_hoc",
    "cap_hoc": "cap_hoc",
    "email": "email",
    "số hs": "so_luong_hoc_sinh",
    "số lượng học sinh": "so_luong_hoc_sinh",
    "so_luong_hoc_sinh": "so_luong_hoc_sinh",
    "khu vực": "khu_vuc",
    "khu_vuc": "khu_vuc",
    "chức danh": "chuc_danh",
    "chuc_danh": "chuc_danh",
    "đầu mối liên hệ": "dau_moi_lien_he",
    "dau_moi_lien_he": "dau_moi_lien_he",
    "số điện thoại": "phone",
    "điện thoại": "phone",
    "sđt": "phone",
    "phone": "phone",
    "mức độ ưu tiên": "muc_do_uu_tien",
    "muc_do_uu_tien": "muc_do_uu_tien",
    "sale": "sale",
    "sale phụ trách": "sale",
};

export async function POST(
    req: NextRequest,
    ctx: { params: Promise<{ sheet: string }> }
) {
    try {
        const { sheet } = await ctx.params;
        if (!isSheet(sheet)) {
            return NextResponse.json({ error: "Sheet không hợp lệ" }, { status: 400 });
        }

        const formData = await req.formData();
        const file = formData.get("file") as File;
        if (!file) {
            return NextResponse.json({ error: "Không tìm thấy file để import" }, { status: 400 });
        }

        const buffer = await file.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(Buffer.from(buffer) as any);

        const worksheet = workbook.worksheets[0];
        if (!worksheet) {
            return NextResponse.json({ error: "File Excel rỗng" }, { status: 400 });
        }

        let headerRowNumber = 1;
        let headers: string[] = [];

        worksheet.eachRow((row, rowNumber) => {
            if (headers.length === 0) {
                const vals: string[] = [];
                row.eachCell({ includeEmpty: false }, (cell) => {
                    vals.push(String(cell.value || "").trim());
                });
                if (vals.length > 0) {
                    const fullRow: string[] = [];
                    row.eachCell({ includeEmpty: true }, (cell) => {
                        let text = "";
                        if (cell.value && typeof cell.value === "object" && "text" in cell.value) {
                            text = String(cell.value.text || "");
                        } else {
                            text = String(cell.value || "");
                        }
                        fullRow.push(text.trim());
                    });
                    headers = fullRow;
                    headerRowNumber = rowNumber;
                }
            }
        });

        if (headers.length === 0) {
            return NextResponse.json({ error: "Không tìm thấy tiêu đề cột trong file" }, { status: 400 });
        }

        const keyMap = headers.map((h) => {
            const norm = String(h || "").toLowerCase().trim().replace(/\s+/g, " ");
            return HEADER_MAP[norm] || null;
        });

        const dataList: Record<string, unknown>[] = [];

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber <= headerRowNumber) return; // skip headers
            
            const item: Record<string, unknown> = {};
            let hasData = false;
            
            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                const key = keyMap[colNumber - 1];
                if (key) {
                    let val = cell.value;
                    if (val && typeof val === "object") {
                        if ("text" in val) {
                            val = val.text;
                        } else if ("result" in val) {
                            val = val.result;
                        }
                    }
                    if (val != null) {
                        const strVal = String(val).trim();
                        if (strVal !== "") {
                            item[key] = strVal;
                            hasData = true;
                        }
                    }
                }
            });

            if (hasData) {
                dataList.push(item);
            }
        });

        if (dataList.length === 0) {
            return NextResponse.json({ error: "Không có dữ liệu hợp lệ để import" }, { status: 400 });
        }

        const rows = await addRows(sheet, dataList);
        return NextResponse.json({ success: true, count: rows.length, rows });
    } catch (error) {
        console.error("Lỗi import file:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Có lỗi xảy ra khi xử lý file Excel" },
            { status: 500 }
        );
    }
}
