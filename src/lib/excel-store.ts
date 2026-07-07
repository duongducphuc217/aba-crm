import { GoogleAuth } from "google-auth-library";
import { SHEETS, type RowRecord, type SheetName } from "./types";
import { generateSalt, hashPassword } from "./auth-utils";

/**
 * Google Sheets storage layer (REST API + google-auth-library).
 *
 * The rest of the app still imports from `excel-store` to avoid changing all
 * callers, but data is now read/written from Google Sheets.
 */

const NUMERIC_COLUMNS = new Set([
    "so_luong_hoc_sinh",
    "so_luong_qua",
    "don_gia_qua",
    "Tong_tien_qua",
    "so_luong",
    "don_gia",
    "doanh_thu",
]);

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || "";
const BASE = "https://sheets.googleapis.com/v4/spreadsheets";

const headerCache = new Map<SheetName, string[]>();
const dataCache = new Map<SheetName, { records: RowRecord[]; timestamp: number }>();
const DATA_CACHE_TTL = 10000; // 10 seconds

function getNowString(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    const seconds = pad(d.getSeconds());
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function assertConfig() {
    if (!SPREADSHEET_ID) throw new Error("Thiếu GOOGLE_SHEETS_SPREADSHEET_ID trong .env.local");
}

let _auth: GoogleAuth | null = null;
function getAuth(): GoogleAuth {
    if (_auth) return _auth;

    const credJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    const credFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (credJson) {
        _auth = new GoogleAuth({
            credentials: JSON.parse(credJson),
            scopes: ["https://www.googleapis.com/auth/spreadsheets"],
        });
    } else if (credFile) {
        _auth = new GoogleAuth({
            keyFile: credFile,
            scopes: ["https://www.googleapis.com/auth/spreadsheets"],
        });
    } else {
        _auth = new GoogleAuth({
            scopes: ["https://www.googleapis.com/auth/spreadsheets"],
        });
    }
    return _auth;
}

async function apiFetch(path: string, options?: RequestInit) {
    assertConfig();
    const auth = getAuth();
    const client = await auth.getClient();
    const token = await client.getAccessToken();
    const accessToken = typeof token === "string" ? token : token?.token;
    if (!accessToken) throw new Error("Không lấy được access token");

    const url = `${BASE}/${SPREADSHEET_ID}${path}`;
    const res = await fetch(url, {
        ...options,
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            ...(options?.headers || {}),
        },
    });
    if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Google Sheets API ${res.status}: ${body}`);
    }
    return res.json();
}

function cellToJson(value: unknown): string | number | null {
    if (value == null || value === "") return null;
    const str = String(value).trim();
    if (str === "") return null;
    if (typeof value === "number") return value;
    const normalized = str.replace(/,/g, "");
    if (/^-?\d+(\.\d+)?$/.test(normalized)) return Number(normalized);
    return str;
}

function valueForSheet(column: string, value: unknown): string | number {
    if (value == null) return "";
    if (NUMERIC_COLUMNS.has(column)) {
        const num = Number(value);
        return Number.isFinite(num) ? num : String(value);
    }
    return String(value);
}

function rowIsEmpty(values: Array<string | number | null>): boolean {
    return values.every((v) => v == null || String(v).trim() === "");
}

function enc(s: string) {
    return encodeURIComponent(s);
}

async function ensureHeaders(sheet: SheetName): Promise<string[]> {
    if (headerCache.has(sheet)) {
        return headerCache.get(sheet)!;
    }

    let headers: string[] = [];
    try {
        const data = await apiFetch(
            `/values/${enc(sheet)}!1:1?valueRenderOption=FORMATTED_VALUE`
        );
        headers = ((data.values?.[0] as string[]) || []).map((h: string) =>
            String(h).trim()
        );
    } catch (err: any) {
        const errMsg = String(err?.message || "");
        if (errMsg.includes("400") || errMsg.includes("Unable to parse range")) {
            try {
                await apiFetch(":batchUpdate", {
                    method: "POST",
                    body: JSON.stringify({
                        requests: [
                            {
                                addSheet: {
                                    properties: {
                                        title: sheet,
                                    },
                                },
                            },
                        ],
                    }),
                });
            } catch (createErr: any) {
                console.error(`Không thể tự động tạo sheet ${sheet}:`, createErr);
                throw err;
            }
        } else {
            throw err;
        }
    }

    if (headers.length > 0) {
        headerCache.set(sheet, headers);
        return headers;
    }

    // Create headers if sheet is empty
    const defaultHeaders = SHEETS[sheet];
    await apiFetch(
        `/values/${enc(sheet)}!A1?valueInputOption=USER_ENTERED`,
        {
            method: "PUT",
            body: JSON.stringify({ values: [defaultHeaders] }),
        }
    );

    // If it's the "taikhoan" sheet, initialize the default admin account
    if (sheet === "taikhoan") {
        const dSalt = generateSalt();
        const dHash = hashPassword("admin123", dSalt);
        const adminRow = ["admin", dHash, dSalt, "Quản trị viên", "admin"];
        
        await apiFetch(
            `/values/${enc(sheet)}!A2?valueInputOption=USER_ENTERED`,
            {
                method: "PUT",
                body: JSON.stringify({ values: [adminRow] }),
            }
        );
    }

    headerCache.set(sheet, defaultHeaders);
    return defaultHeaders;
}

export async function readSheet(sheet: SheetName): Promise<RowRecord[]> {
    const cached = dataCache.get(sheet);
    const now = Date.now();
    if (cached && (now - cached.timestamp < DATA_CACHE_TTL)) {
        return cached.records;
    }

    const headers = await ensureHeaders(sheet);
    const data = await apiFetch(
        `/values/${enc(sheet)}!A:Z?valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING`
    );

    const rows: unknown[][] = data.values || [];
    const columns = SHEETS[sheet].filter((c) => headers.includes(c));
    const headerIndex = new Map(headers.map((h: string, i: number) => [h, i]));
    const records: RowRecord[] = [];

    for (let i = 1; i < rows.length; i++) {
        const source = rows[i] || [];
        const values = columns.map((c) =>
            cellToJson(source[headerIndex.get(c) ?? -1])
        );
        if (rowIsEmpty(values)) continue;
        const record = { _row: i + 1 } as RowRecord;
        columns.forEach((c, idx) => {
            record[c] = values[idx];
        });
        records.push(record);
    }

    dataCache.set(sheet, { records, timestamp: now });
    return records;
}

async function nextMaKH(): Promise<string> {
    const rows = await readSheet("danhsach");
    let max = 0;
    for (const r of rows) {
        const val = String(r.MA_KH || "").trim();
        const m = val.match(/^KH(\d+)$/);
        if (m) { const n = parseInt(m[1], 10); if (n > max) max = n; }
    }
    return `KH${String(max + 1).padStart(3, "0")}`;
}

export async function addRow(
    sheet: SheetName,
    data: Record<string, unknown>
): Promise<RowRecord> {
    dataCache.delete(sheet);
    if (SHEETS[sheet].includes("ngay_cap_nhat")) {
        data = { ...data, ngay_cap_nhat: getNowString() };
    }
    // Auto-generate MA_KH for danhsach sheet
    if (sheet === "danhsach" && !data.MA_KH) {
        data = { ...data, MA_KH: await nextMaKH() };
    }
    const headers = await ensureHeaders(sheet);
    const values = headers.map((col) =>
        col in data ? valueForSheet(col, data[col]) : ""
    );

    const appendData = await apiFetch(
        `/values/${enc(sheet)}!A:Z:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
        {
            method: "POST",
            body: JSON.stringify({ values: [values] }),
        }
    );

    const updatedRange: string = appendData.updates?.updatedRange || "";
    const match = updatedRange.match(/!(?:[A-Z]+)(\d+)/);
    const rowNum = match ? Number(match[1]) : 0;

    const result = { _row: rowNum } as RowRecord;
    SHEETS[sheet].forEach((col) => {
        const idx = headers.indexOf(col);
        result[col] = idx >= 0 ? cellToJson(values[idx]) : null;
    });
    return result;
}

export async function updateRow(
    sheet: SheetName,
    rowNum: number,
    data: Record<string, unknown>
): Promise<RowRecord> {
    if (rowNum < 2) throw new Error("Dòng không hợp lệ");
    dataCache.delete(sheet);
    if (SHEETS[sheet].includes("ngay_cap_nhat")) {
        data = { ...data, ngay_cap_nhat: getNowString() };
    }
    const headers = await ensureHeaders(sheet);

    // Read current row
    const current = await apiFetch(
        `/values/${enc(sheet)}!A${rowNum}:Z${rowNum}?valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING`
    );
    const row = [...((current.values?.[0] as unknown[]) || [])];

    // Merge updates
    headers.forEach((col, idx) => {
        if (col in data) row[idx] = valueForSheet(col, data[col]);
    });

    // Write back
    await apiFetch(
        `/values/${enc(sheet)}!A${rowNum}?valueInputOption=USER_ENTERED`,
        {
            method: "PUT",
            body: JSON.stringify({ values: [row] }),
        }
    );

    const result = { _row: rowNum } as RowRecord;
    SHEETS[sheet].forEach((col) => {
        const idx = headers.indexOf(col);
        result[col] = idx >= 0 ? cellToJson(row[idx]) : null;
    });
    return result;
}

async function getSheetId(sheet: SheetName): Promise<number> {
    const meta = await apiFetch("?fields=sheets.properties");
    const found = (meta.sheets as { properties: { title: string; sheetId: number } }[])?.find(
        (s) => s.properties?.title === sheet
    );
    if (!found) throw new Error(`Sheet không tồn tại: ${sheet}`);
    return found.properties.sheetId;
}

export async function deleteRow(
    sheet: SheetName,
    rowNum: number
): Promise<void> {
    if (rowNum < 2) throw new Error("Dòng không hợp lệ");
    dataCache.delete(sheet);
    const sheetId = await getSheetId(sheet);
    await apiFetch(":batchUpdate", {
        method: "POST",
        body: JSON.stringify({
            requests: [
                {
                    deleteDimension: {
                        range: {
                            sheetId,
                            dimension: "ROWS",
                            startIndex: rowNum - 1,
                            endIndex: rowNum,
                        },
                    },
                },
            ],
        }),
    });
}

export async function ensureLocalReadable(): Promise<boolean> {
    try {
        await ensureHeaders("danhsach");
        return true;
    } catch {
        return false;
    }
}
