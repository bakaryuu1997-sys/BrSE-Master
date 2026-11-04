"use client";

import { useState } from "react";
import { 
  ClipboardCheck, 
  Sparkles, 
  Loader2, 
  CheckCircle2, 
  BookOpen, 
  AlertCircle, 
  FileText, 
  Copy, 
  Send, 
  Info,
  HelpCircle,
  ShieldCheck,
  Zap,
  CornerDownRight,
  Flame,
  MousePointerClick
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotify } from "@/components/ToastProvider";
import { REQUIREMENT_CHECKLIST_GROUPS, REQUIREMENT_PROMPTS, REQUIREMENT_PLAYBOOKS } from "./useKeigoState";
import { useSpeechSynthesis } from "./useSpeechSynthesis";
import { TtsButton } from "./TtsButton";
import { PolitenessMeter } from "./PolitenessMeter";

interface KeigoRequirementPanelProps {
  t: any;
  requirementContext: string;
  setRequirementContext: (val: string) => void;
  requirementQuestion: string;
  setRequirementQuestion: (val: string) => void;
  requirementReply: string;
  isRequirementLoading: boolean;
  requirementError: string;
  handleRequirementAsk: (questionOverride?: string) => void;
  setInputText?: (val: string) => void; // Optional call-back to push text to Keigo Editor
  setActiveMode?: (mode: "keigo" | "compose" | "requirement") => void;
}

interface ElicitationTemplate {
  category: string;
  scenario: string;
  explanation: string;
  vietnamese: string;
  japanese: string;
}

export function KeigoRequirementPanel({
  t,
  requirementContext,
  setRequirementContext,
  requirementQuestion,
  setRequirementQuestion,
  requirementReply,
  isRequirementLoading,
  requirementError,
  handleRequirementAsk,
  setInputText,
  setActiveMode,
}: KeigoRequirementPanelProps) {
  const [activeTab, setActiveTab] = useState<"blueprint" | "guide" | "templates" | "ai">("ai");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const { notify } = useNotify();
  const { speak, stop, isSpeaking } = useSpeechSynthesis();

  // Local state for 5W2H Blueprint Form
  const [blueprint, setBlueprint] = useState({
    title: "",
    context: "",
    users: "",
    inputs: "",
    validations: "",
    happyPath: "",
    exceptions: "",
    frequency: "",
    performance: "",
  });

  // Elicitation templates library: Expanded to 10 highly practical templates
  const ELICITATION_TEMPLATES: ElicitationTemplate[] = [
    {
      category: "1. Lựa chọn đề xuất (Proactive A/B Proposal)",
      scenario: "Khi đặc tả của khách hàng chưa rõ ràng, thay vì hỏi chung chung khiến họ tốn thời gian suy nghĩ, BrSE chủ động xây dựng sẵn 2 phương án A và B kèm theo phân tích ưu/nhược điểm rõ ràng để khách chọn nhanh chóng.",
      explanation: "Người Nhật đánh giá cực kỳ cao tính chủ động (Proactive). Đề xuất sẵn phương án thể hiện BrSE hiểu rõ nghiệp vụ và hệ thống của khách hàng.",
      vietnamese: "Về specs của tính năng, chúng tôi muốn xác nhận luồng hoạt động. Giữa phương án A (...) và phương án B (...), khách hàng mong muốn phương án nào hơn? Chúng tôi đề xuất phương án A vì sẽ mang lại trải nghiệm tốt nhất và tiện lợi nhất cho người dùng.",
      japanese: "〇〇の機能の仕様について確認させてください。〇〇の挙動について、A案（〇〇する）とB案（〇〇する）のどちらがよろしいでしょうか。弊社としては、ユーザーの利便性を考慮し、A案を推奨いたします。ご意見をいただけますと幸いです。",
    },
    {
      category: "2. Ràng buộc dữ liệu & Định dạng (Data Constraints & Formats)",
      scenario: "Làm rõ các giới hạn về độ dài dữ liệu (min/max), định dạng cho phép nhập (chỉ chữ số, chữ cái, hay tiếng Nhật có dấu), và cách xử lý khi nhập ký tự đặc biệt.",
      explanation: "Giúp phòng chống các lỗi nghiêm trọng như vỡ bố cục giao diện (layout break) hoặc lỗi tràn cơ sở dữ liệu (Database SQL Overflow).",
      vietnamese: "Xin vui lòng xác nhận ràng buộc dữ liệu đầu vào. Đối với mục (...), giới hạn ký tự tối đa là bao nhiêu? Ngoài ra, loại ký tự cho phép (chỉ chữ số, chữ cái tiếng Anh hay cho phép nhập tiếng Nhật) cụ thể như thế nào?",
      japanese: "入力項目の制限について確認させてください。〇〇の最大文字数および入力可能な文字種（英数字のみ、または日本語可）についてご指示いただけますでしょうか。よろしくお願いいたします。",
    },
    {
      category: "3. Trường hợp biên & Xử lý ngoại lệ (Edge Cases & Exception Paths)",
      scenario: "Làm rõ hành vi của hệ thống khi phát sinh lỗi ngoài mong muốn như mất kết nối mạng đột ngột khi đang giao dịch, click đúp nút Gửi, hoặc người dùng nhập dữ liệu trùng lặp.",
      explanation: "Làm rõ thông điệp thông báo lỗi (Error Message) cụ thể và thiết lập cơ chế chặn (double-click prevention) để bảo vệ tính toàn vẹn dữ liệu.",
      vietnamese: "Xin xác nhận về xử lý ngoại lệ. Trong trường hợp lỗi mạng đột ngột hoặc dữ liệu bắt buộc bị để trống khi bấm gửi, chúng tôi nên hiển thị thông báo lỗi thế nào? Ngoài ra, có cần kiểm soát chặn click đúp để tránh gửi trùng lặp dữ liệu không?",
      japanese: "例外処理について確認させてください。通信エラーが発生した場合、または必須項目が空の状態で送信された場合、どのようなエラーメッセージを表示すべきでしょうか。また、二重送信を防ぐための制御についてもご確認いただけますでしょうか。",
    },
    {
      category: "4. Sự phụ thuộc & Ảnh hưởng tính năng (Feature Dependencies)",
      scenario: "Hỏi khách hàng xem việc phát hành hoặc thay đổi một tính năng mới có làm thay đổi hay gây ảnh hưởng tiêu cực đến luồng hoạt động cũ đang chạy ổn định hay không.",
      explanation: "Tránh lỗi hồi quy (regression bugs) làm hỏng các luồng nghiệp vụ cốt lõi cũ của khách hàng.",
      vietnamese: "Xin xác nhận về sự phụ thuộc tính năng. Việc phát hành tính năng này có gây ra ảnh hưởng hay đòi hỏi thay đổi nào đối với tính năng (...) hiện tại không? Nếu có, xin khách hàng cho biết thứ tự ưu tiên phát triển giữa các tính năng.",
      japanese: "機能の依存関係について確認させてください。本機能のリリースに伴い、既存の〇〇機能の挙動に変更や影響は生じますでしょうか。影響がある場合、開発の優先順位についてご指示いただけますと幸いです。",
    },
    {
      category: "5. Đặc tả mâu thuẫn (Spec Contradiction)",
      scenario: "Phát hiện sự không đồng nhất, mâu thuẫn chéo giữa hai tài liệu đặc tả khác nhau, hoặc giữa specs cũ với specs mới cập nhật gần đây.",
      explanation: "Giúp giải quyết sự mơ hồ cực kỳ sớm, tránh trường hợp dev code xong mới phát hiện ra hiểu sai spec do tài liệu mâu thuẫn.",
      vietnamese: "Chúng tôi phát hiện sự không đồng nhất trong đặc tả. Tại tài liệu đặc tả A (trang X) ghi là (...), nhưng tại tài liệu B (trang Y) lại mô tả là (...). Xin vui lòng xác nhận thông tin nào mới và chính xác hơn để chúng tôi áp dụng.",
      japanese: "仕様書の記載内容の相違について確認させてください。〇〇資料の〇ページでは「〇〇」と記載されていますが、〇〇資料の〇ページでは「〇〇」となっております。どちらの記載が正しいか、ご教示いただけますでしょうか。",
    },
    {
      category: "6. Đề xuất kỹ thuật vì hiệu năng (Technical Optimization)",
      scenario: "Khi đội ngũ phát triển phát hiện giải pháp kỹ thuật theo specs cũ có thể gây nghẽn DB hoặc tốn tài nguyên khi lượng dữ liệu tăng lớn, chủ động đề xuất giải pháp tối ưu.",
      explanation: "Khách Nhật đánh giá rất cao BrSE hiểu sâu kỹ thuật và chủ động đưa ra giải pháp giảm thiểu rủi ro vận hành sau khi bàn giao.",
      vietnamese: "Về phương thức xử lý tính năng này, nếu triển khai theo đặc tả cũ thì khi lượng dữ liệu tăng lớn có khả năng xảy ra vấn đề về hiệu năng (API chậm). Chúng tôi đề xuất giải pháp tối ưu hơn là (...). Xin vui lòng xem xét đề xuất này.",
      japanese: "本機能の実現方式について、技術的な提案がございます。現行仕様の通りに実装した場合、データ量増加時にパフォーマンス低下（APIレスポンスの遅延）の懸念がございます。そのため、弊社より「〇〇案」を提案いたします。本提案についてご検討いただけますでしょうか。",
    },
    {
      category: "7. Thiết kế Responsive trên Mobile (Responsive UI Behavior)",
      scenario: "Làm rõ cách hiển thị giao diện đối với các bảng biểu phức tạp hoặc nhiều nút chức năng khi xem trên màn hình nhỏ (smartphones).",
      explanation: "Đảm bảo trải nghiệm UI/UX tốt trên mọi thiết bị và hạn chế lỗi giao diện ở giai đoạn nghiệm thu UAT của khách hàng.",
      vietnamese: "Xin vui lòng xác nhận thiết kế hiển thị trên thiết bị di động. Đối với bảng dữ liệu (...), trên màn hình Mobile chúng tôi nên ẩn bớt cột nào hay cho phép cuộn ngang màn hình?",
      japanese: "モバイル表示（レスポンシブ対応）の仕様について確認させてください。〇〇のテーブルについて、スマートフォン画面などの横幅が狭いデバイスでは、一部の列を非表示にするか、もしくは横スクロール可能とするか、どちらの挙動がよろしいでしょうか。",
    },
    {
      category: "8. Luồng xử lý ngầm (Background Batch Process)",
      scenario: "Làm rõ lịch trình chạy Batch (vào ban đêm hay định kỳ hàng giờ), cơ chế ghi Log lỗi và thông báo khi batch thất bại.",
      explanation: "Batch ngầm thường dễ bị bỏ sót spec liên quan tới ghi log và gửi email cảnh báo khi có sự cố hệ thống.",
      vietnamese: "Về luồng xử lý Batch (...), xin vui lòng xác nhận thời gian khởi chạy định kỳ (mỗi giờ một lần hay vào lúc nửa đêm)? Ngoài ra, nếu xảy ra lỗi trong quá trình chạy, hệ thống cần gửi thông báo qua email hay chỉ ghi vào Log hệ thống?",
      japanese: "バッチ処理の仕様について確認させてください。〇〇バッチの実行タイミング（1時間に1回、または深夜の時間帯など）はいつがよろしいでしょうか。また、エラー発生時の通知（メール送信、またはログ出力のみ）についてもご指示いただけますでしょうか。",
    },
    {
      category: "9. Yêu cầu phi chức năng - SLA & Security (Non-Functional SLA)",
      scenario: "Làm rõ thời gian phản hồi API tối đa, yêu cầu mã hóa dữ liệu nhạy cảm (như mật khẩu, thông tin thẻ tín dụng) để đáp ứng chuẩn bảo mật.",
      explanation: "SLA và Security là những yếu tố sống còn của một hệ thống thương mại thực tế và luôn cần chốt sớm.",
      vietnamese: "Về yêu cầu bảo mật và hiệu năng, xin vui lòng xác nhận: Đối với dữ liệu nhạy cảm (...), có yêu cầu mã hóa đặc biệt khi lưu DB không? Và thời gian phản hồi API kỳ vọng cho chức năng này tối đa là bao nhiêu giây?",
      japanese: "非機能要件（セキュリティとパフォーマンス）について確認させてください。〇〇の個人情報について、データベース保存時に特別な暗号化処理は必要でしょうか。また、本機能のAPIレスポンス時間（SLA）の目標値（例：〇秒以内）がございましたらご教示ください。",
    },
    {
      category: "10. Đề xuất cắt giảm Phase/Scope để kịp tiến độ (De-scoping)",
      scenario: "Khi schedule quá gấp hoặc có blocker kỹ thuật lớn, BrSE đàm phán với khách hàng Nhật để dời các tính năng phụ sang Phase sau, ưu tiên phát triển core flow trước để kịp ra mắt.",
      explanation: "Giúp giải quyết khủng hoảng tiến độ một cách chuyên nghiệp, tránh tình trạng OT quá mức dẫn tới chất lượng code kém và trễ hạn hoàn toàn.",
      vietnamese: "Do tiến độ phát triển rất gấp, để đảm bảo chất lượng hệ thống và phát hành đúng hẹn, chúng tôi đề xuất chia nhỏ dự án. Chúng tôi sẽ ưu tiên hoàn thành luồng cốt lõi (...) trong Phase 1, các tính năng phụ (...) xin phép dời sang Phase 2. Mong quý khách xem xét đề xuất này.",
      japanese: "開発スケジュールおよび品質確保の観点から、リリースの段階化（スコープ調整）をご提案いたします。スケジュールが非常にタイトであるため、第1フェーズではコア機能である「〇〇」のリリースに専念し、サブ機能の「〇〇」は第2フェーズでの対応とさせていただけますでしょうか。ご検討のほどよろしくお願い申し上げます。",
    }
  ];

  const handleGenerateSpec = () => {
    const md = `# [SPEC DRAFT] ${blueprint.title || "Tài liệu Yêu cầu Chức năng"}

## 1. Bối cảnh & Mục tiêu nghiệp vụ (Why & Who)
- **Mục tiêu chính:** ${blueprint.context || "Chưa xác định"}
- **Đối tượng người dùng:** ${blueprint.users || "Chưa xác định"}

## 2. Dữ liệu đầu vào & Quy tắc ràng buộc (Input & Validation)
- **Dữ liệu đầu vào:** ${blueprint.inputs || "Chưa xác định"}
- **Quy tắc validate:** ${blueprint.validations || "Chưa xác định"}

## 3. Luồng xử lý chính (Happy Path)
${blueprint.happyPath ? blueprint.happyPath.split("\n").map(line => line.startsWith("-") || line.startsWith("*") ? line : `- ${line}`).join("\n") : "- Chưa xác định"}

## 4. Trường hợp biên & Xử lý ngoại lệ (Exception Handling)
${blueprint.exceptions ? blueprint.exceptions.split("\n").map(line => line.startsWith("-") || line.startsWith("*") ? line : `- ${line}`).join("\n") : "- Chưa xác định"}

## 5. Tần suất & Hiệu năng hoạt động (Performance & Volume)
- **Tần suất gọi tính năng:** ${blueprint.frequency || "Chưa xác định"}
- **Thời gian phản hồi kỳ vọng:** ${blueprint.performance || "Chưa xác định"}`;

    setRequirementContext(md);
    navigator.clipboard.writeText(md);
    notify("Đã tạo bản nháp Markdown Specs dựa trên khung tư duy 5W2H và sao chép vào Clipboard của bạn!", "success");
    setActiveTab("ai"); // Auto switch to AI Refiner tab so they can review/ask AI immediately!
  };

  const handleCopyTemplate = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handlePushToKeigo = (text: string) => {
    if (setInputText && setActiveMode) {
      setInputText(text);
      setActiveMode("keigo");
    } else {
      navigator.clipboard.writeText(text);
      notify("Đã copy mẫu câu Nhật. Hãy dán sang tab Keigo Check để AI sửa lỗi!", "success");
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
      {/* Left Area: Main Interaction Tabs */}
      <div className="space-y-5">
        {/* Tab Selection Header */}
        <div className="flex border-b border-[var(--brse-panel-border)] gap-2 pb-px flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab("ai")}
            className={cn(
              "border-b-2 px-4 py-2.5 text-sm font-bold transition-all",
              activeTab === "ai"
                ? "border-cyan text-cyan"
                : "border-transparent text-textMuted hover:text-textPrimary"
            )}
          >
            <Sparkles className="inline-block h-4 w-4 mr-1.5" />
            {t("keigo.tabAi")}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("blueprint")}
            className={cn(
              "border-b-2 px-4 py-2.5 text-sm font-bold transition-all",
              activeTab === "blueprint"
                ? "border-cyan text-cyan"
                : "border-transparent text-textMuted hover:text-textPrimary"
            )}
          >
            <FileText className="inline-block h-4 w-4 mr-1.5" />
            {t("keigo.tabBlueprint")}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("guide")}
            className={cn(
              "border-b-2 px-4 py-2.5 text-sm font-bold transition-all",
              activeTab === "guide"
                ? "border-cyan text-cyan"
                : "border-transparent text-textMuted hover:text-textPrimary"
            )}
          >
            <HelpCircle className="inline-block h-4 w-4 mr-1.5" />
            {t("keigo.tabGuide")}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("templates")}
            className={cn(
              "border-b-2 px-4 py-2.5 text-sm font-bold transition-all",
              activeTab === "templates"
                ? "border-cyan text-cyan"
                : "border-transparent text-textMuted hover:text-textPrimary"
            )}
          >
            <BookOpen className="inline-block h-4 w-4 mr-1.5" />
            {t("keigo.tabTemplates")} ({ELICITATION_TEMPLATES.length})
          </button>
        </div>

        {/* TAB 1: 5W2H BLUEPRINT */}
        {activeTab === "blueprint" && (
          <div className="brse-section p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/15 text-cyan">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-textPrimary">Requirement Blueprint (5W2H)</h2>
                <p className="text-xs text-textMuted">Tự cấu trúc specs theo luồng tư duy chuyên nghiệp để tìm ra lỗ hổng trước khi code.</p>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="grid gap-2">
                <span className="text-xs font-bold text-textPrimary">Tiêu đề yêu cầu</span>
                <input
                  value={blueprint.title}
                  onChange={(e) => setBlueprint({ ...blueprint, title: e.target.value })}
                  placeholder="VD: Thêm trường Số điện thoại khách hàng khi tạo Hợp đồng"
                  className="field-control w-full px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <span className="text-xs font-bold text-textPrimary">Bối cảnh & Mục tiêu (Why)</span>
                  <textarea
                    value={blueprint.context}
                    onChange={(e) => setBlueprint({ ...blueprint, context: e.target.value })}
                    rows={2}
                    placeholder="Mục đích nghiệp vụ là gì? Tại sao khách cần tính năng này?"
                    className="field-control w-full px-3 py-2 text-sm resize-none"
                  />
                </div>
                <div className="grid gap-2">
                  <span className="text-xs font-bold text-textPrimary">Đối tượng thụ hưởng (Who)</span>
                  <textarea
                    value={blueprint.users}
                    onChange={(e) => setBlueprint({ ...blueprint, users: e.target.value })}
                    rows={2}
                    placeholder="Ai sẽ dùng màn hình này? Quyền hạn quản trị viên hay user thường?"
                    className="field-control w-full px-3 py-2 text-sm resize-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <span className="text-xs font-bold text-textPrimary">Dữ liệu đầu vào (Input)</span>
                  <textarea
                    value={blueprint.inputs}
                    onChange={(e) => setBlueprint({ ...blueprint, inputs: e.target.value })}
                    rows={2}
                    placeholder="Các trường thông tin nào được nhập vào? File upload, text, hay số?"
                    className="field-control w-full px-3 py-2 text-sm resize-none"
                  />
                </div>
                <div className="grid gap-2">
                  <span className="text-xs font-bold text-textPrimary">Quy tắc Validate (Validation)</span>
                  <textarea
                    value={blueprint.validations}
                    onChange={(e) => setBlueprint({ ...blueprint, validations: e.target.value })}
                    rows={2}
                    placeholder="Độ dài tối đa bao nhiêu ký tự? Định dạng số hay cho phép ký tự đặc biệt?"
                    className="field-control w-full px-3 py-2 text-sm resize-none"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <span className="text-xs font-bold text-textPrimary">Luồng xử lý chính (Happy Path - Step-by-step)</span>
                <textarea
                  value={blueprint.happyPath}
                  onChange={(e) => setBlueprint({ ...blueprint, happyPath: e.target.value })}
                  rows={3}
                  placeholder="- Bước 1: Người dùng nhập đầy đủ thông tin&#10;- Bước 2: Bấm nút Gửi, hệ thống lưu vào DB và chuyển về danh sách..."
                  className="field-control w-full px-3 py-2 text-sm font-sans"
                />
              </div>

              <div className="grid gap-2">
                <span className="text-xs font-bold text-textPrimary">Xử lý ngoại lệ & Trường hợp biên (Exceptions & Edge Cases)</span>
                <textarea
                  value={blueprint.exceptions}
                  onChange={(e) => setBlueprint({ ...blueprint, exceptions: e.target.value })}
                  rows={3}
                  placeholder="- TH 1: Bấm nút Gửi 2 lần liên tục -> Hệ thống phải chặn gửi trùng&#10;- TH 2: Dữ liệu trống -> Hiện thông báo lỗi validate..."
                  className="field-control w-full px-3 py-2 text-sm font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <span className="text-xs font-bold text-textPrimary">Tần suất dùng (Frequency)</span>
                  <input
                    value={blueprint.frequency}
                    onChange={(e) => setBlueprint({ ...blueprint, frequency: e.target.value })}
                    placeholder="VD: Khoảng 100 lần/ngày"
                    className="field-control w-full px-3 py-2 text-sm"
                  />
                </div>
                <div className="grid gap-2">
                  <span className="text-xs font-bold text-textPrimary">Hiệu năng kỳ vọng (Performance)</span>
                  <input
                    value={blueprint.performance}
                    onChange={(e) => setBlueprint({ ...blueprint, performance: e.target.value })}
                    placeholder="VD: Thời gian phản hồi API dưới 500ms"
                    className="field-control w-full px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleGenerateSpec}
                className="brse-button brse-button-primary mt-3 flex items-center justify-center gap-2 w-full py-2.5"
              >
                <ClipboardCheck className="h-4 w-4" />
                Tạo nháp Spec Markdown & Đẩy sang AI Refiner 🚀
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: SPEC ELICITATION GUIDEBOOK (NEW & HIGHLY QUALITY) */}
        {activeTab === "guide" && (
          <div className="brse-section p-6 space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/15 text-cyan">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-textPrimary">Cẩm Nang Đặt Câu Hỏi (Spec Elicitation Guidebook)</h2>
                <p className="text-xs text-textMuted">Rèn luyện tư duy phân tích sắc sảo để làm rõ mọi đặc tả yêu cầu lớn nhỏ mà không cần dựa dẫm vào AI.</p>
              </div>
            </div>

            {/* Structured Alert: The Best Tool concept */}
            <div className="rounded-xl border border-primary/25 bg-primary/5 p-4.5 space-y-2">
              <h3 className="text-xs font-black text-primary uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-primary" />
                Tư duy làm rõ spec hiệu quả nhất: &quot;Tư duy Hệ thống 4 Trục&quot;
              </h3>
              <p className="text-xs leading-relaxed text-textMuted">
                Công cụ tối thượng của một BrSE không phải là phần mềm vẽ cao siêu, mà là **Tư duy 4 Trục** - khả năng tự phản biện specs ở mọi khía cạnh để phát hiện kẽ hở trước khi triển khai code.
              </p>
            </div>

            {/* The 4 Axes Grid */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-[var(--brse-panel-border)] bg-background/30 p-4 space-y-2.5">
                <h4 className="text-xs font-black text-cyan uppercase flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan/15 text-[10px]">1</span>
                  Trục Nghiệp Vụ & Tác Nhân
                </h4>
                <p className="text-[11px] leading-relaxed text-textMuted">
                  **Mục tiêu chính**: Trả lời câu hỏi **Why & Who**. Tại sao khách cần chức năng này? Phân quyền màn hình (ai được Xem, Sửa, Xóa)? Quyền Admin khác gì User thường?
                </p>
                <div className="text-[10px] bg-cyan/5 p-2 rounded text-cyan border border-cyan/10">
                  *Tip*: Tránh code chức năng thừa, hãy hiểu rõ bối cảnh thực tế.
                </div>
              </div>

              <div className="rounded-xl border border-[var(--brse-panel-border)] bg-background/30 p-4 space-y-2.5">
                <h4 className="text-xs font-black text-primary uppercase flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-[10px]">2</span>
                  Trục Giao Diện & Tương Tác
                </h4>
                <p className="text-[11px] leading-relaxed text-textMuted">
                  **Mục tiêu chính**: Trạng thái **UI States & Flow**. Thiết kế Responsive trên Mobile thế nào? Khi danh sách rỗng (Empty state) hiện gì? Nút bấm có hiệu ứng loading không?
                </p>
                <div className="text-[10px] bg-primary/5 p-2 rounded text-primary border border-primary/10">
                  *Tip*: Hãy luôn hỏi kịch bản khi hệ thống tải chậm hoặc lỗi hiển thị.
                </div>
              </div>

              <div className="rounded-xl border border-[var(--brse-panel-border)] bg-background/30 p-4 space-y-2.5">
                <h4 className="text-xs font-black text-emerald-400 uppercase flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15 text-[10px]">3</span>
                  Trục Ràng Buộc Dữ Liệu
                </h4>
                <p className="text-[11px] leading-relaxed text-textMuted">
                  **Mục tiêu chính**: Ranh giới **Data Constraints**. Quy tắc validate là gì? Độ dài ký tự tối thiểu/tối đa? Ký tự đặc biệt có bị chặn không? Định dạng file được upload?
                </p>
                <div className="text-[10px] bg-emerald-500/5 p-2 rounded text-emerald-400 border border-emerald-500/10">
                  *Tip*: Chốt sớm độ lớn dữ liệu để thiết kế Database và API tối ưu.
                </div>
              </div>

              <div className="rounded-xl border border-[var(--brse-panel-border)] bg-background/30 p-4 space-y-2.5">
                <h4 className="text-xs font-black text-amber-400 uppercase flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-400/15 text-[10px]">4</span>
                  Trục Biên & Xử Lý Ngoại Lệ
                </h4>
                <p className="text-[11px] leading-relaxed text-textMuted">
                  **Mục tiêu chính**: Phòng chống rủi ro **Edge Cases**. Khi mất kết nối mạng giữa chừng, hệ thống xử lý thế nào? Chặn click đúp (double-click)? Cơ chế rollback dữ liệu?
                </p>
                <div className="text-[10px] bg-amber-400/5 p-2 rounded text-amber-300 border border-amber-400/10">
                  *Tip*: Luôn hỏi &quot;Nếu quy trình bị ngắt quãng giữa chừng thì sao?&quot;.
                </div>
              </div>
            </div>

            {/* Proactive A/B Proposal section */}
            <div className="rounded-xl border border-[var(--brse-panel-border)] bg-white/[0.02] p-5 space-y-3.5">
              <h3 className="text-sm font-black text-textPrimary flex items-center gap-2">
                <Flame className="h-4.5 w-4.5 text-vermilion" />
                Triết Lý Đặt Câu Hỏi &quot;Bẫy Lựa Chọn A/B&quot;
              </h3>
              <p className="text-xs leading-relaxed text-textMuted">
                Khách hàng Nhật thường bận rộn và ngại trả lời những câu hỏi mở như <em>&quot;Chúng tôi nên thiết kế chức năng này thế nào?&quot;</em>. Bí quyết chốt spec siêu tốc của BrSE đẳng cấp là đặt câu hỏi có cấu trúc sẵn:
              </p>
              
              <div className="grid gap-3 sm:grid-cols-2 text-xs">
                <div className="rounded-lg border border-red-500/25 bg-red-500/5 p-3 space-y-1">
                  <p className="font-bold text-vermilion flex items-center gap-1">❌ Tránh hỏi mở (Open Question):</p>
                  <p className="text-textMuted font-mono">&quot;Mục validate email này cần kiểm tra các điều kiện gì vậy ạ?&quot;</p>
                  <p className="text-[10px] text-textMuted italic mt-1.5">*Hậu quả*: Khách trì hoãn phản hồi hoặc trả lời rất sơ sài.</p>
                </div>
                <div className="rounded-lg border border-matcha/25 bg-matcha/5 p-3 space-y-1">
                  <p className="font-bold text-matcha flex items-center gap-1">🟢 Hãy dùng đề xuất A/B (Closed Proposal):</p>
                  <p className="text-textMuted font-mono">&quot;Chúng tôi đề xuất kiểm tra validate email theo A案 (chuẩn regex RFC 5322). Nếu quý khách muốn theo B案 (chặn thêm ký tự đặc biệt), xin vui lòng cho biết.&quot;</p>
                  <p className="text-[10px] text-textMuted italic mt-1.5">*Kết quả*: Khách hàng xác nhận ngay trong 1 click.</p>
                </div>
              </div>
            </div>

            {/* 3 Golden Rules with Japanese customers */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-black text-textMuted uppercase tracking-wider">3 Nguyên Tắc Vàng Khi Đặt Câu Hỏi Nhật</h3>
              <ul className="space-y-2 text-xs text-textMuted">
                <li className="flex items-start gap-2">
                  <CornerDownRight className="h-4 w-4 text-cyan shrink-0 mt-0.5" />
                  <span><strong>Không bao giờ đổ lỗi cho Spec</strong>: Thay vì nói <em>&quot;Tài liệu của ngài thiếu thông tin...&quot;</em>, hãy nói <em>&quot;Chúng tôi muốn làm rõ thêm để nâng cao chất lượng...&quot;</em>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CornerDownRight className="h-4 w-4 text-cyan shrink-0 mt-0.5" />
                  <span><strong>Làm nổi bật lợi ích của khách</strong>: Cho họ thấy rằng việc làm rõ spec sớm là để tránh chậm trễ tiến độ phát hành (schedule delay) và giảm thiểu bug nghiệm thu.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CornerDownRight className="h-4 w-4 text-cyan shrink-0 mt-0.5" />
                  <span><strong>Đóng gói Q&A thông tin</strong>: Luôn gom các câu hỏi liên quan vào cùng một danh mục (Operations Q&A) để khách tiện duyệt hàng loạt.</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* TAB 3: TEMPLATE LIBRARY */}
        {activeTab === "templates" && (
          <div className="space-y-4">
            {ELICITATION_TEMPLATES.map((tmpl, idx) => (
              <div key={idx} className="brse-section p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-[var(--brse-panel-border)] pb-2 flex-wrap gap-2">
                  <span className="rounded bg-cyan/15 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-cyan">
                    {tmpl.category}
                  </span>
                  <span className="text-[10px] text-textMuted flex items-center gap-1">
                    <Info className="h-3 w-3 text-cyan" />
                    Kỹ thuật đặt câu hỏi tối ưu
                  </span>
                </div>

                <div className="text-xs leading-relaxed text-textMuted space-y-1.5">
                  <p><span className="font-semibold text-textPrimary flex items-center gap-1.5"><MousePointerClick className="h-3.5 w-3.5 text-cyan" /> Kịch bản:</span> {tmpl.scenario}</p>
                  <p className="bg-white/[0.02] p-2.5 rounded border border-[var(--brse-panel-border)] italic text-[11px] leading-normal">
                    💡 **Mẹo tư duy**: {tmpl.explanation}
                  </p>
                </div>

                <div className="grid gap-2">
                  <div className="rounded-lg bg-black/35 p-3">
                    <p className="text-[11px] font-bold text-textMuted mb-1">Mẫu dịch thô tiếng Việt:</p>
                    <p className="text-xs text-textMuted leading-relaxed">{tmpl.vietnamese}</p>
                  </div>
                  <div className="rounded-lg bg-black/50 p-3 border border-primary/20">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[11px] font-bold text-primary">Mẫu Nhật Keigo đề xuất:</p>
                      <TtsButton text={tmpl.japanese} speak={speak} stop={stop} isSpeaking={isSpeaking} />
                    </div>
                    <p className="text-xs text-textPrimary leading-relaxed font-mono whitespace-pre-wrap select-all">{tmpl.japanese}</p>
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => handleCopyTemplate(tmpl.japanese, idx)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--brse-panel-border)] bg-white/[0.03] px-3 py-1.5 text-xs font-bold text-textMuted transition hover:text-textPrimary"
                  >
                    {copiedIndex === idx ? (
                      <span className="text-matcha font-bold">{t("keigo.copied")}</span>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        {t("keigo.copyJapanese")}
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePushToKeigo(tmpl.japanese)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary/20 border border-primary/30 px-3 py-1.5 text-xs font-bold text-primary transition hover:bg-primary/30 active:scale-95"
                    title={t("keigo.pushToKeigoCheckTitle")}
                  >
                    <Send className="h-3.5 w-3.5" />
                    {t("keigo.pushToKeigoCheck")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 4: ORIGINAL AI REFINER */}
        {activeTab === "ai" && (
          <div className="space-y-5">
            <div className="brse-section p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/15 text-cyan">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-textPrimary">{t("keigo.refineAiTitle")}</h2>
                  <p className="text-xs text-textMuted">{t("keigo.refineAiSubtitle")}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-textMuted mb-2">
                    {t("keigo.specContextLabel")}
                  </label>
                  <textarea
                    value={requirementContext}
                    onChange={(e) => setRequirementContext(e.target.value)}
                    placeholder={t("keigo.specContextPlaceholder")}
                    rows={8}
                    className="w-full rounded-xl border border-[var(--brse-panel-border)] bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition focus:border-teal-500/60 focus:ring-2 focus:ring-teal-500/20 resize-y font-sans leading-6"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-textMuted mb-2">
                    {t("keigo.aiRefinePromptLabel")}
                  </label>
                  <div className="flex gap-2">
                    <input
                      value={requirementQuestion}
                      onChange={(e) => setRequirementQuestion(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRequirementAsk();
                      }}
                      placeholder={t("keigo.aiRefinePlaceholder")}
                      className="h-11 min-w-0 flex-1 rounded-xl border border-[var(--brse-panel-border)] bg-white/5 px-4 py-2 text-sm text-white outline-none placeholder:text-textMuted focus:border-teal-500/60 focus:ring-2 focus:ring-teal-500/20"
                    />
                    <button
                      onClick={() => handleRequirementAsk()}
                      disabled={isRequirementLoading || !requirementQuestion.trim()}
                      className="inline-flex h-11 items-center gap-2 rounded-xl bg-cyan px-5 text-sm font-black text-slate-950 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isRequirementLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      Ask AI
                    </button>
                  </div>
                </div>

                {/* Quick Prompts */}
                <div>
                  <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-textMuted/60">{t("keigo.quickPrompts")}</p>
                  <div className="flex flex-wrap gap-2">
                    {REQUIREMENT_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => {
                          setRequirementQuestion(prompt);
                          handleRequirementAsk(prompt);
                        }}
                        className="rounded-lg border border-[var(--brse-panel-border)] bg-white/[0.01] px-3 py-1.5 text-xs text-textMuted transition hover:border-teal-500/30 hover:text-cyan"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {requirementError && (
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3">
                  <AlertCircle className="h-4 w-4 text-rose-400 mt-0.5 shrink-0" />
                  <p className="text-sm text-rose-300">{requirementError}</p>
                </div>
              )}
            </div>

            {/* AI Answer Reply Area */}
            {requirementReply && (
              <div className="brse-section border-teal-500/25 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-cyan" />
                    <span className="text-sm font-black text-textPrimary">{t("keigo.aiAnalysisTitle")}</span>
                    <TtsButton text={requirementReply} speak={speak} stop={stop} isSpeaking={isSpeaking} />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigator.clipboard.writeText(requirementReply)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--brse-panel-border)] bg-white/[0.03] px-3 py-1.5 text-xs font-bold text-textMuted transition hover:text-textPrimary"
                    >
                      {t("keigo.copyReply")}
                    </button>
                    <button
                      onClick={() => handlePushToKeigo(requirementReply)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary/20 border border-primary/30 px-3 py-1.5 text-xs font-bold text-primary transition hover:bg-primary/30 active:scale-95"
                    >
                      <Send className="h-3.5 w-3.5" />
                      {t("keigo.pushToKeigoCheck")}
                    </button>
                  </div>
                </div>
                <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-4">
                  <pre className="whitespace-pre-wrap text-sm leading-6 text-textPrimary font-sans">
                    {requirementReply}
                  </pre>
                </div>
                <PolitenessMeter text={requirementReply} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right sidebar: playbooks & tips */}
      <div className="space-y-5">
        {/* Playbooks */}
        <div className="brse-section p-5">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="h-4 w-4 text-cyan" />
            <h3 className="text-sm font-black text-textPrimary">{t("keigo.operationalPlaybooks")}</h3>
          </div>
          <div className="space-y-3">
            {REQUIREMENT_PLAYBOOKS.map((playbook) => (
              <button
                key={playbook.title}
                onClick={() => {
                  setRequirementQuestion(playbook.prompt);
                  handleRequirementAsk(playbook.prompt);
                  setActiveTab("ai");
                }}
                className={cn(
                  "w-full text-left rounded-xl border p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
                  playbook.tone === "tone-card-primary"
                    ? "border-primary/20 bg-primary/5 hover:border-primary/45"
                    : playbook.tone === "tone-card-cyan"
                      ? "border-cyan/20 bg-cyan/5 hover:border-cyan/45"
                      : playbook.tone === "tone-card-warning"
                        ? "border-amber-400/20 bg-amber-400/5 hover:border-amber-400/45"
                        : "border-success/20 bg-success/5 hover:border-success/45"
                )}
              >
                <p className="font-bold text-xs text-textPrimary">{playbook.title}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-textMuted">{playbook.helper}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Spec checklist */}
        <div className="brse-section p-5">
          <div className="flex items-center gap-2 mb-4">
            <HelpCircle className="h-4 w-4 text-cyan" />
            <h3 className="text-sm font-black text-textPrimary">{t("keigo.spec4AxesChecker")}</h3>
          </div>
          <div className="space-y-4">
            {REQUIREMENT_CHECKLIST_GROUPS.map((group) => (
              <div key={group.title} className="space-y-2">
                <span
                  className={cn(
                    "inline-block rounded px-2 py-0.5 text-[10px] font-black uppercase tracking-wider",
                    group.color === "cyan"
                      ? "bg-cyan/15 text-cyan"
                      : group.color === "primary"
                        ? "bg-primary/15 text-primary"
                        : group.color === "success"
                          ? "bg-success/15 text-success"
                          : "bg-warning/15 text-warning"
                  )}
                >
                  {group.title}
                </span>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-textMuted pl-1">
                  {group.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
