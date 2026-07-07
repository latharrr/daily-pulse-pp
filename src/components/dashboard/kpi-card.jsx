export function KpiCard({ label, value, color }) {
  const colorClass = {
    green: 'text-green-500',
    red: 'text-red-500',
    yellow: 'text-yellow-500',
  }[color] || 'text-zinc-50';

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
      <p className={`text-2xl font-semibold ${colorClass}`}>{value}</p>
      <p className="text-xs text-zinc-500 uppercase tracking-wider mt-1">{label}</p>
    </div>
  );
}
