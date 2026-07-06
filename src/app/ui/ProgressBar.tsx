type Props = {
  value: number;
  target?: number | null;
};

export function ProgressBar({ value, target }: Props) {
  const pct = target && target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 rounded-full bg-neutral-200 dark:bg-neutral-800">
        <div
          className="h-2 rounded-full bg-neutral-900 dark:bg-neutral-100 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-12 text-right text-sm tabular-nums text-neutral-600 dark:text-neutral-400">
        {pct}%
      </span>
    </div>
  );
}
