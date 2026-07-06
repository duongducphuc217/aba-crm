import { CrmShell } from "@/components/crm-shell";
import { SheetCrud } from "@/components/sheet-crud";
import { readSheet } from "@/lib/excel-store";
import { SHEETS } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ProgramsPage() {
    const rows = await readSheet("chuongtrinh");
    return (
        <CrmShell title="Chương trình">
            <SheetCrud
                sheet="chuongtrinh"
                title="Chương trình"
                subtitle="Quản lý các chương trình đã chốt, số lượng triển khai và doanh thu dự kiến theo trường."
                addLabel="Thêm chương trình"
                columns={SHEETS.chuongtrinh}
                rows={rows}
                primaryCol="ten_truong"
                secondaryCol="chuong_trinh"
                statusCol="status"
                detailBasePath="/chuong-trinh"
                displayOrder={[
                    "ten_truong",
                    "sale",
                    "chuong_trinh",
                    "so_luong",
                    "don_gia",
                    "doanh_thu",
                    "ngay_du_kien",
                    "status",
                ]}
            />
        </CrmShell>
    );
}
