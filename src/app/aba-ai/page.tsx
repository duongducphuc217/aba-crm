"use client";

import { useEffect, useState, useRef } from "react";
import { CrmShell } from "@/components/crm-shell";
import { Badge, Button, Card, Input, Select } from "@/components/ui";
import { Sparkles, Trash2, Send, Settings, ArrowRight, ExternalLink, AlertCircle, CheckCircle2, Eye, EyeOff, Copy } from "lucide-react";

interface Message {
    role: "user" | "ai";
    text: string;
}

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Lỗi sao chép:", err);
        }
    };

    return (
        <button
            onClick={handleCopy}
            className="absolute top-2 right-2 p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100 shadow-sm z-10"
            title="Sao chép nội dung"
        >
            {copied ? (
                <CheckCircle2 size={13} className="text-emerald-500" />
            ) : (
                <Copy size={13} />
            )}
        </button>
    );
}

export default function AbaAiPage() {
    // API Configuration states
    const [provider, setProvider] = useState("Gemini");
    const [baseUrl, setBaseUrl] = useState("");
    const [model, setModel] = useState("gemini-2.5-flash");
    const [apiKey, setApiKey] = useState("");

    // Modal controls
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    
    // Modal input states (temp buffers)
    const [tempProvider, setTempProvider] = useState("Gemini");
    const [tempBaseUrl, setTempBaseUrl] = useState("");
    const [tempModel, setTempModel] = useState("gemini-2.5-flash");
    const [tempApiKey, setTempApiKey] = useState("");
    const [showApiKey, setShowApiKey] = useState(false);

    // Chat states
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [loadingChat, setLoadingChat] = useState(false);
    
    // Data statistics
    const [loadingStats, setLoadingStats] = useState(true);
    const [stats, setStats] = useState({
        customers: 0,
        programs: 0,
        gifts: 0,
        contacts: 0
    });
    const [crmContextData, setCrmContextData] = useState<any>(null);

    const chatEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll chat area
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Load configs from LocalStorage
    useEffect(() => {
        const savedProvider = localStorage.getItem("aba_ai_provider") || "Gemini";
        const savedBaseUrl = localStorage.getItem("aba_ai_baseUrl") || "";
        const savedModel = localStorage.getItem("aba_ai_model") || (savedProvider === "Gemini" ? "gemini-2.5-flash" : "gpt-4o");
        const savedApiKey = localStorage.getItem("aba_ai_apiKey") || "";

        setProvider(savedProvider);
        setBaseUrl(savedBaseUrl);
        setModel(savedModel);
        setApiKey(savedApiKey);
    }, []);

    // Load CRM data for stats and contextual analysis
    useEffect(() => {
        async function loadCrmData() {
            try {
                const [resC, resP, resG, resD] = await Promise.all([
                    fetch("/api/sheets/danhsach").then(r => r.ok ? r.json() : { rows: [] }),
                    fetch("/api/sheets/chuongtrinh").then(r => r.ok ? r.json() : { rows: [] }),
                    fetch("/api/sheets/quatrian").then(r => r.ok ? r.json() : { rows: [] }),
                    fetch("/api/sheets/daumoi").then(r => r.ok ? r.json() : { rows: [] })
                ]);
                
                const cCount = resC.rows?.length || 0;
                const pCount = resP.rows?.length || 0;
                const gCount = resG.rows?.length || 0;
                const dCount = resD.rows?.length || 0;

                setStats({
                    customers: cCount,
                    programs: pCount,
                    gifts: gCount,
                    contacts: dCount
                });

                // Generate a highly compact contextual snapshot of the sheets to avoid token bloating
                setCrmContextData({
                    danh_sach_khach_hang: resC.rows?.map((r: any) => ({
                        ma: r.MA_KH,
                        ten: r.ten_truong,
                        lien_he: r.dau_moi_lien_he,
                        chuc_danh: r.chuc_danh,
                        phone: r.phone,
                        cap_hoc: r.cap_hoc,
                        khu_vuc: r.khu_vuc,
                        sale: r.sale,
                        uu_tien: r.muc_do_uu_tien
                    })),
                    chuong_trinh_giang_day: resP.rows?.map((r: any) => ({
                        ma_kh: r.MA_KH,
                        truong: r.ten_truong,
                        ten_chuong_trinh: r.ten_chuong_trinh,
                        doanh_thu: r.doanh_thu,
                        trang_thai: r.status,
                        ngay: r.ngay_dien_ra
                    })),
                    qua_tang_tri_an: resG.rows?.map((r: any) => ({
                        ma_kh: r.MA_KH,
                        truong: r.ten_truong,
                        nguoi_nhan: r.nguoi_nhan,
                        chuc_danh: r.chuc_danh,
                        qua: r.ten_qua,
                        sl: r.so_luong_qua,
                        gia: r.don_gia_qua,
                        tong: r.Tong_tien_qua,
                        ngay: r.ngay_trao
                    })),
                    dau_moi_phu_them: resD.rows?.map((r: any) => ({
                        ma_kh: r.MA_KH,
                        ten: r.ho_ten,
                        chuc_danh: r.chuc_danh,
                        phone: r.phone,
                        ngay_sinh: r.ngay_sinh,
                        ghi_chu: r.ghi_chu
                    }))
                });
            } catch (err) {
                console.error("Lỗi đồng bộ dữ liệu CRM:", err);
            } finally {
                setLoadingStats(false);
            }
        }
        loadCrmData();
    }, []);

    // Open settings modal and copy current config values to temp inputs
    function openSettings() {
        setTempProvider(provider);
        setTempBaseUrl(baseUrl);
        setTempModel(model);
        setTempApiKey(apiKey);
        setShowSettingsModal(true);
    }

    // Save configurations
    function saveSettings() {
        localStorage.setItem("aba_ai_provider", tempProvider);
        localStorage.setItem("aba_ai_baseUrl", tempBaseUrl);
        localStorage.setItem("aba_ai_model", tempModel);
        localStorage.setItem("aba_ai_apiKey", tempApiKey);

        setProvider(tempProvider);
        setBaseUrl(tempBaseUrl);
        setModel(tempModel);
        setApiKey(tempApiKey);

        setShowSettingsModal(false);
    }

    // Direct API calling logic
    async function sendMessage(textToSend?: string) {
        const queryText = (textToSend || inputValue).trim();
        if (!queryText) return;

        if (!textToSend) {
            setInputValue("");
        }

        // 1. Add User Message
        const newMessages = [...messages, { role: "user", text: queryText } as Message];
        setMessages(newMessages);

        // 2. Validate API Key config
        if (!apiKey.trim()) {
            setMessages(prev => [
                ...prev,
                {
                    role: "ai",
                    text: `${provider} AI chưa được kết nối. Vui lòng bấm "Thiết lập AI", chọn provider/model và nhập API key trước khi chat.`
                }
            ]);
            return;
        }

        setLoadingChat(true);

        try {
            // Context system instruction
            const systemPrompt = `Bạn là Trợ lý AI phân tích dữ liệu CRM chính thức của trung tâm ABA.
Nhiệm vụ của bạn là đọc và phân tích toàn bộ dữ liệu CRM được cung cấp bên dưới để trả lời chính xác, thông minh câu hỏi của người dùng.
Hãy trả lời bằng tiếng Việt một cách cô đọng, chuyên nghiệp và có cấu trúc rõ ràng.

DƯỚI ĐÂY LÀ DỮ LIỆU CRM HIỆN TẠI (Được xuất thời gian thực từ Google Sheets):
${JSON.stringify(crmContextData, null, 2)}`;

            const res = await fetch("/api/ai/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    provider,
                    baseUrl,
                    model,
                    apiKey,
                    systemPrompt,
                    messages,
                    query: queryText
                })
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || "Không nhận được phản hồi từ AI server.");
            }

            const data = await res.json();
            const aiResponseText = data.text;

            setMessages(prev => [...prev, { role: "ai", text: aiResponseText }]);

        } catch (err: any) {
            console.error("Lỗi truy vấn AI:", err);
            setMessages(prev => [
                ...prev,
                { role: "ai", text: `Đã xảy ra lỗi khi kết nối với mô hình AI: ${err.message || err}` }
            ]);
        } finally {
            setLoadingChat(false);
        }
    }

    // Render simple markdown styling for code/lists/bold formatting
    function formatMessageText(text: string) {
        let html = text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
        
        // **bold** text mapping
        html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
        
        const lines = html.split("\n");
        return (
            <div className="space-y-1">
                {lines.map((line, idx) => {
                    const trimmed = line.trim();
                    if (!trimmed) {
                        return <div key={idx} className="h-1.5" />; // Small compact spacing for empty lines
                    }
                    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
                        return (
                            <li key={idx} className="list-disc ml-4 text-slate-700 leading-relaxed font-medium text-sm" dangerouslySetInnerHTML={{ __html: trimmed.substring(2) }} />
                        );
                    }
                    if (/^\d+\.\s/.test(trimmed)) {
                        const content = trimmed.replace(/^\d+\.\s/, "");
                        return (
                            <li key={idx} className="list-decimal ml-4 text-slate-700 leading-relaxed font-medium text-sm" dangerouslySetInnerHTML={{ __html: content }} />
                        );
                    }
                    if (trimmed.startsWith("### ")) {
                        return (
                            <h4 key={idx} className="text-sm font-bold text-slate-900 mt-2 mb-1" dangerouslySetInnerHTML={{ __html: trimmed.substring(4) }} />
                        );
                    }
                    if (trimmed.startsWith("## ")) {
                        return (
                            <h3 key={idx} className="text-base font-black text-slate-950 mt-3 mb-1.5" dangerouslySetInnerHTML={{ __html: trimmed.substring(3) }} />
                        );
                    }
                    return (
                        <p key={idx} className="text-slate-700 leading-relaxed font-medium text-sm md:text-[14px]" dangerouslySetInnerHTML={{ __html: line }} />
                    );
                })}
            </div>
        );
    }

    // Toggle provider choice and auto-assign common endpoints/models
    function handleProviderChange(val: string) {
        setTempProvider(val);
        if (val === "Gemini") {
            setTempBaseUrl("");
            setTempModel("gemini-2.5-flash");
        } else if (val === "OpenAI-compatible") {
            setTempBaseUrl("https://api.openai.com/v1");
            setTempModel("gpt-4o");
        } else if (val === "Anthropic-compatible") {
            setTempBaseUrl("https://api.anthropic.com/v1");
            setTempModel("claude-3-5-sonnet-20241022");
        }
    }

    return (
        <CrmShell title="ABA AI">
            <div className="flex flex-col gap-6">
                
                {/* ── Page Header ── */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                            <Sparkles className="text-indigo-600 w-6 h-6 animate-pulse" /> ABA AI
                        </h2>
                        <p className="mt-0.5 text-sm text-slate-500">Trợ lý dữ liệu riêng của CRM: hiểu câu hỏi, lọc đúng dữ liệu liên quan rồi mới phân tích và đề xuất.</p>
                    </div>
                    <Button 
                        onClick={openSettings}
                        className="inline-flex items-center gap-2 bg-indigo-600 h-10 px-4 rounded-xl text-sm font-semibold !text-white shadow-sm hover:bg-indigo-700 active:bg-indigo-800 cursor-pointer shrink-0"
                    >
                        <Settings size={16} /> Thiết lập AI
                    </Button>
                </div>

                {/* ── Main Layout ── */}
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-4 items-start">
                    
                    {/* ── Left Sidebar (AI Status & Counters) ── */}
                    <div className="xl:col-span-1 space-y-4">
                        <Card className="p-5 flex flex-col gap-4">
                            
                            {/* Gemini Connectivity state */}
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Trạng thái AI</h3>
                                <div className="mt-2 flex items-center gap-2">
                                    {apiKey ? (
                                        <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-2.5 py-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-ping" />
                                            Đã kết nối {provider}
                                        </Badge>
                                    ) : (
                                        <Badge className="bg-slate-50 text-slate-600 border border-slate-200 font-bold px-2.5 py-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1" />
                                            Chưa kết nối AI
                                        </Badge>
                                    )}
                                </div>
                            </div>

                            {/* 2x2 stats grids from live sheets */}
                            <div className="grid grid-cols-2 gap-2 mt-1">
                                <div className="border border-slate-100 bg-slate-50 p-2.5 rounded-xl text-center min-w-0">
                                    <div className="text-2xl font-black text-slate-800 truncate">
                                        {loadingStats ? "..." : stats.customers}
                                    </div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase mt-0.5 truncate">khách hàng</div>
                                </div>
                                <div className="border border-slate-100 bg-slate-50 p-2.5 rounded-xl text-center min-w-0">
                                    <div className="text-2xl font-black text-slate-800 truncate">
                                        {loadingStats ? "..." : stats.programs}
                                    </div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase mt-0.5 truncate">chương trình</div>
                                </div>
                                <div className="border border-slate-100 bg-slate-50 p-2.5 rounded-xl text-center min-w-0">
                                    <div className="text-2xl font-black text-slate-800 truncate">
                                        {loadingStats ? "..." : stats.gifts}
                                    </div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase mt-0.5 truncate">quà đã tặng</div>
                                </div>
                                <div className="border border-slate-100 bg-slate-50 p-2.5 rounded-xl text-center min-w-0">
                                    <div className="text-2xl font-black text-slate-800 truncate">
                                        {loadingStats ? "..." : stats.contacts}
                                    </div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase mt-0.5 truncate">đầu mối</div>
                                </div>
                            </div>

                            {/* Configuration spec */}
                            <div className="border border-slate-100 bg-slate-50/50 p-3.5 rounded-xl text-xs space-y-2 text-slate-500 font-medium">
                                <div className="truncate"><strong className="text-slate-700 font-bold">Provider:</strong> {provider}</div>
                                {baseUrl && <div className="truncate"><strong className="text-slate-700 font-bold">Base URL:</strong> {baseUrl}</div>}
                                <div className="truncate"><strong className="text-slate-700 font-bold">Model:</strong> {model}</div>
                                <div><strong className="text-slate-700 font-bold">API Key:</strong> {apiKey ? "Đã lưu bảo mật" : "Chưa cấu hình"}</div>
                            </div>

                            {/* Prompt helper links */}
                            <div className="space-y-2 pt-2 border-t border-slate-100">
                                <button
                                    onClick={() => sendMessage("Hãy viết một mẫu tin nhắn SMS/Zalo ngắn gọn, ấm áp để gửi chúc mừng sinh nhật hoặc chúc mừng ngày nhà giáo Việt Nam tới đầu mối liên hệ chính của một trường học trong danh sách CRM.")}
                                    disabled={loadingChat}
                                    className="w-full text-left bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold px-3 py-2 rounded-xl text-xs cursor-pointer transition text-ellipsis overflow-hidden whitespace-nowrap block"
                                >
                                    Viết tin nhắn chúc mừng
                                </button>
                                <button
                                    onClick={() => sendMessage("Hãy viết một bài đăng truyền thông hấp dẫn cho Fanpage hoặc Zalo để giới thiệu về chương trình giảng dạy của ABA, hướng tới các đối tượng hiệu trưởng và thầy cô giáo trường học.")}
                                    disabled={loadingChat}
                                    className="w-full text-left bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold px-3 py-2 rounded-xl text-xs cursor-pointer transition text-ellipsis overflow-hidden whitespace-nowrap block"
                                >
                                    Viết bài fanpage / zalo
                                </button>
                                <button
                                    onClick={() => sendMessage("Hãy thiết kế một kịch bản gọi điện (telesales script) tư vấn chi tiết cho nhân viên sale của ABA khi gọi điện giới thiệu chương trình tới một trường học.")}
                                    disabled={loadingChat}
                                    className="w-full text-left bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold px-3 py-2 rounded-xl text-xs cursor-pointer transition text-ellipsis overflow-hidden whitespace-nowrap block"
                                >
                                    Tạo kịch bản tư vấn gọi điện
                                </button>
                            </div>

                        </Card>
                    </div>

                    {/* ── Right Panel (Chat Workspace) ── */}
                    <div className="xl:col-span-3">
                        <Card className="flex flex-col h-[650px] overflow-hidden">
                            
                            {/* Workspace Header */}
                            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
                                <div>
                                    <h3 className="text-sm font-black text-slate-800">ABA AI Workspace</h3>
                                    <p className="text-[11px] font-bold text-slate-400 uppercase mt-0.5">AI tự xác định module liên quan và chỉ đọc tập dữ liệu cần thiết cho câu hỏi.</p>
                                </div>
                                <button
                                    onClick={() => setMessages([])}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-500 hover:text-red-500 hover:border-red-200 transition cursor-pointer"
                                >
                                    <Trash2 size={13} /> Xóa màn hình chat
                                </button>
                            </div>

                            {/* Chat Scroll Feed */}
                            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/20">
                                {messages.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm gap-3">
                                        <Sparkles className="w-10 h-10 text-indigo-300 animate-pulse" />
                                        <p className="font-semibold">Màn hình trống. Hãy đặt câu hỏi phân tích dữ liệu CRM của bạn!</p>
                                    </div>
                                ) : (
                                    messages.map((m, idx) => (
                                        <div 
                                            key={idx} 
                                            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                                        >
                                            <div 
                                                className={`relative group max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm leading-relaxed ${
                                                    m.role === "user" 
                                                        ? "bg-indigo-600 text-white font-semibold rounded-br-none" 
                                                        : "bg-white border border-slate-200 text-slate-800 rounded-bl-none font-medium"
                                                }`}
                                            >
                                                {m.role === "ai" && (
                                                    <CopyButton text={m.text} />
                                                )}
                                                {m.role === "user" ? (
                                                    <p className="whitespace-pre-wrap">{m.text}</p>
                                                ) : (
                                                    formatMessageText(m.text)
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                                
                                {loadingChat && (
                                    <div className="flex justify-start">
                                        <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex items-center gap-2 text-slate-400 text-xs font-bold animate-pulse">
                                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" />
                                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce delay-100" />
                                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce delay-200" />
                                            ABA AI đang phân tích dữ liệu...
                                        </div>
                                    </div>
                                )}
                                <div ref={chatEndRef} />
                            </div>

                            {/* Chat Input form footer */}
                            <div className="p-4 border-t border-slate-100 shrink-0 bg-white flex gap-2 items-center">
                                <textarea
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                            e.preventDefault();
                                            sendMessage();
                                        }
                                    }}
                                    placeholder="Hỏi AI về khách hàng, chương trình, kịch bản tư vấn, doanh thu..."
                                    className="flex-1 min-h-[44px] max-h-[120px] rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-none font-medium"
                                />
                                <button
                                    onClick={() => sendMessage()}
                                    disabled={loadingChat || !inputValue.trim()}
                                    className="bg-indigo-600 text-white rounded-xl h-11 w-11 flex items-center justify-center shadow-md hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-40 disabled:pointer-events-none cursor-pointer shrink-0 transition"
                                >
                                    <Send size={16} />
                                </button>
                            </div>

                        </Card>
                    </div>

                </div>

            </div>

            {/* ── Modal Thiết lập AI ────────────────────────────────── */}
            {showSettingsModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
                    <div className="relative w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                        
                        {/* Modal Header */}
                        <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-black tracking-tight">Thiết lập AI</h3>
                                <p className="text-xs text-slate-400 mt-1">Cấu hình provider, model và API key để AI hoạt động thật.</p>
                            </div>
                            <button
                                onClick={() => setShowSettingsModal(false)}
                                className="text-slate-400 hover:text-white rounded-lg p-1 transition cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-6">
                            
                            <div className="border-b border-slate-100 pb-4 flex items-center justify-between gap-4">
                                <div>
                                    <h4 className="text-base font-black text-slate-800">Kết nối ABA AI</h4>
                                    <p className="text-xs text-slate-500 mt-1">Thiết lập provider, model và API key để trợ lý đọc đúng dữ liệu CRM liên quan đến từng câu hỏi.</p>
                                </div>
                                <Badge className="bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 text-[10px] font-bold">
                                    ● Gemini API
                                </Badge>
                            </div>

                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                
                                {/* Left Column: Form Fields */}
                                <div className="space-y-4">
                                    
                                    {/* Select Provider */}
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">AI Provider</label>
                                        <Select
                                            value={tempProvider}
                                            onChange={(e) => handleProviderChange(e.target.value)}
                                        >
                                            <option value="Gemini">Gemini</option>
                                            <option value="OpenAI-compatible">OpenAI-compatible</option>
                                            <option value="Anthropic-compatible">Anthropic-compatible</option>
                                        </Select>
                                    </div>

                                    {/* Base URL (only for OpenAI/Anthropic compatible) */}
                                    {tempProvider !== "Gemini" && (
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Base URL</label>
                                            <Input
                                                value={tempBaseUrl}
                                                onChange={(e) => setTempBaseUrl(e.target.value)}
                                                placeholder={tempProvider === "OpenAI-compatible" ? "https://api.openai.com/v1" : "https://api.anthropic.com/v1"}
                                                required
                                            />
                                        </div>
                                    )}

                                    {/* Model field */}
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">AI Model</label>
                                        {tempProvider === "Gemini" ? (
                                            <Select
                                                value={tempModel}
                                                onChange={(e) => setTempModel(e.target.value)}
                                            >
                                                <option value="gemini-2.5-flash">Gemini 2.5 Flash – khuyến nghị</option>
                                                <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                                                <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite</option>
                                            </Select>
                                        ) : (
                                            <Input
                                                value={tempModel}
                                                onChange={(e) => setTempModel(e.target.value)}
                                                placeholder={tempProvider === "OpenAI-compatible" ? "gpt-4o" : "claude-3-5-sonnet-20241022"}
                                                required
                                            />
                                        )}
                                    </div>

                                    {/* API Key */}
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400 font-black">API KEY</label>
                                        <div className="relative flex items-center">
                                            <Input
                                                type={showApiKey ? "text" : "password"}
                                                value={tempApiKey}
                                                onChange={(e) => setTempApiKey(e.target.value)}
                                                placeholder="Đã cấu hình - để trống nếu muốn giữ nguyên"
                                                className="pr-10 w-full"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowApiKey(!showApiKey)}
                                                className="absolute right-3 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                                            >
                                                {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                        <span className="text-[10px] text-slate-400 font-semibold">API key đang được lưu bảo mật phía máy chủ/localStorage của bạn.</span>
                                    </div>

                                </div>

                                {/* Right Column: Guide Instructions */}
                                <div className="border border-slate-100 bg-slate-50/50 p-5 rounded-2xl space-y-4">
                                    <h4 className="text-sm font-black text-slate-800">Lấy API key {tempProvider.replace("-compatible", "")}</h4>
                                    <p className="text-xs text-slate-500 leading-relaxed font-medium">Chọn đúng provider, model và cung cấp khóa API key tương ứng để kích hoạt trợ lý AI của CRM hoạt động thực tế.</p>
                                    
                                    <div className="space-y-3">
                                        <div className="flex gap-3 items-start">
                                            <span className="w-5 h-5 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">1</span>
                                            <p className="text-xs text-slate-600 font-medium">Truy cập vào trang quản trị API Studio của nhà cung cấp để tạo khóa.</p>
                                        </div>
                                        <div className="flex gap-3 items-start">
                                            <span className="w-5 h-5 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">2</span>
                                            <p className="text-xs text-slate-600 font-medium">Chọn tạo API Key mới, sao chép chuỗi mã khóa bí mật được hiển thị.</p>
                                        </div>
                                        <div className="flex gap-3 items-start">
                                            <span className="w-5 h-5 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">3</span>
                                            <p className="text-xs text-slate-600 font-medium">Dán khóa vào ô API KEY bên trái, điền Base URL/Model tương thích nếu cần và Lưu thiết lập.</p>
                                        </div>
                                    </div>

                                    {/* Action Links & Alerts */}
                                    <div className="pt-2">
                                        {tempProvider === "Gemini" ? (
                                            <a
                                                href="https://aistudio.google.com/"
                                                target="_blank"
                                                rel="noreferrer"
                                                className="w-full h-10 border border-slate-200 bg-slate-900 text-white rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold cursor-pointer hover:bg-slate-800 transition"
                                            >
                                                Mở Google AI Studio <ArrowRight size={13} />
                                            </a>
                                        ) : tempProvider === "OpenAI-compatible" ? (
                                            <a
                                                href="https://platform.openai.com/api-keys"
                                                target="_blank"
                                                rel="noreferrer"
                                                className="w-full h-10 border border-slate-200 bg-slate-900 text-white rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold cursor-pointer hover:bg-slate-800 transition"
                                            >
                                                Mở OpenAI Platform <ArrowRight size={13} />
                                            </a>
                                        ) : (
                                            <a
                                                href="https://console.anthropic.com/"
                                                target="_blank"
                                                rel="noreferrer"
                                                className="w-full h-10 border border-slate-200 bg-slate-900 text-white rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold cursor-pointer hover:bg-slate-800 transition"
                                            >
                                                Mở Anthropic Console <ArrowRight size={13} />
                                            </a>
                                        )}
                                    </div>

                                    <div className="rounded-xl bg-orange-50 border border-orange-200/60 p-3 text-orange-700 text-[11px] leading-relaxed font-semibold flex gap-2">
                                        <AlertCircle size={15} className="shrink-0 mt-0.5 text-orange-600" />
                                        <span>Nếu key hết quota/free tier hoặc billing chưa bật, CRM sẽ báo rõ để bạn nạp tiền hoặc đổi key.</span>
                                    </div>

                                </div>

                            </div>

                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2 shrink-0">
                            <button
                                onClick={() => setShowSettingsModal(false)}
                                className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={saveSettings}
                                className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold cursor-pointer shadow-sm shadow-indigo-100"
                            >
                                Lưu thiết lập AI
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </CrmShell>
    );
}

// Simple absolute close X component definition locally to avoid layout imports bloating
function X({ size }: { size: number }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
    );
}
