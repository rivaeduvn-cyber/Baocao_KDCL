interface Stats {
  totalSessions: number;
  present: number;
  absent: number;
  late: number;
  leave: number;
}

export default function StatsCards({ stats }: { stats: Stats }) {
  const cards = [
    { label: "Tổng buổi", value: stats.totalSessions, color: "bg-blue-500" },
    { label: "Có mặt", value: stats.present, color: "bg-green-500" },
    { label: "Vắng", value: stats.absent, color: "bg-red-500" },
    { label: "Đi trễ", value: stats.late, color: "bg-yellow-500" },
    { label: "Nghỉ phép", value: stats.leave, color: "bg-purple-500" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="bg-white rounded-lg shadow p-4">
          <div className={`w-10 h-10 ${card.color} rounded-lg flex items-center justify-center text-white font-bold text-lg mb-2`}>
            {card.value}
          </div>
          <p className="text-sm text-gray-600">{card.label}</p>
        </div>
      ))}
    </div>
  );
}
