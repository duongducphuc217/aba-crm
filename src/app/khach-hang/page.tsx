import { CrmShell } from "@/components/crm-shell";
import { SheetCrud } from "@/components/sheet-crud";
import { readSheet } from "@/lib/excel-store";
import { SHEETS } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
    const rows = await readSheet("danhsach");
    return (
        <CrmShell title="Quản lý Khách hàng">
            <SheetCrud
                sheet="danhsach"
                title="Quản lý Khách hàng"
                subtitle="Lưu trữ thông tin trường học, đầu mối liên hệ và mức độ ưu tiên chuyên nghiệp."
                addLabel="Thêm khách hàng"
                columns={SHEETS.danhsach}
                rows={rows}
                primaryCol="ten_truong"
                statusCol="muc_do_uu_tien"
                detailBasePath="/khach-hang"
                displayOrder={[
                    "MA_KH",
                    "ten_truong",
                    "cap_hoc",
                    "email",
                    "so_luong_hoc_sinh",
                    "khu_vuc",
                    "chuc_danh",
                    "dau_moi_lien_he",
                    "phone",
                    "muc_do_uu_tien",
                    "sale",
                ]}
            />
        </CrmShell>
    );
}
