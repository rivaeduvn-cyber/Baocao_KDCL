import { Calendar, CheckCircle, XCircle, AlertTriangle, Coffee } from "lucide-react";

interface Stats {
  totalSessions: number;
  present: number;
  absent: number;
  late: number;
  leave: number;
}

export default function StatsCards({ stats }: { stats: Stats }) {
  const cards = [
    { label: "Tổng buổi", value: stats.totalSessions, icon: Calendar, color: "from-blue-500 to-blue-600", bg: "bg-blue-50 dark:bg-blue-950" },
    { label: "Có mặt", value: stats.present, icon: CheckCircle, color: "from-green-500 to-green-600", bg: "bg-green-50 dark:bg-green-950" },
    { label: "Vắng", value: stats.absent, icon: XCircle, color: "from-red-500 to-red-600", bg: "bg-red-50 dark:bg-red-950" },
    { label: "Đi trễ", value: stats.late, icon: AlertTriangle, color: "from-yellow-500 to-yellow-600", bg: "bg-yellow-50 dark:bg-yellow-950" },
    { label: "Nghỉ phép", value: stats.leave, icon: Coffee, color: "from-purple-500 to-purple-600", bg: "bg-purple-50 dark:bg-purple-950" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className={`${card.bg} rounded-xl p-4 border border-gray-200/50 dark:border-gray-800 transition-all hover:shadow-md`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center shadow-sm`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                {card.value}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">{card.label}</p>
          </div>
        );
      })}
    </div>
  );
}
