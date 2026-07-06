import Link from "next/link";
import { ArrowRight, BarChart3, Gift, GraduationCap, Sparkles, Users } from "lucide-react";

const items = [
  ["Dashboard", "/dashboard", "Tổng quan KPI, doanh thu, chi phí và xu hướng theo kỳ.", BarChart3],
  ["Khách hàng", "/khach-hang", "Danh sách trường, bộ lọc thông minh và chỉnh sửa dữ liệu Excel.", Users],
  ["Quà tặng", "/qua-tang", "Lịch sử chăm sóc, trạng thái gửi/nhận và ngân sách tri ân.", Gift],
  ["Chương trình", "/chuong-trinh", "Cơ hội bán hàng, chương trình đã chốt và doanh thu dự kiến.", GraduationCap],
] as const;

export default function Home() {
  return (
    <main className="min-h-screen px-6 py-8 md:px-10">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] border border-white/70 bg-white/80 shadow-2xl shadow-slate-200/70 backdrop-blur-xl">
        <section className="relative p-8 md:p-12">
          <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-indigo-100 blur-3xl" />
          <div className="absolute bottom-0 left-20 h-56 w-56 rounded-full bg-sky-100 blur-3xl" />
          <div className="relative max-w-4xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-4 py-2 text-sm font-black text-indigo-600">
              <Sparkles size={16} /> ABA School CRM
            </div>
            <h1 className="text-4xl font-black tracking-tight text-slate-950 md:text-6xl">Dashboard quản lý khách hàng từ Excel</h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">Giao diện CRM hiện đại để quản lý trường học, chương trình, quà tặng và doanh thu dự kiến trực tiếp từ file Excel nội bộ.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white shadow-xl shadow-indigo-200 transition hover:-translate-y-0.5 hover:bg-indigo-700">Mở Dashboard <ArrowRight size={17} /></Link>
              <Link href="/khach-hang" className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5">Quản lý khách hàng</Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 border-t border-slate-200/80 bg-slate-50/60 p-6 md:grid-cols-4 md:p-8">
          {items.map(([title, href, desc, Icon]) => (
            <Link key={href} href={href} className="group rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200">
              <div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-700 transition group-hover:bg-indigo-50 group-hover:text-indigo-600">
                <Icon size={21} />
              </div>
              <div className="text-lg font-black text-slate-950">{title}</div>
              <p className="mt-2 text-sm leading-6 text-slate-600">{desc}</p>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
