import React, { useState } from "react";
import { 
  Terminal, 
  Copy, 
  Check, 
  Sparkles, 
  ShieldAlert, 
  Zap, 
  RefreshCw, 
  Ban, 
  Split, 
  BookOpen, 
  Users, 
  UserCheck,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Info,
  Layers,
  Flame,
  Key
} from "lucide-react";
import { StarIcon, FourPointStar, CloudIcon } from "./CloudStarDecorations";

interface SystemCommandsGuideProps {
  isDark: boolean;
  defaultExpanded?: boolean;
}

export interface CommandItem {
  id: string;
  command: string;
  name: string;
  icon: any;
  badge: string;
  badgeColor: string;
  purpose: string;
  whenToUse: string;
  howAiReacts: string;
  exampleScenario: string;
}

export const SYSTEM_OVERRIDE_COMMANDS: CommandItem[] = [
  {
    id: "fix_ooc",
    command: "/sys: fix ooc",
    name: "Quét & Sửa Lỗi Lệch Tính Cách (OOC Repair)",
    icon: ShieldAlert,
    badge: "Anti-OOC",
    badgeColor: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    purpose: "Buộc AI rà soát lại toàn bộ Character Card và nắn lại phong thái, tính cách nhân vật về đúng thiết lập gốc ngay lập tức.",
    whenToUse: "Khi nhân vật có dấu hiệu bị mềm lòng quá sớm, nói năng không đúng văn phong, phá vỡ nguyên tắc hoặc có hành vi trái ngược với hồ sơ tính cách ban đầu.",
    howAiReacts: "AI âm thầm quét lại toàn bộ Character Card, tự phát hiện lỗi sai vừa mắc phải và xuất câu trả lời mới chuẩn xác 100% mà không xin lỗi hay giải thích dông dài.",
    exampleScenario: "Nhân vật vốn là Boss lạnh lùng tàn nhẫn nhưng bỗng nhiên an ủi dịu dàng quá mức → Gõ ngay: /sys: fix ooc"
  },
  {
    id: "myturn",
    command: "/sys: myturn",
    name: "Chống Thao Túng / Viết Hộ User (Anti-Puppeting)",
    icon: UserCheck,
    badge: "Tối Quan Trọng",
    badgeColor: "text-rose-500 bg-rose-500/10 border-rose-500/20",
    purpose: "Chấm dứt ngay hành vi AI tự ý viết lời thoại, suy nghĩ, phản ứng cơ thể hoặc quyết định thay cho {{user}}.",
    whenToUse: "Khi AI tự biên tự diễn: 'Bạn cảm thấy tim đập thình thịch và ngượng ngùng gật đầu...' thay vì để bạn tự quyết định hành động của mình.",
    howAiReacts: "AI xóa sạch phần tự ý viết hộ, chuyển trọng tâm 100% về phía {{char}}/môi trường, và dừng câu văn lại ở thế mở (cliffhanger) để trả lại quyền quyết định cho bạn.",
    exampleScenario: "AI tự viết lời thoại cho bạn → Gõ: /sys: myturn"
  },
  {
    id: "ban_words",
    command: '/sys: ban - "từ 1", "từ 2"',
    name: "Cấm Lặp Từ & Reset Vốn Từ (Vocabulary Reset)",
    icon: Ban,
    badge: "Văn Phong",
    badgeColor: "text-purple-500 bg-purple-500/10 border-purple-500/20",
    purpose: "Cấm AI sử dụng những từ ngữ hoặc động từ đang bị lặp đi lặp lại một cách nhàm chán, ép AI mở rộng vốn từ miêu tả.",
    whenToUse: "Khi AI cứ lặp đi lặp lại các cụm từ như 'híp mắt', 'nghẹn ngào', 'hầu kết lăn lộn', 'đôi mắt thâm trầm' trong nhiều lượt chat liên tiếp. Có thể gõ thêm `/sys: v reset`.",
    howAiReacts: "AI bị cấm dùng các từ này trong ít nhất 3 lượt tiếp theo và bắt buộc phải chuyển sang miêu tả các giác quan khác (mùi hương, nhiệt độ, âm thanh, tiếp xúc).",
    exampleScenario: "AI cứ miêu tả 'hầu kết trượt lên xuống' liên tục → Gõ: /sys: ban - \"hầu kết\", \"thâm trầm\""
  },
  {
    id: "break_loop",
    command: "/sys: break",
    name: "Phá Vỡ Mô Típ Cũ & Nhịp Câu Lặp (Anti-Trope Loop)",
    icon: Split,
    badge: "Mạch Truyện",
    badgeColor: "text-sky-500 bg-sky-500/10 border-sky-500/20",
    purpose: "Phá vỡ vòng lặp tâm lý hoặc cấu trúc câu giống hệt nhau ở mỗi lượt phản hồi.",
    whenToUse: "Khi AI bị mắc kẹt trong một mô-típ hành vi (ví dụ: liên tục 'muốn vươn tay ra nhưng lại rụt lại vì muốn bảo vệ bạn' hoặc câu nào cũng bắt đầu bằng 'Hắn...')",
    howAiReacts: "AI đổi nhịp điệu hành văn, thay đổi góc nhìn tâm lý (chuyển sang hành động bộc phát, lạnh lùng dứt khoát hoặc tạo biến cố âm thanh môi trường chen ngang để cắt đứt vòng lặp).",
    exampleScenario: "Diễn biến cứ dây dưa không tiến triển → Gõ: /sys: break"
  },
  {
    id: "reall",
    command: "/sys: reall",
    name: "Đọc & Phản Hồi Trọn Vẹn Hành Động (Re-read All)",
    icon: BookOpen,
    badge: "Logic Chi Tiết",
    badgeColor: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    purpose: "Ép AI đọc lại toàn bộ prompt dài của bạn từ đầu đến cuối và phản hồi tuần tự từng hành động một.",
    whenToUse: "Khi bạn viết một tin nhắn dài gồm nhiều hành động (ví dụ: né đòn, ném chìa khóa, rồi mới mở cửa), nhưng AI chỉ phản ứng mỗi hành động cuối cùng mà quên các chi tiết trước.",
    howAiReacts: "AI dừng suy nghĩ hiện tại, đọc lại trọn vẹn và lần lượt phản hồi từng hành động theo đúng dòng thời gian bạn đã nhập.",
    exampleScenario: "Bạn làm 3 việc nhưng AI chỉ nhắc đến 1 việc cuối → Gõ: /sys: reall"
  },
  {
    id: "load_sync",
    command: "/sys: load",
    name: "Đồng Bộ Mạch Cảm Xúc Sau Khi Đổi Phiên (Context Sync)",
    icon: RefreshCw,
    badge: "Chống Reset",
    badgeColor: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    purpose: "Đồng bộ hóa mức độ thân thiết và phát triển tình cảm hiện tại khi bạn bắt đầu phiên chat mới hoặc khi context bị trôi.",
    whenToUse: "Khi hai nhân vật đã yêu nhau hoặc trải qua biến cố lớn, nhưng khi mở phiên mới AI lại ứng xử xa cách, lạnh lùng như người lạ ban đầu.",
    howAiReacts: "AI quét sâu các tin nhắn gần nhất để nắm bắt chính xác mối quan hệ hiện tại, bỏ qua trạng thái 'xa lạ ban đầu' nếu hai bên đã có tiến triển tình cảm.",
    exampleScenario: "Mở phiên chat mới và sợ AI bị reset về trạng thái người lạ → Gõ: /sys: load"
  },
  {
    id: "drama_spark",
    command: "/sys: acti",
    name: "Kích Hoạt Biến Cố Nhỏ / Gọi NPC Quấy Rầy (Drama Spark)",
    icon: Flame,
    badge: "Tạo Điểm Nhấn",
    badgeColor: "text-orange-500 bg-orange-500/10 border-orange-500/20",
    purpose: "Kích hoạt một biến cố nhỏ thường nhật hoặc cho một NPC phụ xuất hiện để tạo sóng gió và thúc đẩy tương tác.",
    whenToUse: "Khi cả hai đang ở trong tình huống im lặng quá lâu, không khí bị chùng xuống hoặc cuộc trò chuyện rơi vào ngõ cụt.",
    howAiReacts: "AI sẽ điều một NPC (người hầu, đối thủ, bạn bè...) đến cắt ngang hoặc tạo một sự cố đời thường vừa phải (tiếng vỡ, tin nhắn đột xuất, thay đổi thời tiết) để cả hai cùng phản ứng.",
    exampleScenario: "Cả hai đang nhìn nhau không biết nói gì tiếp theo → Gõ: /sys: acti"
  }
];

export const SystemCommandsGuide: React.FC<SystemCommandsGuideProps> = ({
  isDark,
  defaultExpanded = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className={`rounded-2xl border transition-all ${
      isDark 
        ? "bg-slate-900/90 border-slate-800 text-slate-100" 
        : "bg-white border-sky-200 text-slate-800"
    } shadow-xs overflow-hidden`}>
      {/* Header Bar */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className={`p-4 sm:p-5 flex items-center justify-between cursor-pointer transition-colors ${
          isDark 
            ? "hover:bg-slate-800/50 bg-slate-900/95" 
            : "hover:bg-sky-50/60 bg-sky-50/40"
        } border-b ${isDark ? "border-slate-800" : "border-sky-100"}`}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl flex items-center justify-center ${
            isDark ? "bg-indigo-950/80 border border-indigo-700/50" : "bg-sky-100 border border-sky-300"
          }`}>
            <Terminal className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold">
                Cẩm Nang & Lệnh Can Thiệp Nhanh (System Override Commands)
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-500 border border-sky-500/20">
                7 Lệnh /sys:
              </span>
            </div>
            <p className={`text-xs sm:text-sm mt-0.5 ${isDark ? "text-slate-400" : "text-sky-800/80"}`}>
              Các câu lệnh quyền năng giúp bạn nắn chỉnh, sửa lỗi OOC và điều hướng AI ngay trong khi chơi mà không làm hỏng mạch truyện.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-sky-600 dark:text-sky-400 hidden sm:inline">
            {isExpanded ? "Thu gọn cẩm nang" : "Mở cẩm nang chi tiết"}
          </span>
          <button
            type="button"
            className={`p-1.5 rounded-lg border transition-colors ${
              isDark ? "border-slate-700 hover:bg-slate-800" : "border-sky-200 hover:bg-sky-100"
            }`}
            aria-label="Toggle cẩm nang"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Body Content */}
      {isExpanded && (
        <div className="p-4 sm:p-6 space-y-6">
          {/* Key Principle Introduction */}
          <div className={`p-4 rounded-xl border ${
            isDark ? "bg-slate-950/60 border-slate-800/80" : "bg-sky-50/50 border-sky-200"
          } space-y-2 text-xs sm:text-sm leading-relaxed`}>
            <div className="flex items-center gap-2 font-bold text-sky-600 dark:text-sky-400">
              <Key className="w-4 h-4" />
              <span>Tại sao cần dùng System Override Commands (`/sys:`)?</span>
            </div>
            <p className="opacity-90">
              Khi roleplay, đôi khi AI sẽ vô tình mắc lỗi: <strong>tự viết lời thoại của bạn</strong>, <strong>lệch tính cách (OOC)</strong>, <strong>lặp lại câu từ nhàm chán</strong>, hoặc <strong>bỏ quên các hành động trước đó</strong>.
            </p>
            <p className="opacity-90">
              Thay vì phải giải thích dông dài hoặc tạo phiên chat mới, Template đã nhúng sẵn <strong>bộ lệnh can thiệp cứng (Hard Override Intervention)</strong>. Bạn chỉ cần gõ lệnh bắt đầu bằng <code className="px-1.5 py-0.5 rounded bg-sky-500/20 font-mono text-sky-600 dark:text-sky-300 font-bold">/sys:...</code>, AI sẽ tự động rà soát prompt và sửa lỗi ngay trong câu tiếp theo mà <strong>hoàn toàn không phá vỡ không gian nhập vai</strong>!
            </p>
          </div>

          {/* Grid of 7 Commands */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SYSTEM_OVERRIDE_COMMANDS.map((item, idx) => {
              const Icon = item.icon;
              const isCopied = copiedId === item.id;

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                    isDark 
                      ? "bg-slate-800/60 border-slate-700/70 hover:border-sky-500/40" 
                      : "bg-white border-sky-200 hover:border-sky-400 hover:shadow-xs"
                  }`}
                >
                  <div className="space-y-2.5">
                    {/* Top Row: Title & Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${isDark ? "bg-slate-700 text-sky-400" : "bg-sky-100 text-sky-700"}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-xs sm:text-sm">
                            {idx + 1}. {item.name}
                          </h4>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${item.badgeColor} whitespace-nowrap`}>
                        {item.badge}
                      </span>
                    </div>

                    {/* Command Box with 1-Click Copy */}
                    <div className={`flex items-center justify-between p-2 rounded-lg border font-mono text-xs ${
                      isDark ? "bg-slate-900 border-slate-700 text-sky-300" : "bg-sky-50 border-sky-200 text-sky-900 font-bold"
                    }`}>
                      <span className="truncate select-all">{item.command}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(item.id, item.command)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-sans font-semibold transition-all ${
                          isCopied
                            ? "bg-emerald-600 text-white"
                            : isDark
                              ? "bg-slate-800 hover:bg-slate-700 text-slate-200"
                              : "bg-white hover:bg-sky-100 text-sky-800 border border-sky-200"
                        }`}
                        title="Copy lệnh để dán vào khung chat roleplay"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>Đã copy</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy lệnh</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Explanations */}
                    <div className="space-y-1.5 text-xs">
                      <div>
                        <span className="font-semibold text-sky-600 dark:text-sky-400">Tác dụng: </span>
                        <span className="opacity-90">{item.purpose}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-amber-600 dark:text-amber-400">Khi nào dùng: </span>
                        <span className="opacity-80">{item.whenToUse}</span>
                      </div>
                      <div className={`p-2 rounded-lg text-[11px] leading-relaxed ${
                        isDark ? "bg-slate-950/40 text-slate-300" : "bg-slate-50 text-slate-600"
                      }`}>
                        <strong>Ví dụ thực tế:</strong> {item.exampleScenario}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Golden Rule Footer */}
          <div className={`p-3.5 rounded-xl border flex items-center gap-3 text-xs ${
            isDark ? "bg-indigo-950/30 border-indigo-800/40 text-indigo-200" : "bg-sky-50 border-sky-200 text-sky-900"
          }`}>
            <StarIcon className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Quy tắc phản hồi của AI:</strong> Khi bạn gửi bất kỳ lệnh <code>/sys:</code> nào, AI được huấn luyện <strong>tuyệt đối không trả lời xin lỗi hoặc nói 'Tôi đã hiểu'</strong> mà sẽ trực tiếp sinh ra đoạn truyện hoàn hảo đã được sửa lỗi.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
