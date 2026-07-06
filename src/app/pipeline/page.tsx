import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CrmShell } from "@/components/crm-shell";
import { PipelineBoard } from "@/components/pipeline-board";
import { readSheet } from "@/lib/excel-store";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
    const rows = await readSheet("chuongtrinh");

    return (
        <CrmShell title="Pipeline">
            <div className="space-y-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h2 className="text-2xl font-black tracking-tight text-slate-900">Pipeline chương trình</h2>
                        <p className="mt-1 text-sm text-slate-500">
                            Kéo thả card chương trình giữa 3 trạng thái: Order mới, Đang trao đổi, Đã chốt. Trạng thái sẽ được lưu lại vào file Excel.
                        </p>
                    </div>
                    <Link href="/chuong-trinh" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
                        Xem danh sách chương trình <ArrowRight size={16} />
                    </Link>
                </div>

                <PipelineBoard initialRows={rows} />
            </div>
        </CrmShell>
    );
}
