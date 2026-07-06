import { CrmShell } from "@/components/crm-shell";
import { SheetCrud } from "@/components/sheet-crud";
import { readSheet } from "@/lib/excel-store";
import { SHEETS } from "@/lib/types";

export default async function GiftsPage() {
    const rows = await readSheet("quatrian");
    return (
        <CrmShell title="Quà tặng Tri ân">
            <SheetCrud
                sheet="quatrian"
                title="Quà tặng Tri ân"
                subtitle="Theo dõi các đợt quà tặng, chi phí gửi quà và trạng thái bàn giao cho từng trường."
                addLabel="Thêm quà tặng"
                columns={SHEETS.quatrian}
                rows={rows}
                primaryCol="ten_truong"
                secondaryCol="ten_qua"
                statusCol="status"
            />
        </CrmShell>
    );
}
