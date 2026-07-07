export type SheetName = "danhsach" | "quatrian" | "chuongtrinh" | "taikhoan" | "daumoi";

export type RowRecord = Record<string, string | number | null> & {
    _row: number;
};

export const SHEETS: Record<SheetName, string[]> = {
    danhsach: [
        "MA_KH",
        "ten_truong",
        "cap_hoc",
        "khu_vuc",
        "chuc_danh",
        "dau_moi_lien_he",
        "phone",
        "sale",
        "so_luong_hoc_sinh",
        "muc_do_uu_tien",
        "dac_diem_khach_hang",
        "ngay_cap_nhat",
    ],
    quatrian: [
        "ngay_tang",
        "ten_truong",
        "nguoi_nhan",
        "chuc_danh",
        "sale",
        "ten_qua",
        "so_luong_qua",
        "don_gia_qua",
        "Tong_tien_qua",
        "dip_tang",
        "status",
        "ngay_cap_nhat",
    ],
    chuongtrinh: [
        "ten_truong",
        "khu_vuc",
        "dau_moi_lien_he",
        "phone",
        "sale",
        "chuong_trinh",
        "so_luong",
        "don_gia",
        "doanh_thu",
        "ngay_du_kien",
        "status",
        "ghi_chu",
        "ngay_cap_nhat",
    ],
    taikhoan: [
        "username",
        "password",
        "salt",
        "name",
        "fullname",
        "role",
    ],
    daumoi: [
        "MA_KH",
        "ho_ten",
        "chuc_danh",
        "phone",
        "ngay_sinh",
        "ghi_chu",
        "ngay_cap_nhat",
    ],
};
