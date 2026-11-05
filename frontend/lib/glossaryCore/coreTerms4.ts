import type { GlossaryTerm } from "../glossary";

// Core glossary terms, part 4 of 4 (split from lib/glossary.ts; order is significant).
export const coreTerms4: GlossaryTerm[] = [
  {
    id: "caching",
    english: "Caching",
    japanese: "キャッシュ化 / キャッシング",
    vietnamese: "Bộ nhớ đệm dữ liệu",
    roles: ["Dev", "BrSE"],
    category: "Quality",
    note: "Lưu tạm dữ liệu hay dùng vào RAM để truy xuất siêu tốc lần sau.",
    example: "Redisによるキャッシュ処理を追加します。"
  },
  {
    id: "token",
    english: "Token",
    japanese: "トークン",
    vietnamese: "Mã xác thực an toàn",
    roles: ["Dev", "BrSE", "QA"],
    category: "Quality",
    note: "Chuỗi ký tự bảo mật đại diện cho quyền truy cập của user (như JWT).",
    example: "アクセストークンの有効期限を設定します。"
  },
  {
    id: "monolithic",
    english: "Monolithic",
    japanese: "モノリス / モノリシック",
    vietnamese: "Kiến trúc ứng dụng nguyên khối",
    roles: ["Dev", "BrSE", "PM"],
    category: "Requirement",
    note: "Mô hình thiết kế ứng dụng trong đó toàn bộ tính năng gộp chung vào một source code duy nhất.",
    example: "モノリスからマイクロサービスへ移行します。"
  },
  {
    id: "microservices",
    english: "Microservices",
    japanese: "マイクロサービス",
    vietnamese: "Kiến trúc vi dịch vụ",
    roles: ["Dev", "BrSE", "PM"],
    category: "Requirement",
    note: "Kiến trúc chia nhỏ ứng dụng thành nhiều dịch vụ độc lập giao tiếp qua API.",
    example: "マイクロサービス設計を採用します。"
  },
  {
    id: "unit-test",
    english: "Unit Test",
    japanese: "単体テスト",
    kana: "たんたいてすと",
    vietnamese: "Kiểm thử đơn vị",
    roles: ["Dev", "BrSE", "QA"],
    category: "Quality",
    note: "Việc viết code tự động để kiểm tra các hàm hoặc thành phần nhỏ nhất của chương trình.",
    example: "単体テストのコードカバレッジを80%以上に維持します。"
  },
  {
    id: "integration-test",
    english: "Integration Test",
    japanese: "結合テスト",
    kana: "けつごうてすと",
    vietnamese: "Kiểm thử tích hợp",
    roles: ["Dev", "BrSE", "QA"],
    category: "Quality",
    note: "Kiểm thử sự tương tác và tích hợp giữa nhiều module hoặc dịch vụ với nhau.",
    example: "結合テスト環境でAPIの疎通確認を行います。"
  },
  {
    id: "ci-cd",
    english: "CI/CD",
    japanese: "継続的インテグレーション / 継続的デリバリー",
    vietnamese: "Tích hợp và triển khai liên tục tự động",
    roles: ["Dev", "BrSE", "PM"],
    category: "Release",
    note: "Quy trình phát triển phần mềm tự động hóa từ viết code, kiểm thử đến phát hành.",
    example: "CI/CDパイプラインを導入して開発効率を高めます。"
  },
  {
    id: "schema",
    english: "Schema",
    japanese: "スキーマ",
    vietnamese: "Lược đồ cấu trúc dữ liệu",
    roles: ["Dev", "BrSE"],
    category: "Requirement",
    note: "Đặc tả cấu trúc của database, XML, hoặc JSON payload.",
    example: "データベースのスキーマ設計書を更新します。"
  },
  {
    id: "github",
    english: "GitHub",
    japanese: "ギットハブ",
    vietnamese: "Nền tảng quản lý mã nguồn Git",
    roles: ["Dev", "BrSE", "PM"],
    category: "Project",
    note: "Nền tảng lưu trữ và cộng tác phát triển phần mềm dựa trên hệ thống quản lý phiên bản Git.",
    example: "GitHub上で共同開発を進めます。"
  },
  {
    id: "deprecated",
    english: "Deprecated",
    japanese: "非推奨",
    kana: "ひすいしょう",
    vietnamese: "Bị phản đối / Không khuyến khích dùng nữa",
    roles: ["Dev", "BrSE", "QA"],
    category: "Quality",
    note: "Tính năng, thư viện hoặc hàm cũ không còn được khuyến khích sử dụng và có thể bị xóa trong tương lai.",
    example: "このAPIは非推奨になりました。"
  },
  {
    id: "concurrency",
    english: "Concurrency",
    japanese: "並行性 / 同時実行",
    kana: "へいこうせい",
    vietnamese: "Tính đồng thời / Xử lý đồng thời",
    roles: ["Dev", "BrSE"],
    category: "Requirement",
    note: "Khả năng hệ thống thực hiện nhiều tác vụ trong cùng một khoảng thời gian.",
    example: "高並行性をサポートする設計。"
  },
  {
    id: "idempotent",
    english: "Idempotent / Idempotency",
    japanese: "べき等 / べき等性",
    kana: "べきとう",
    vietnamese: "Tính không đổi trạng thái khi thực hiện lại nhiều lần (Idempotency)",
    roles: ["Dev", "BrSE"],
    category: "Requirement",
    note: "Đặc tính của một thao tác mà khi thực hiện một hay nhiều lần đều đem lại cùng một kết quả.",
    example: "APIのべき等性を保証します。"
  },
  {
    id: "scalability",
    english: "Scalability",
    japanese: "拡張性 / スケーラビリティ",
    kana: "かくちょうせい",
    vietnamese: "Khả năng mở rộng hệ thống",
    roles: ["Dev", "BrSE", "PM"],
    category: "Quality",
    note: "Khả năng của hệ thống để xử lý lượng công việc tăng lên bằng cách thêm tài nguyên.",
    example: "システムの拡張性を考慮した設計。"
  },
  {
    id: "redundancy",
    english: "Redundancy",
    japanese: "冗長性 / 冗長化",
    kana: "じょうちょうせい",
    vietnamese: "Tính dư thừa / Thiết lập dự phòng",
    roles: ["Dev", "BrSE", "PM"],
    category: "Release",
    note: "Việc thiết lập các thành phần dự phòng để đảm bảo hệ thống vẫn hoạt động khi có sự cố xảy ra.",
    example: "サーバーの冗長化を図ります。"
  },
  {
    id: "latency",
    english: "Latency",
    japanese: "遅延時間 / レイテンシー",
    kana: "ちえんじかん",
    vietnamese: "Độ trễ hệ thống / Mạng",
    roles: ["Dev", "BrSE", "QA"],
    category: "Quality",
    note: "Khoảng thời gian từ khi gửi yêu cầu cho đến khi nhận được phản hồi đầu tiên.",
    example: "レイテンシーを最小限に抑えます。"
  },
  {
    id: "throughput",
    english: "Throughput",
    japanese: "スループット / 処理能力",
    vietnamese: "Năng suất xử lý / Băng thông thực tế",
    roles: ["Dev", "BrSE"],
    category: "Quality",
    note: "Lượng dữ liệu hoặc số lượng yêu cầu được hệ thống xử lý thành công trong một đơn vị thời gian.",
    example: "スループットを向上させるチューニング。"
  },
  {
    id: "serialization",
    english: "Serialization",
    japanese: "直列化 / シリアライズ",
    kana: "ちょくれつか",
    vietnamese: "Tuần tự hóa dữ liệu",
    roles: ["Dev", "BrSE"],
    category: "Requirement",
    note: "Quá trình chuyển đổi một đối tượng cấu trúc dữ liệu thành một chuỗi byte hoặc chuỗi văn bản (như JSON) để lưu trữ hoặc truyền đi.",
    example: "オブジェクトをJSONにシリアライズします。"
  },
  {
    id: "deserialization",
    english: "Deserialization",
    japanese: "逆直列化 / デシリアライズ",
    kana: "ぎゃくちょくれつか",
    vietnamese: "Giải tuần tự hóa dữ liệu",
    roles: ["Dev", "BrSE"],
    category: "Requirement",
    note: "Quá trình chuyển đổi chuỗi byte hoặc chuỗi văn bản ngược lại thành đối tượng cấu trúc dữ liệu trong bộ nhớ.",
    example: "データをデシリアライズしてオブジェクトを復元します。"
  },
  {
    id: "polymorphism",
    english: "Polymorphism",
    japanese: "多態性 / ポリモーフィズム",
    kana: "たたいせい",
    vietnamese: "Tính đa hình",
    roles: ["Dev", "BrSE"],
    category: "Requirement",
    note: "Đặc tính trong lập trình hướng đối tượng cho phép các đối tượng khác nhau phản hồi cùng một thông điệp theo các cách khác nhau.",
    example: "ポリモーフィズムを利用してコードを共通化します。"
  },
  {
    id: "encapsulation",
    english: "Encapsulation",
    japanese: "カプセル化",
    vietnamese: "Tính đóng gói",
    roles: ["Dev", "BrSE"],
    category: "Requirement",
    note: "Che giấu chi tiết triển khai bên trong của đối tượng và chỉ để lộ ra các interface cần thiết.",
    example: "データ構造をカプセル化します。"
  },
  {
    id: "inheritance",
    english: "Inheritance",
    japanese: "継承",
    kana: "けいしょう",
    vietnamese: "Tính kế thừa",
    roles: ["Dev", "BrSE"],
    category: "Requirement",
    note: "Cơ chế cho phép một class mới thừa hưởng các thuộc tính và phương thức từ một class có sẵn.",
    example: "基本クラスの機能を継承します。"
  },
  {
    id: "abstraction",
    english: "Abstraction",
    japanese: "抽象化",
    kana: "ちゅうしょうか",
    vietnamese: "Tính trừu tượng",
    roles: ["Dev", "BrSE"],
    category: "Requirement",
    note: "Tập trung vào các đặc điểm cốt lõi của đối tượng mà bỏ qua các chi tiết triển khai rườm rà.",
    example: "インターフェースを用いて抽象化を行います。"
  },
  {
    id: "argument",
    english: "Argument",
    japanese: "引数",
    kana: "ひきすう",
    vietnamese: "Đối số / Tham số truyền vào thực tế",
    roles: ["Dev", "BrSE"],
    category: "Requirement",
    note: "Giá trị thực tế được truyền vào hàm khi gọi hàm đó.",
    example: "関数に必要な引数を渡します。"
  },
  {
    id: "parameter",
    english: "Parameter",
    japanese: "パラメータ / 引数",
    vietnamese: "Tham số định nghĩa của hàm / Cấu hình",
    roles: ["Dev", "BrSE"],
    category: "Requirement",
    note: "Biến được định nghĩa trong chữ ký của hàm để nhận giá trị truyền vào.",
    example: "パラメータのデフォルト値を設定します。"
  },
  {
    id: "thread",
    english: "Thread",
    japanese: "スレッド",
    vietnamese: "Luồng xử lý nhẹ trong tiến trình (Thread)",
    roles: ["Dev", "BrSE"],
    category: "Requirement",
    note: "Đơn vị thực thi nhỏ nhất của code được quản lý bởi hệ điều hành.",
    example: "マルチスレッドで並行処理を実装します。"
  },
  {
    id: "process",
    english: "Process",
    japanese: "プロセス",
    vietnamese: "Tiến trình chạy ứng dụng độc lập (Process)",
    roles: ["Dev", "BrSE"],
    category: "Requirement",
    note: "Một chương trình đang được thực thi, có không gian bộ nhớ độc lập.",
    example: "バックグラウンドでプロセスを起動します。"
  },
  {
    id: "compilation",
    english: "Compilation",
    japanese: "コンパイル / 翻訳",
    vietnamese: "Biên dịch mã nguồn sang mã máy",
    roles: ["Dev", "BrSE"],
    category: "Project",
    note: "Quá trình chuyển đổi toàn bộ mã nguồn viết bằng ngôn ngữ bậc cao sang ngôn ngữ máy hoặc bytecode trước khi chạy.",
    example: "コードのコンパイルを実行します。"
  },
  {
    id: "transpilation",
    english: "Transpilation",
    japanese: "トランスパイル",
    vietnamese: "Biên dịch nguồn-sang-nguồn",
    roles: ["Dev", "BrSE"],
    category: "Project",
    note: "Biên dịch mã nguồn từ ngôn ngữ này sang một ngôn ngữ bậc cao khác (ví dụ: TypeScript sang JavaScript).",
    example: "Babelを使用してトランスパイルします。"
  },
  {
    id: "bundler",
    english: "Bundler",
    japanese: "バンドラー",
    vietnamese: "Công cụ đóng gói mã nguồn và tài nguyên",
    roles: ["Dev", "BrSE"],
    category: "Project",
    note: "Công cụ gộp nhiều file code và assets thành các file tĩnh được tối ưu hóa (như Vite, Webpack).",
    example: "バンドラーの設定を最適化します。"
  },
  {
    id: "linter",
    english: "Linter",
    japanese: "リンター",
    vietnamese: "Công cụ phân tích lỗi cú pháp và định dạng code",
    roles: ["Dev", "BrSE", "QA"],
    category: "Quality",
    note: "Công cụ quét mã nguồn tĩnh để tìm lỗi cú pháp, vi phạm quy chuẩn viết code (như ESLint).",
    example: "リンターを実行して静的解析を行います。"
  },
  {
    id: "deployment",
    english: "Deployment",
    japanese: "デプロイ / 展開",
    vietnamese: "Triển khai ứng dụng lên máy chủ",
    roles: ["Dev", "BrSE", "QA", "PM"],
    category: "Release",
    note: "Quá trình phân phối, cài đặt và kích hoạt ứng dụng trên môi trường chạy thực tế.",
    example: "ステージング環境にデプロイします。"
  },
  {
    id: "rollback",
    english: "Rollback",
    japanese: "ロールバック / 巻き戻し",
    vietnamese: "Quay lui trạng thái / Khôi phục phiên bản cũ",
    roles: ["Dev", "BrSE", "QA", "PM"],
    category: "Release",
    note: "Hành động đưa cơ sở dữ liệu hoặc phiên bản ứng dụng quay trở lại trạng thái ổn định trước đó khi gặp sự cố.",
    example: "デプロイに失敗したため、ロールバックを行います。"
  },
  {
    id: "migration",
    english: "Migration",
    japanese: "マイグレーション / 移行",
    vietnamese: "Di trú dữ liệu / Cập nhật cấu trúc database",
    roles: ["Dev", "BrSE"],
    category: "Project",
    note: "Quản lý các thay đổi về cấu trúc bảng dữ liệu (schema) theo thời gian bằng code.",
    example: "データベースのマイグレーションを実行してください。"
  },
  {
    id: "payload",
    english: "Payload",
    japanese: "ペイロード / 送信データ",
    vietnamese: "Phần dữ liệu có ích được truyền đi trong request/response",
    roles: ["Dev", "BrSE"],
    category: "Requirement",
    note: "Phần dữ liệu thực tế được gửi đi trong một gói tin mạng hoặc API request, không tính phần header.",
    example: "APIのペイロードに必要な値を含めます。"
  },
  {
    id: "query",
    english: "Query",
    japanese: "クエリ / 問い合わせ",
    vietnamese: "Câu lệnh truy vấn cơ sở dữ liệu",
    roles: ["Dev", "BrSE", "QA"],
    category: "Requirement",
    note: "Yêu cầu trích xuất hoặc thao tác dữ liệu gửi đến hệ quản trị cơ sở dữ liệu.",
    example: "クエリのパフォーマンスをチューニングします。"
  },
  {
    id: "index",
    english: "Index",
    japanese: "インデックス / 索引",
    vietnamese: "Chỉ mục tìm kiếm nhanh trong database",
    roles: ["Dev", "BrSE"],
    category: "Requirement",
    note: "Cấu trúc dữ liệu giúp tăng tốc độ tìm kiếm và truy xuất bản ghi trong database.",
    example: "検索速度向上のため、テーブルにインデックスを作成します。"
  },
  {
    id: "deadlock",
    english: "Deadlock",
    japanese: "デッドロック",
    vietnamese: "Tình trạng bế tắc hệ thống (Deadlock)",
    roles: ["Dev", "BrSE"],
    category: "Quality",
    note: "Hiện tượng hai hoặc nhiều tiến trình chờ đợi lẫn nhau giải phóng tài nguyên, gây treo hệ thống.",
    example: "データベースのデッドロックが発生しました。"
  },
  {
    id: "race-condition",
    english: "Race Condition",
    japanese: "競合状態",
    kana: "きょうごうじょうたい",
    vietnamese: "Tình trạng tranh chấp tài nguyên (Race Condition)",
    roles: ["Dev", "BrSE"],
    category: "Quality",
    note: "Tình huống xảy ra khi nhiều luồng hoặc tiến trình cùng truy cập và thay đổi một dữ liệu chung đồng thời.",
    example: "排他制御を行わないと、競合状態が発生します。"
  },
  {
    id: "load-balancer",
    english: "Load Balancer",
    japanese: "ロードバランサー / 負荷分散装置",
    vietnamese: "Bộ cân bằng tải hệ thống",
    roles: ["Dev", "BrSE", "PM"],
    category: "Release",
    note: "Thiết bị hoặc phần mềm phân phối lượng truy cập mạng đồng đều giữa các máy chủ phía sau.",
    example: "ロードバランサーを導入して負荷を分散します。"
  },
  {
    id: "stateless",
    english: "Stateless",
    japanese: "ステートレス / 状態なし",
    vietnamese: "Không lưu giữ trạng thái phiên làm việc",
    roles: ["Dev", "BrSE"],
    category: "Requirement",
    note: "Kiến trúc thiết kế nơi mỗi request gửi đi là độc lập và không phụ thuộc hay lưu giữ thông tin của request trước.",
    example: "APIサーバーをステートレスに設計します。"
  },
  {
    id: "stateful",
    english: "Stateful",
    japanese: "ステートフル / 状態あり",
    vietnamese: "Có lưu giữ trạng thái phiên làm việc",
    roles: ["Dev", "BrSE"],
    category: "Requirement",
    note: "Hệ thống hoặc giao thức lưu giữ thông tin phiên làm việc của người dùng qua các yêu cầu liên tiếp.",
    example: "セッション管理のためにステートフルな構成を採用します。"
  },
  {
    id: "immutable",
    english: "Immutable",
    japanese: "不変 / イミュータブル",
    kana: "ふへん",
    vietnamese: "Không thể thay đổi giá trị sau khi tạo",
    roles: ["Dev", "BrSE"],
    category: "Requirement",
    note: "Đặc tính của đối tượng hoặc biến mà giá trị của nó không thể bị sửa đổi sau khi được khởi tạo.",
    example: "イミュータブルなオブジェクトとして定義します。"
  },
  {
    id: "mutable",
    english: "Mutable",
    japanese: "可変 / ミュータブル",
    kana: "かへん",
    vietnamese: "Có thể thay đổi giá trị sau khi tạo",
    roles: ["Dev", "BrSE"],
    category: "Requirement",
    note: "Đặc tính của đối tượng hoặc biến cho phép thay đổi giá trị của nó sau khi khởi tạo.",
    example: "JavaScriptの配列はミュータブルなデータ構造です。"
  },
  {
    id: "callback",
    english: "Callback",
    japanese: "コールバック",
    vietnamese: "Hàm phản hồi / Hàm gọi lại (Callback)",
    roles: ["Dev", "BrSE"],
    category: "Requirement",
    note: "Một hàm được truyền dưới dạng đối số vào một hàm khác để được thực thi sau khi một sự kiện xảy ra.",
    example: "非同期処理の完了後にコールバック関数を実行します。"
  },
  {
    id: "promise",
    english: "Promise",
    japanese: "プロミス",
    vietnamese: "Đối tượng xử lý bất đồng bộ hứa hẹn kết quả",
    roles: ["Dev", "BrSE"],
    category: "Requirement",
    note: "Đại diện cho một liên kết xử lý bất đồng bộ có thể thành công (resolved) hoặc thất bại (rejected) in tương lai.",
    example: "Promiseを用いて非同期処理のチェーンを記述します。"
  },
  {
    id: "observable",
    english: "Observable",
    japanese: "オブザーバブル",
    vietnamese: "Luồng dữ liệu có thể quan sát và lắng nghe",
    roles: ["Dev", "BrSE"],
    category: "Requirement",
    note: "Luồng dữ liệu phát ra nhiều giá trị theo thời gian và cho phép các đối tượng đăng ký để lắng nghe (RxJS).",
    example: "イベントストリームをObservableとして扱います。"
  },
  {
    id: "singleton",
    english: "Singleton",
    japanese: "シングルトン",
    vietnamese: "Mẫu thiết kế đơn thể (Chỉ duy nhất một đối tượng)",
    roles: ["Dev", "BrSE"],
    category: "Requirement",
    note: "Design pattern đảm bảo một class chỉ có duy nhất một thực thể (instance) trong suốt vòng đời ứng dụng.",
    example: "データベース接続クラスをシングルトンパターンで実装します。"
  },
  {
    id: "boilerplate",
    english: "Boilerplate",
    japanese: "ボイラープレート / 雛形",
    vietnamese: "Mã nguồn mẫu / Khung dự án dựng sẵn",
    roles: ["Dev", "BrSE"],
    category: "Project",
    note: "Các đoạn code mẫu hoặc cấu trúc thư mục tiêu chuẩn được sao chép và tái sử dụng cho nhiều dự án mà không cần sửa đổi nhiều.",
    example: "新しいプロジェクト of ボイラープレートをセットアップします。"
  },
  {
    id: "legacy",
    english: "Legacy",
    japanese: "レガシー",
    vietnamese: "Hệ thống cũ / Mã nguồn di sản khó bảo trì",
    roles: ["Dev", "BrSE", "QA", "PM"],
    category: "Quality",
    note: "Code hoặc hệ thống cũ kỹ, thiếu unit test nhưng vẫn đang chạy và đóng vai trò quan trọng trong vận hành doanh nghiệp.",
    example: "レガシーコードの移行計画を策定します。"
  }
];
