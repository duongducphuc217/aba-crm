import { NextResponse } from "next/server";
import { readSheet, addRow } from "@/lib/excel-store";

function getNowString(): string {
    const now = new Date();
    const utc7 = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    return utc7.toISOString().replace("T", " ").substring(0, 19);
}

export async function GET() {
    try {
        const [customers, existingContacts] = await Promise.all([
            readSheet("danhsach"),
            readSheet("daumoi"),
        ]);

        const migrated = [];
        for (const cust of customers) {
            const contactName = String(cust.dau_moi_lien_he || "").trim();
            const customerId = String(cust.MA_KH || "").trim();
            
            if (!contactName || !customerId) continue;

            // Check duplicate to ensure idempotency
            const isDuplicate = existingContacts.some(
                (c) => String(c.MA_KH).trim() === customerId && 
                       String(c.ho_ten).trim() === contactName
            );

            if (isDuplicate) continue;

            const newContact = {
                MA_KH: customerId,
                ho_ten: contactName,
                chuc_danh: String(cust.chuc_danh || "Khác").trim(),
                phone: String(cust.phone || "").trim(),
                ngay_sinh: "",
                ghi_chu: "",
                ngay_cap_nhat: getNowString(),
            };

            await addRow("daumoi", newContact);
            migrated.push(newContact);
        }

        return NextResponse.json({
            success: true,
            migratedCount: migrated.length,
            migrated,
        });
    } catch (error: any) {
        console.error("Migration failed:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
