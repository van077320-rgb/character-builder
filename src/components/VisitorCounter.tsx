import React, { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { subscribeVisitorCount, type VisitorCountState } from "../visitorService";

interface VisitorCounterProps {
  isDark: boolean;
}

export const VisitorCounter: React.FC<VisitorCounterProps> = ({ isDark }) => {
  const [state, setState] = useState<VisitorCountState>({ status: "loading" });

  useEffect(() => subscribeVisitorCount(setState), []);

  // Lỗi thì ẩn hẳn, không hiện một con số bịa như trước
  if (state.status === "error") return null;

  const count = state.status === "ready" ? state.count : null;

  if (count === null) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
        isDark 
          ? "bg-emerald-950/60 border-emerald-800/60 text-emerald-300" 
          : "bg-emerald-50/80 border-emerald-200/80 text-emerald-800"
      }`}>
        <Users className={`w-3.5 h-3.5 animate-pulse ${isDark ? "text-emerald-400" : "text-emerald-600"}`} />
        <span>Đang đếm lượt ghé thăm...</span>
      </div>
    );
  }

  return (
    <div
      title="Tổng số lượt khách ghé thăm thực tế được đồng bộ bởi Firebase Firestore"
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border shadow-2xs select-none ${
        isDark
          ? "bg-gradient-to-r from-emerald-950/80 to-teal-950/60 border-emerald-700/80 text-emerald-200"
          : "bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-300/90 text-emerald-900"
      }`}
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
      </span>
      <Users className={`w-3.5 h-3.5 ${isDark ? "text-emerald-400" : "text-emerald-600"}`} />
      <span>
        <strong className={`font-bold ${isDark ? "text-emerald-100" : "text-emerald-950"}`}>
          {count.toLocaleString("vi-VN")}
        </strong>{" "}
        lượt khách ghé thăm
      </span>
    </div>
  );
};
