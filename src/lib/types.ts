export type SheetName = "danhsach" | "quatrian" | "chuongtrinh";

export type RowRecord = Record<string, string | number | null> & {
    _row: number;
};

export const SHEETS: Record<SheetName, string[]> = {
    danhsach: [
        "MA_KH",
        "ten_truong",
        "cap_hoc",
        "khu_vuc",
        "hieu_truong",
        "phone",
        "sale",
        "so_luong_hoc_sinh",
        "muc_do_uu_tien",
    ],
    quatrian: [
        "ngay_tang",
        "ten_truong",
        "hieu_truong",
        "sale",
        "ten_qua",
        "so_luong_qua",
        "don_gia_qua",
        "Tong_tien_qua",
        "dip_tang",
        "status",
    ],
    chuongtrinh: [
        "ten_truong",
        "khu_vuc",
        "hieu_truong",
        "phone",
        "sale",
        "chuong_trinh",
        "so_luong",
        "don_gia",
        "doanh_thu",
        "ngay_du_kien",
        "status",
        "ghi_chu",
    ],
};
