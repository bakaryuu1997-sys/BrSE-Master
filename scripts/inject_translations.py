import json

new_keys = {
    # Keigo
    "keigo.composeTitle": {
        "vi": "Soạn email từ tiếng Việt",
        "en": "Compose email from Vietnamese",
        "ja": "ベトナム語からメール作成",
    },
    "keigo.composeSubtitle": {
        "vi": "Nhập ý tưởng → AI tạo email Nhật chuẩn Keigo",
        "en": "Input thoughts → AI generates standard Keigo Japanese email",
        "ja": "要点を入力 → AIが標準敬語の日本語メールを作成",
    },
    "keigo.brseContext": {
        "vi": "Ngữ cảnh BrSE",
        "en": "BrSE Context",
        "ja": "BrSE コンテキスト",
    },
    "keigo.generateEmail": {
        "vi": "Tạo email Keigo",
        "en": "Generate Keigo Email",
        "ja": "敬語メールを生成",
    },
    "keigo.generatingEmail": {
        "vi": "AI đang soạn email...",
        "en": "AI is composing email...",
        "ja": "AIがメールを作成中...",
    },
    "keigo.ctrlEnterToSend": {
        "vi": "Ctrl+Enter để gửi",
        "en": "Ctrl+Enter to send",
        "ja": "Ctrl+Enterで送信",
    },
    "keigo.clear": {
        "vi": "Xóa",
        "en": "Clear",
        "ja": "クリア",
    },
    "keigo.japaneseEmailOutput": {
        "vi": "Email Nhật (Keigo chuẩn)",
        "en": "Japanese Email (Standard Keigo)",
        "ja": "日本語メール（標準敬語）",
    },
    "keigo.copied": {
        "vi": "Đã copy!",
        "en": "Copied!",
        "ja": "コピーしました！",
    },
    "keigo.checkKeigoAction": {
        "vi": "Kiểm tra Keigo",
        "en": "Check Keigo",
        "ja": "敬語チェック",
    },
    "keigo.emailStructureTitle": {
        "vi": "Cấu trúc email BrSE",
        "en": "BrSE Email Structure",
        "ja": "BrSEメール構成",
    },
    "keigo.wordsToNote": {
        "vi": "Từ cần chú ý",
        "en": "Important Words / Phrasing",
        "ja": "注意すべき表現",
    },
    "keigo.presetQna": {
        "vi": "Hỏi Q&A",
        "en": "Ask Q&A",
        "ja": "Q&A質問",
    },
    "keigo.presetQnaPlaceholder": {
        "vi": "Vd: Hỏi khách xác nhận quy tắc validate của trường email trong form đăng ký",
        "en": "e.g. Ask client to confirm validation rules for email field in registration form",
        "ja": "例：登録フォームのメールアドレスのバリデーション仕様について確認",
    },
    "keigo.presetQnaHint": {
        "vi": "Câu hỏi đóng, rõ ràng, kèm background ngắn gọn",
        "en": "Closed questions, clear, with concise background",
        "ja": "クローズドクエスチョン、明確、簡潔な背景付き",
    },
    "keigo.presetReport": {
        "vi": "Báo cáo ngày",
        "en": "Daily Report",
        "ja": "日次報告",
    },
    "keigo.presetReportPlaceholder": {
        "vi": "Vd: Hôm nay hoàn thành API login, đang test, ngày mai sẽ gửi PR. Có 1 blocker về OAuth token.",
        "en": "e.g. Today completed login API, currently testing, PR tomorrow. 1 blocker on OAuth token.",
        "ja": "例：本日ログインAPI完了・テスト中、明日PR提出予定。OAuthトークンでブロッカーあり。",
    },
    "keigo.presetReportHint": {
        "vi": "Tình trạng hôm nay, kế hoạch ngày mai, vấn đề nếu có",
        "en": "Today's status, tomorrow's plan, issues if any",
        "ja": "本日の状況、明日の予定、課題事項",
    },
    "keigo.presetApology": {
        "vi": "Xin lỗi / delay",
        "en": "Apology / Delay",
        "ja": "お詫び / 遅延報告",
    },
    "keigo.presetApologyPlaceholder": {
        "vi": "Vd: Xin lỗi vì PR bị delay 1 ngày do phát hiện bug trong test, sẽ hoàn thành vào chiều mai",
        "en": "e.g. Apologize for 1-day PR delay due to bug found in testing, will finish tomorrow afternoon",
        "ja": "例：テスト中のバグ検知のためPRが1日遅延することのお詫び、明日午後に完了予定",
    },
    "keigo.presetApologyHint": {
        "vi": "Nguyên nhân cụ thể + thời điểm hoàn thành mới",
        "en": "Specific cause + updated ETA",
        "ja": "具体的な原因 ＋ 新しい完了予定日時",
    },
    "keigo.presetCr": {
        "vi": "Đề xuất CR",
        "en": "Propose CR",
        "ja": "仕様変更 (CR) 提案",
    },
    "keigo.presetCrPlaceholder": {
        "vi": "Vd: Đề xuất đổi sang dùng API v2 vì API v1 sẽ ngừng hỗ trợ từ tháng sau, estimate +2 days",
        "en": "e.g. Propose migrating to API v2 since v1 is deprecated next month, estimate +2 days",
        "ja": "例：v1が来月廃止予定のためAPI v2への移行を提案、工数影響＋2日",
    },
    "keigo.presetCrHint": {
        "vi": "Lý do, giải pháp đề xuất, impact estimate",
        "en": "Reason, proposed solution, impact estimate",
        "ja": "理由、提案内容、工数影響",
    },
    "keigo.presetEscalate": {
        "vi": "Escalate khẩn",
        "en": "Urgent Escalation",
        "ja": "緊急エスカレーション",
    },
    "keigo.presetEscalatePlaceholder": {
        "vi": "Vd: Production đang lỗi không thanh toán được, đã rollback, cần họp khẩn 15 phút lúc 14:00",
        "en": "e.g. Production payment failure, already rolled back, urgent 15-min sync needed at 14:00",
        "ja": "例：本番決済不具合発生・ロールバック済、14:00から15分の緊急ミーティングを要請",
    },
    "keigo.presetEscalateHint": {
        "vi": "Sự cố, hành động đã làm, yêu cầu từ khách",
        "en": "Incident, immediate actions taken, request for client",
        "ja": "事象、一次対応状況、顧客への依頼事項",
    },
    "keigo.presetOther": {
        "vi": "Khác / Tự do",
        "en": "Other / Custom",
        "ja": "その他・自由形式",
    },
    "keigo.presetOtherPlaceholder": {
        "vi": "Nhập nội dung cần gửi cho khách hàng bằng tiếng Việt...",
        "en": "Enter content to send to client in your native language...",
        "ja": "顧客に送信したい内容を入力してください...",
    },
    "keigo.presetOtherHint": {
        "vi": "AI sẽ tự chọn tone phù hợp với ngữ cảnh",
        "en": "AI will automatically select the appropriate tone",
        "ja": "AIが文脈に最適なトーンを自動選択します",
    },
    "keigo.inputTitle": {
        "vi": "Nhập câu tiếng Nhật",
        "en": "Enter Japanese text",
        "ja": "日本語を入力",
    },
    "keigo.charCount": {
        "vi": "ký tự",
        "en": "characters",
        "ja": "文字",
    },
    "keigo.inputPlaceholder": {
        "vi": "Ví dụ: 明日休む / これ確認してください / お忙しいところ恐れ入りますが... (có thể dán nhiều đoạn email)",
        "en": "Example: 明日休む / これ確認してください / お忙しいところ恐れ入りますが... (multiple paragraphs supported)",
        "ja": "例：明日休む / これ確認してください / お忙しいところ恐れ入りますが... (複数行対応)",
    },
    "keigo.analyzing": {
        "vi": "AI đang phân tích…",
        "en": "AI analyzing...",
        "ja": "AIが分析中…",
    },
    "keigo.checkWithAi": {
        "vi": "Kiểm tra bằng AI",
        "en": "Check with AI",
        "ja": "AIでチェック",
    },
    "keigo.ctrlEnterQuickSend": {
        "vi": "Ctrl+Enter để gửi nhanh",
        "en": "Ctrl+Enter to submit quickly",
        "ja": "Ctrl+Enterで送信",
    },
    "keigo.analysisResult": {
        "vi": "Kết quả phân tích Keigo",
        "en": "Keigo Analysis Result",
        "ja": "敬語分析結果",
    },
    "keigo.polishedByAi": {
        "vi": "Câu đã được AI trau chuốt",
        "en": "Polished by AI",
        "ja": "AIによる推敲結果",
    },
    "keigo.copyAll": {
        "vi": "Copy toàn bộ",
        "en": "Copy all",
        "ja": "すべてコピー",
    },
    "keigo.detailedNotes": {
        "vi": "Điểm cần lưu ý chi tiết",
        "en": "Detailed points to note",
        "ja": "詳細な注意点",
    },
    "keigo.noErrorsFound": {
        "vi": "Câu viết đã rất chuẩn mực, không phát hiện lỗi kính ngữ nào cần sửa!",
        "en": "The phrasing is already natural and respectful. No honorific errors found!",
        "ja": "文章はすでに標準的で適切です。修正すべき敬語の誤りは見つかりませんでした！",
    },
    "keigo.scoreExcellent": {
        "vi": "Xuất sắc",
        "en": "Excellent",
        "ja": "優秀",
    },
    "keigo.scoreGood": {
        "vi": "Tốt",
        "en": "Good",
        "ja": "良好",
    },
    "keigo.scoreNeedsWork": {
        "vi": "Cần cải thiện",
        "en": "Needs Improvement",
        "ja": "要改善",
    },
    "keigo.searchHistory": {
        "vi": "Tìm trong lịch sử...",
        "en": "Search history...",
        "ja": "履歴を検索...",
    },
    "keigo.loadingHistory": {
        "vi": "Đang tải lịch sử...",
        "en": "Loading history...",
        "ja": "履歴を読み込み中...",
    },
    "keigo.noRecordsFound": {
        "vi": "Không tìm thấy bản ghi nào.",
        "en": "No records found.",
        "ja": "履歴が見つかりません。",
    },
    "keigo.tabAi": {
        "vi": "1. Trợ Lý AI Refiner & Q&A",
        "en": "1. AI Refiner & Q&A Assistant",
        "ja": "1. AIリファイナー＆Q&Aアシスタント",
    },
    "keigo.tabBlueprint": {
        "vi": "2. Khung Tư Duy 5W2H",
        "en": "2. 5W2H Thinking Framework",
        "ja": "2. 5W2H 思考フレームワーク",
    },
    "keigo.tabGuide": {
        "vi": "3. Cẩm Nang Đặt Câu Hỏi (Không AI)",
        "en": "3. Spec Elicitation Guide (Manual)",
        "ja": "3. 要件確認ガイドブック（AI不要）",
    },
    "keigo.tabTemplates": {
        "vi": "4. Thư Viện Câu Hỏi Thực Chiến",
        "en": "4. Practical Question Templates",
        "ja": "4. 実践的な質問テンプレート集",
    },

    # Tools DOCX to PDF
    "tools.docxToPdfTitle": {
        "vi": "Chuyển đổi DOCX sang PDF",
        "en": "Convert DOCX to PDF",
        "ja": "DOCXをPDFに変換",
    },
    "tools.docxToPdfSubtitle": {
        "vi": "Chuyển nhanh tài liệu Word (Thiết kế cơ bản, Biên bản họp, Báo giá, SOW) sang PDF chuẩn cho khách hàng Nhật",
        "en": "Quickly convert Word documents (Basic Design, Minutes, Quotations, SOW) to standard PDF for Japanese clients",
        "ja": "Word文書（基本設計書、議事録、見積書、SOW）を日本の顧客向け標準PDFに素早く変換",
    },
    "tools.selectAnotherFile": {
        "vi": "Chọn file khác",
        "en": "Choose another file",
        "ja": "別のファイルを選択",
    },
    "tools.dropzonePrompt": {
        "vi": "Kéo thả tệp DOCX vào đây hoặc click để chọn file",
        "en": "Drag & drop DOCX file here or click to select",
        "ja": "DOCXファイルをここにドラッグ＆ドロップ、またはクリックして選択",
    },
    "tools.dropzoneHelp": {
        "vi": "Hỗ trợ định dạng Microsoft Word (.docx) · Xử lý bảo mật trực tiếp trên máy chủ cục bộ",
        "en": "Supports Microsoft Word (.docx) · Secure local processing",
        "ja": "Microsoft Word (.docx) 対応 · ローカル環境で安全に処理",
    },
    "tools.convertToPdfNow": {
        "vi": "Chuyển sang PDF ngay",
        "en": "Convert to PDF now",
        "ja": "今すぐPDFに変換",
    },
    "tools.convertingPdf": {
        "vi": "Đang chuyển đổi PDF...",
        "en": "Converting PDF...",
        "ja": "PDFに変換中...",
    },
    "tools.convertSuccess": {
        "vi": "Chuyển đổi thành công!",
        "en": "Converted successfully!",
        "ja": "変換が完了しました！",
    },
    "tools.fileReady": {
        "vi": "Tệp đã sẵn sàng: ",
        "en": "File ready: ",
        "ja": "準備完了: ",
    },
    "tools.redownloadPdf": {
        "vi": "Tải lại file PDF",
        "en": "Re-download PDF",
        "ja": "PDFを再ダウンロード",
    },
    "tools.errSelectDocx": {
        "vi": "Vui lòng chọn tệp có định dạng .docx",
        "en": "Please select a .docx format file",
        "ja": ".docx形式のファイルを選択してください",
    },
    "tools.errConvertFailed": {
        "vi": "Đã có lỗi xảy ra trong quá trình chuyển đổi.",
        "en": "An error occurred during conversion.",
        "ja": "変換中にエラーが発生しました。",
    },
    "tools.serverError": {
        "vi": "Lỗi máy chủ",
        "en": "Server error",
        "ja": "サーバーエラー",
    },

    # Todo Task Board
    "todo.previousPhase": {
        "vi": "Phase trước",
        "en": "Previous Phase",
        "ja": "前フェーズ",
    },
    "todo.nextPhase": {
        "vi": "Phase sau",
        "en": "Next Phase",
        "ja": "次フェーズ",
    },
    "todo.noEvidences": {
        "vi": "Chưa có bằng chứng (Jira, Chatwork, etc.)",
        "en": "No evidence attached yet (Jira, Chatwork, etc.)",
        "ja": "エビデンス（Jira, Chatworkなど）はまだありません",
    },
    "todo.quotePlaceholder": {
        "vi": "Trích dẫn / Mô tả (Tùy chọn)",
        "en": "Quote / Description (Optional)",
        "ja": "引用 / 説明（任意）",
    },
    "todo.add": {
        "vi": "Thêm",
        "en": "Add",
        "ja": "追加",
    },
    "todo.archiveDoneOver7Days": {
        "vi": "Archive — Done > 7 ngày",
        "en": "Archive — Done > 7 days",
        "ja": "アーカイブ — 完了後7日以上経過",
    },

    # Meeting Notes
    "meeting.aiProcessing": {
        "vi": "AI đang chạy",
        "en": "AI Processing",
        "ja": "AI処理中",
    },
    "meeting.upload": {
        "vi": "Tải lên",
        "en": "Upload",
        "ja": "アップロード",
    },
    "meeting.transcribe": {
        "vi": "Bóc băng",
        "en": "Transcribe",
        "ja": "文字起こし",
    },
    "meeting.pipelineFlow": {
        "vi": "Luồng xử lý",
        "en": "Pipeline Flow",
        "ja": "処理パイプライン",
    },
    "meeting.pipelineSteps": {
        "vi": "Thu → Bóc băng → Memo",
        "en": "Record → Transcribe → Memo",
        "ja": "録音 → 文字起こし → メモ",
    },
    "meeting.resumeQueue": {
        "vi": "Hàng đợi resume",
        "en": "Resume Queue",
        "ja": "再開キュー",
    },
    "meeting.retry": {
        "vi": "Chạy lại",
        "en": "Retry",
        "ja": "再試行",
    },
    "meeting.artifacts": {
        "vi": "Sản phẩm",
        "en": "Artifacts",
        "ja": "成果物",
    },
    "meeting.longFileNotice": {
        "vi": "file dài có thể mất vài phút trước khi bắt đầu transcribe",
        "en": "long files may take a few minutes before transcribing starts",
        "ja": "長時間のファイルは文字起こし開始まで数分かかる場合があります",
    },
    "meeting.uploadFinished": {
        "vi": "đã gửi xong",
        "en": "sent successfully",
        "ja": "送信完了",
    },
    "meeting.transcriptOnly": {
        "vi": "Chỉ lấy transcript",
        "en": "Transcript only",
        "ja": "文字起こしのみ",
    },
    "meeting.keepSourceMedia": {
        "vi": "Giữ file gốc",
        "en": "Keep source media",
        "ja": "元メディアを保持",
    },
    "meeting.uploading": {
        "vi": "Đang upload",
        "en": "Uploading...",
        "ja": "アップロード中...",
    },
    "meeting.uploadVideo": {
        "vi": "Upload video",
        "en": "Upload Video",
        "ja": "動画アップロード",
    },
    "meeting.searchTranscriptTitle": {
        "vi": "Search in transcript",
        "en": "Search in transcript",
        "ja": "トランスクリプト内検索",
    },
    "meeting.searchTranscriptDesc": {
        "vi": "Tìm nhanh một từ/câu trong transcript dài, rồi mở memo hoặc chat đúng cuộc họp đó.",
        "en": "Quickly find words/sentences in long transcripts, then open the memo or chat with that meeting.",
        "ja": "長い文字起こしから単語や文を検索し、該当するメモを開くかAIチャットを開始します。",
    },
    "meeting.searchTranscriptSearching": {
        "vi": "Đang tìm trong transcript...",
        "en": "Searching transcript...",
        "ja": "トランスクリプト内を検索中...",
    },
    "meeting.openMemo": {
        "vi": "Mở memo",
        "en": "Open Memo",
        "ja": "メモを開く",
    },
    "meeting.chatTranscript": {
        "vi": "Chat transcript",
        "en": "Chat transcript",
        "ja": "文字起こしとチャット",
    },
    "meeting.searchTranscriptMinChars": {
        "vi": "Nhập ít nhất 2 ký tự để tìm trong transcript.",
        "en": "Enter at least 2 characters to search in transcript.",
        "ja": "トランスクリプトを検索するには2文字以上入力してください。",
    },
    "meeting.combineNotesTitle": {
        "vi": "Gộp nhiều video/memo thành một bản học",
        "en": "Combine multiple videos/memos into a summary",
        "ja": "複数の会議・動画メモを一括統合",
    },
    "meeting.combineNotesDesc": {
        "vi": "Tick 2-12 meeting note đã hoàn thành ở danh sách dưới, rồi tạo một memo tổng hợp dễ đọc hơn cho cả chuỗi bài học/cuộc họp.",
        "en": "Check 2-12 completed meeting notes below to create a combined summary memo for lessons or project sync.",
        "ja": "完了した2〜12件の会議メモを選択し、一連の会議や学習用の統合まとめメモを作成します。",
    },
    "meeting.combineCount": {
        "vi": "Gộp {count} memo",
        "en": "Combine {count} memos",
        "ja": "{count}件のメモを統合",
    },
    "meeting.needRecoverMemo": {
        "vi": "memo cần recover",
        "en": "memos need recovery",
        "ja": "件のメモが復元を必要としています",
    },
    "meeting.actionsPendingReview": {
        "vi": "action chờ review",
        "en": "actions pending review",
        "ja": "件のアクションがレビュー待ち",
    },
    "meeting.actionsSyncedTodo": {
        "vi": "action đã sync Todo",
        "en": "actions synced to Todo",
        "ja": "件のアクションがTodoと同期済",
    },
    "meeting.actionsIgnored": {
        "vi": "action đã bỏ qua",
        "en": "actions ignored",
        "ja": "件のアクションをスキップ",
    },
    "meeting.resumeSelectFile": {
        "vi": "Chọn file gốc để resume",
        "en": "Select original file to resume",
        "ja": "再開するには元のファイルを選択してください",
    },
    "meeting.sourceCleanedNotice": {
        "vi": "File gốc đã được dọn sau khi tạo artifact.",
        "en": "Source file has been cleaned up after generating artifacts.",
        "ja": "成果物生成後、元ファイルは整理・削除されました。",
    },
    "meeting.downloadRawTranscript": {
        "vi": "Tải transcript gốc",
        "en": "Download raw transcript",
        "ja": "元トランスクリプトをダウンロード",
    },
    "meeting.downloadCleanTranscript": {
        "vi": "Tải transcript đã sửa thuật ngữ",
        "en": "Download cleaned transcript",
        "ja": "用語補正済トランスクリプトをダウンロード",
    },
    "meeting.downloadSrt": {
        "vi": "Tải .srt",
        "en": "Download .srt",
        "ja": ".srtをダウンロード",
    },
    "meeting.retranscribeFull": {
        "vi": "Transcribe lại đầy đủ",
        "en": "Re-transcribe in full",
        "ja": "フル再文字起こし",
    },

    # Health & Validation
    "health.workspaceAndDb": {
        "vi": "Workspace & CSDL",
        "en": "Workspace & DB",
        "ja": "ワークスペース＆DB",
    },
    "health.workspaceDbTitle": {
        "vi": "Hoạt động Workspace, CSDL & Meeting Jobs",
        "en": "Workspace Activity, Database & Meeting Jobs",
        "ja": "ワークスペース状況、データベースおよび会議ジョブ",
    },
    "health.workspaceDbDesc": {
        "vi": "Kiểm tra tính toàn vẹn của dữ liệu và tiến độ các tác vụ nền: Meeting Note transcript jobs và Glossary Analytics.",
        "en": "Check data integrity and background task progress: Meeting Note transcript jobs and Glossary Analytics.",
        "ja": "データの整合性とバックグラウンド処理の進捗（会議文字起こしジョブおよび用語集分析）を確認します。",
    },
    "health.deepHealthUnresponsive": {
        "vi": "Deep health endpoint chưa phản hồi: ",
        "en": "Deep health endpoint unresponsive: ",
        "ja": "ディープヘルスエンドポイントが無応答: ",
    },
    "health.deepHealthNoWarnings": {
        "vi": "Deep health chưa ghi nhận cảnh báo nào.",
        "en": "No warnings recorded by deep health check.",
        "ja": "ディープヘルスチェックで警告は検出されませんでした。",
    },
    "health.dbRecords": {
        "vi": "Bản ghi Cơ sở dữ liệu",
        "en": "Database Records",
        "ja": "データベースレコード",
    },
    "health.meetingQueueProgress": {
        "vi": "Tiến độ Meeting Queue",
        "en": "Meeting Queue Progress",
        "ja": "会議キュージョブ進捗",
    },
    "health.noMeetingJobs": {
        "vi": "Chưa có Meeting Note job nào trong DB.",
        "en": "No Meeting Note jobs currently in DB.",
        "ja": "DB内に会議メモジョブはありません。",
    },
    "health.processing": {
        "vi": "Đang xử lý: ",
        "en": "Processing: ",
        "ja": "処理中: ",
    },
    "health.failed": {
        "vi": "Lỗi: ",
        "en": "Errors: ",
        "ja": "エラー: ",
    },
    "health.glossaryMetrics": {
        "vi": "Chỉ số Glossary Analytics",
        "en": "Glossary Analytics Metrics",
        "ja": "用語集分析メトリクス",
    },
    "health.totalTerms": {
        "vi": "Tổng thuật ngữ",
        "en": "Total Terms",
        "ja": "総用語数",
    },
    "health.pendingAuto": {
        "vi": "Chờ duyệt (Auto)",
        "en": "Pending Approval (Auto)",
        "ja": "承認待ち (自動抽出)",
    },
    "health.potentialDuplicates": {
        "vi": "Trùng lặp tiềm ẩn",
        "en": "Potential Duplicates",
        "ja": "重複の可能性",
    },
    "health.glossaryReviewHint": {
        "vi": "* Thuật ngữ \"Chờ duyệt\" được trích xuất tự động qua AI. Review tại Glossary Hub.",
        "en": "* \"Pending Approval\" terms are automatically extracted by AI. Review at Glossary Hub.",
        "ja": "※「承認待ち」用語はAIによって自動抽出されました。Glossary Hubで確認・承認してください。",
    },

    # Settings Backup Vault
    "settings.backupVaultTitle": {
        "vi": "Két sắt Sao lưu Mã hóa 1-Click (.brsebackup) 🔒",
        "en": "1-Click Encrypted System Vault (.brsebackup) 🔒",
        "ja": "1クリック暗号化システムバックアップ保管庫 (.brsebackup) 🔒",
    },
    "settings.backupVaultDesc": {
        "vi": "Sao lưu toàn diện dữ liệu hệ thống cục bộ: Toàn bộ PostgreSQL Database cùng các thư mục media quan trọng (ghi âm cuộc họp, hình ảnh Todo, tài liệu backup). File nén xuất ra dưới định dạng chuyên dụng có khóa bảo mật và tối ưu dung lượng để cất giữ trong USB hoặc Cloud bảo mật.",
        "en": "Comprehensive backup of local system data: Entire PostgreSQL Database and critical media folders (meeting recordings, Todo attachments, backup docs). Exported in a secure, optimized archive format.",
        "ja": "ローカルシステムデータの包括的バックアップ：PostgreSQLデータベース全体および重要なメディア（会議録音、Todo添付画像、バックアップ文書）。安全に暗号化・最適化された形式でエクスポートします。",
    },
    "settings.downloadFullBackup": {
        "vi": "Tải bản sao lưu toàn hệ thống (.brsebackup) 💾",
        "en": "Download full system backup (.brsebackup) 💾",
        "ja": "全システムバックアップをダウンロード (.brsebackup) 💾",
    },
    "settings.restoreFromBackup": {
        "vi": "Khôi phục hệ thống từ tệp .brsebackup 📂",
        "en": "Restore system from .brsebackup file 📂",
        "ja": ".brsebackupファイルからシステムを復元 📂",
    },
    "settings.vaultGuideTitle": {
        "vi": "Hướng dẫn vận hành Két sắt sao lưu:",
        "en": "System Backup Vault Operating Guide:",
        "ja": "バックアップ保管庫の運用ガイド:",
    },
    "settings.vaultGuideItem1": {
        "vi": "Bản sao lưu chứa: PostgreSQL DB + Meeting Record Audio files + Todo Attachment Images.",
        "en": "Backup contains: PostgreSQL DB + Meeting Record Audio files + Todo Attachment Images.",
        "ja": "バックアップ対象：PostgreSQL DB ＋ 会議録音音声ファイル ＋ Todo添付画像。",
    },
    "settings.vaultGuideItem2": {
        "vi": "Khuyến nghị định kỳ hàng tuần hoặc trước khi nâng cấp hệ thống, hãy export 1 bản .brsebackup để lưu trữ an toàn.",
        "en": "Recommended weekly or before upgrading system, export 1 .brsebackup file for safe keeping.",
        "ja": "毎週定期的に、またはシステム更新の前に1部エクスポートして安全に保管することを推奨します。",
    },
    "settings.vaultGuideItem3": {
        "vi": "Khi đổi thiết bị hoặc phục hồi sau sự cố, chỉ cần dùng tính năng Khôi phục để làm sạch PostgreSQL cũ và tải lại 100% dữ liệu.",
        "en": "When changing devices or recovering from failure, use Restore to clean old DB and reload 100% of data.",
        "ja": "端末変更時や障害復旧時には、復元機能を使用して以前のDBを初期化し100%のデータを再読み込みできます。",
    },
    "settings.systemSettingsDesc": {
        "vi": "Quản lý dự án, cấu hình AI engine và thiết lập thông báo cho BrSE OS.",
        "en": "Manage projects, configure AI engine, and set up notifications for BrSE OS.",
        "ja": "プロジェクト管理、AIエンジンの構成、およびBrSE OSの通知設定を行います。",
    },
    "settings.useTemplate": {
        "vi": "Dùng template",
        "en": "Use template",
        "ja": "テンプレートを使用",
    },
    "settings.noActiveProjectTitle": {
        "vi": "Chưa có project active",
        "en": "No active project",
        "ja": "アクティブなプロジェクトがありません",
    },
    "settings.noActiveProjectDesc": {
        "vi": "Hãy tạo hoặc chọn một project trước khi cấu hình Slack/Chatwork notifications.",
        "en": "Please create or select a project before configuring Slack/Chatwork notifications.",
        "ja": "Slack/Chatwork通知を設定する前に、プロジェクトを作成または選択してください。",
    },
    "settings.chatworkTokenPlaceholder": {
        "vi": "Nhập Chatwork API Token của bạn...",
        "en": "Enter your Chatwork API Token...",
        "ja": "Chatwork APIトークンを入力...",
    },
    "settings.chatworkRoomPlaceholder": {
        "vi": "Nhập ID phòng Chatwork...",
        "en": "Enter Chatwork Room ID...",
        "ja": "ChatworkルームIDを入力...",
    },
    "settings.customerEmailHelp": {
        "vi": "Dùng để mở Gmail Compose đã điền sẵn người nhận; app không tự gửi mail.",
        "en": "Used to open Gmail Compose prefilled with recipient; app does not send emails automatically.",
        "ja": "宛先入力済みのGmail作成画面を開くために使用されます。アプリから自動送信は行われません。",
    },
    "settings.langVi": {
        "vi": "Tiếng Việt",
        "en": "Vietnamese",
        "ja": "ベトナム語",
    },

    # Universal Note View
    "notes.saveSuccess": {
        "vi": "Đã lưu ghi chú thành công!",
        "en": "Note saved successfully!",
        "ja": "メモを正常に保存しました！",
    },
    "notes.saveError": {
        "vi": "Không thể lưu ghi chú. Vui lòng kiểm tra kết nối.",
        "en": "Failed to save note. Please check your connection.",
        "ja": "メモを保存できませんでした。接続を確認してください。",
    },
    "notes.updatedAt": {
        "vi": "Cập nhật",
        "en": "Updated",
        "ja": "更新",
    },
    "notes.words": {
        "vi": "từ",
        "en": "words",
        "ja": "単語",
    },
    "notes.fullscreen": {
        "vi": "Toàn màn hình",
        "en": "Fullscreen",
        "ja": "全画面",
    },
    "notes.saveKnowledge": {
        "vi": "Lưu Knowledge",
        "en": "Save Knowledge",
        "ja": "Knowledgeに保存",
    },
    "notes.pinned": {
        "vi": "Đã Pin",
        "en": "Pinned",
        "ja": "ピン留め済",
    },
    "notes.pin": {
        "vi": "Ghim",
        "en": "Pin",
        "ja": "ピン留め",
    },
    "notes.delete": {
        "vi": "Xóa",
        "en": "Delete",
        "ja": "削除",
    },
    "notes.viewMode": {
        "vi": "Chế độ xem (Markdown)",
        "en": "Preview Mode (Markdown)",
        "ja": "プレビューモード (Markdown)",
    },
    "notes.editMode": {
        "vi": "Chế độ sửa",
        "en": "Edit Mode",
        "ja": "編集モード",
    },
    "notes.edit": {
        "vi": "Sửa",
        "en": "Edit",
        "ja": "編集",
    },
    "notes.preview": {
        "vi": "Xem trước",
        "en": "Preview",
        "ja": "プレビュー",
    },
    "notes.saveChanges": {
        "vi": "Lưu thay đổi",
        "en": "Save changes",
        "ja": "変更を保存",
    },
    "notes.noContent": {
        "vi": "*Chưa có nội dung*",
        "en": "*No content yet*",
        "ja": "※内容がまだありません",
    },
    "notes.placeholder": {
        "vi": "Bắt đầu viết ghi chú của bạn tại đây...",
        "en": "Start writing your note here...",
        "ja": "ここにメモを入力し始めてください...",
    },
    "notes.autosaveHint": {
        "vi": "Gợi ý: Hệ thống tự động sao lưu bản nháp vào trình duyệt.",
        "en": "Tip: Drafts are automatically backed up to browser local storage.",
        "ja": "ヒント: 下書きはブラウザのローカルストレージに自動保存されます。",
    },

    # Reports
    "reports.monthlyReportTitle": {
        "vi": "Báo cáo tháng",
        "en": "Monthly Report",
        "ja": "月次報告",
    },
    "reports.reportDays": {
        "vi": "ngày báo cáo",
        "en": "report days",
        "ja": "報告日数",
    },
    "reports.copyJpReport": {
        "vi": "Copy JP Report",
        "en": "Copy JP Report",
        "ja": "日本語報告をコピー",
    },
    "reports.allDoneTasksMonthly": {
        "vi": "Tất cả tasks đã hoàn thành trong tháng",
        "en": "All completed tasks this month",
        "ja": "今月の全完了タスク",
    },
    "reports.noMonthlyReports": {
        "vi": "Chưa có báo cáo trong tháng này",
        "en": "No reports yet this month",
        "ja": "今月の報告データはまだありません",
    },
    "reports.noMonthlyReportsHint": {
        "vi": "Hãy tạo Daily Report để monthly summary tự động tổng hợp.",
        "en": "Create Daily Reports to automatically compile the monthly summary.",
        "ja": "日次報告を作成すると、月次サマリーが自動的に集計されます。",
    },
    "reports.createDailyReport": {
        "vi": "Tạo báo cáo ngày",
        "en": "Create daily report",
        "ja": "日次報告を作成",
    },

    # Operations
    "operations.selectedQnaCount": {
        "vi": "Đã chọn {count} Q&A",
        "en": "{count} Q&As selected",
        "ja": "{count}件のQ&Aを選択中",
    },
    "operations.markAnswered": {
        "vi": "Đánh dấu đã trả lời",
        "en": "Mark as answered",
        "ja": "回答済みに設定",
    },
    "operations.deselect": {
        "vi": "Bỏ chọn",
        "en": "Deselect",
        "ja": "選択解除",
    },
    "operations.updateStatusError": {
        "vi": "Lỗi khi cập nhật trạng thái.",
        "en": "Error updating status.",
        "ja": "ステータスの更新中にエラーが発生しました。",
    },
    "operations.overdueDays": {
        "vi": "Quá hạn {days} ngày!",
        "en": "Overdue by {days} days!",
        "ja": "{days}日超過！",
    },
    "operations.deadlineToday": {
        "vi": "Hạn chót hôm nay!",
        "en": "Due today!",
        "ja": "本日締切！",
    },
    "operations.deadlineRemaining": {
        "vi": "Hạn chót còn {days} ngày!",
        "en": "{days} days left until due!",
        "ja": "締切まであと{days}日！",
    },
    "operations.daysRemaining": {
        "vi": "Còn {days} ngày",
        "en": "{days} days remaining",
        "ja": "残り{days}日",
    },
    "operations.prevStatus": {
        "vi": "Chuyển trạng thái trước",
        "en": "Move to previous status",
        "ja": "前のステータスに戻す",
    },
    "operations.nextStatus": {
        "vi": "Chuyển trạng thái tiếp",
        "en": "Move to next status",
        "ja": "次のステータスに進める",
    },
    "operations.briefingTitle": {
        "vi": "Hôm nay cần làm gì trong Operations?",
        "en": "What needs attention in Operations today?",
        "ja": "本日のOperations対応事項",
    },
    "operations.briefingWaiting": {
        "vi": "Cần trả lời / xác nhận",
        "en": "Needs reply / confirmation",
        "ja": "回答・確認待ち",
    },
    "operations.briefingApprove": {
        "vi": "Chờ approve / discuss",
        "en": "Awaiting approval / discussion",
        "ja": "承認・協議待ち",
    },
    "operations.briefingEscalate": {
        "vi": "Cần escalate ngay",
        "en": "Needs immediate escalation",
        "ja": "緊急エスカレーション要",
    },
}

def inject_for_lang(lang):
    filepath = f"frontend/lib/i18n/{lang}.ts"
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # Fix typo in ja.ts if present
    if lang == "ja":
        content = content.replace("dữ liệu là", "dữ liệu は").replace("データ là", "データは")

    # Find the closing "} as const;"
    last_brace_idx = content.rfind("} as const;")
    if last_brace_idx == -1:
        last_brace_idx = content.rfind("};")
    if last_brace_idx == -1:
        raise Exception(f"Closing brace not found in {filepath}")

    # Build lines to insert
    lines = []
    for k, trans in sorted(new_keys.items()):
        val = trans[lang]
        # escape double quotes and backslashes in value if needed
        val_escaped = val.replace("\\", "\\\\").replace('"', '\\"')
        lines.append(f'  "{k}": "{val_escaped}",\n')

    insert_str = "".join(lines)
    new_content = content[:last_brace_idx] + insert_str + content[last_brace_idx:]

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(new_content)
    print(f"Injected {len(new_keys)} keys into {filepath}")

for lang in ["vi", "en", "ja"]:
    inject_for_lang(lang)
