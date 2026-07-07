"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Phone, Briefcase, FileText, Plus, Pencil, Trash2, Loader2, X } from "lucide-react";
import { Card, Button, Input, Select } from "@/components/ui";
import type { RowRecord } from "@/lib/types";

interface ContactsManagerProps {
    contacts: RowRecord[];
    customerId: string;
}

export function ContactsManager({ contacts, customerId }: ContactsManagerProps) {
    const router = useRouter();
    const [showModal, setShowModal] = useState(false);
    const [editingContact, setEditingContact] = useState<RowRecord | null>(null);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const [form, setForm] = useState({
        ho_ten: "",
        chuc_danh: "Hiệu trưởng",
        phone: "",
        ghi_chu: "",
    });

    function openAdd() {
        setEditingContact(null);
        setForm({
            ho_ten: "",
            chuc_danh: "Hiệu trưởng",
            phone: "",
            ghi_chu: "",
        });
        setErrorMsg("");
        setShowModal(true);
    }

    function openEdit(contact: RowRecord) {
        setEditingContact(contact);
        setForm({
            ho_ten: String(contact.ho_ten || ""),
            chuc_danh: String(contact.chuc_danh || "Hiệu trưởng"),
            phone: String(contact.phone || ""),
            ghi_chu: String(contact.ghi_chu || ""),
        });
        setErrorMsg("");
        setShowModal(true);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.ho_ten.trim()) {
            setErrorMsg("Vui lòng nhập họ tên cán bộ.");
            return;
        }
        if (!form.phone.trim()) {
            setErrorMsg("Vui lòng nhập số điện thoại.");
            return;
        }

        setLoading(true);
        setErrorMsg("");

        try {
            const isEdit = !!editingContact;
            const url = "/api/sheets/daumoi";
            const method = isEdit ? "PUT" : "POST";
            const body = isEdit 
                ? { ...form, _row: editingContact._row, MA_KH: customerId } 
                : { ...form, MA_KH: customerId };

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || "Không thể lưu thông tin.");
            }

            setShowModal(false);
            router.refresh();
        } catch (err: any) {
            setErrorMsg(err.message || "Đã xảy ra lỗi.");
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(contact: RowRecord) {
        if (!confirm(`Bạn có chắc chắn muốn xóa đầu mối ${contact.ho_ten}?`)) return;

        setLoading(true);
        try {
            const res = await fetch(`/api/sheets/daumoi?row=${contact._row}`, {
                method: "DELETE",
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || "Không thể xóa.");
            }
            router.refresh();
        } catch (err: any) {
            alert(err.message || "Đã xảy ra lỗi khi xóa.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h3 className="text-base font-black text-slate-900">Đầu mối liên hệ bổ sung</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Danh sách các cán bộ liên hệ phụ trách tại trường này</p>
                </div>
                <Button
                    onClick={openAdd}
                    className="h-9 gap-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 cursor-pointer rounded-lg font-semibold"
                >
                    <Plus size={15} /> Thêm đầu mối
                </Button>
            </div>

            {contacts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50">
                    <User className="stroke-1 text-slate-300" size={32} />
                    <span className="text-xs mt-1.5 font-medium">Chưa có đầu mối bổ sung</span>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                    {contacts.map((contact) => (
                        <div key={contact._row} className="relative group rounded-xl border border-slate-100 bg-slate-50 p-3 flex flex-col justify-between min-h-[100px]">
                            {/* Actions overlay */}
                            <div className="absolute top-2 right-2 flex items-center gap-1 opacity-60 group-hover:opacity-100 transition">
                                <button
                                    onClick={() => openEdit(contact)}
                                    className="p-1 hover:bg-white rounded hover:shadow-sm text-slate-500 hover:text-indigo-600 cursor-pointer"
                                    title="Sửa"
                                >
                                    <Pencil size={13} />
                                </button>
                                <button
                                    onClick={() => handleDelete(contact)}
                                    className="p-1 hover:bg-white rounded hover:shadow-sm text-slate-500 hover:text-red-600 cursor-pointer"
                                    title="Xóa"
                                >
                                    <Trash2 size={13} />
                                </button>
                            </div>

                            <div className="min-w-0 pr-12">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-sm font-semibold text-slate-800 truncate">{contact.ho_ten}</span>
                                    <span className="inline-block shrink-0 px-1.5 py-0.5 text-[10px] font-semibold bg-indigo-50 text-indigo-700 rounded-md border border-indigo-100">
                                        {contact.chuc_danh}
                                    </span>
                                </div>
                                <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-600">
                                    <Phone size={13} className="text-slate-400" />
                                    <a href={`tel:${contact.phone}`} className="hover:underline hover:text-indigo-600 font-medium">
                                        {contact.phone}
                                    </a>
                                </div>
                                {contact.ghi_chu && (
                                    <div className="mt-1.5 flex items-start gap-1.5 text-xs text-slate-500 bg-white p-1.5 rounded border border-slate-100 leading-relaxed whitespace-pre-wrap">
                                        <FileText size={13} className="text-slate-300 shrink-0 mt-0.5" />
                                        <span>{contact.ghi_chu}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal Form */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
                    <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">
                        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                                {editingContact ? "Cập nhật đầu mối" : "Thêm đầu mối mới"}
                            </h4>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-1 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-5 space-y-4">
                            {errorMsg && (
                                <div className="p-3 text-xs bg-red-50 text-red-600 border border-red-100 rounded-xl font-medium">
                                    {errorMsg}
                                </div>
                            )}

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Họ và tên</label>
                                <Input
                                    value={form.ho_ten}
                                    onChange={(e) => setForm(prev => ({ ...prev, ho_ten: e.target.value }))}
                                    placeholder="Nguyễn Văn A"
                                    required
                                    disabled={loading}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Chức danh</label>
                                    <Select
                                        value={form.chuc_danh}
                                        onChange={(e) => setForm(prev => ({ ...prev, chuc_danh: e.target.value }))}
                                        disabled={loading}
                                    >
                                        <option value="Hiệu trưởng">Hiệu trưởng</option>
                                        <option value="Hiệu phó">Hiệu phó</option>
                                        <option value="Tổng phụ trách">Tổng phụ trách</option>
                                        <option value="Chủ tịch công đoàn">Chủ tịch công đoàn</option>
                                        <option value="Cán bộ phụ trách">Cán bộ phụ trách</option>
                                        <option value="Khác">Khác</option>
                                    </Select>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Số điện thoại</label>
                                    <Input
                                        type="tel"
                                        value={form.phone}
                                        onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                                        placeholder="0987xxxxxx"
                                        required
                                        disabled={loading}
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Ghi chú</label>
                                <textarea
                                    value={form.ghi_chu}
                                    onChange={(e) => setForm(prev => ({ ...prev, ghi_chu: e.target.value }))}
                                    placeholder="Thông tin lưu ý thêm..."
                                    disabled={loading}
                                    className="w-full min-h-[70px] px-3 py-2 text-sm rounded-xl border border-slate-200 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-400 text-slate-800"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                                <Button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    disabled={loading}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-xl"
                                >
                                    Hủy
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 shadow-sm rounded-xl gap-2 cursor-pointer"
                                >
                                    {loading && <Loader2 size={16} className="animate-spin" />}
                                    Lưu lại
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Card>
    );
}
