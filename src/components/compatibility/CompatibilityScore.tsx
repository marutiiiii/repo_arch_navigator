interface CompatibilityScoreProps {
  /** 0-100, optional. Empty/no-data when undefined. */
  value?: number;
  size?: number;
}

export const CompatibilityScore = ({ value, size = 160 }: CompatibilityScoreProps) => {
  const radius = (size - 18) / 2;
  const circumference = 2 * Math.PI * radius;
  const hasValue = typeof value === "number";
  const offset = hasValue ? circumference - (value! / 100) * circumference : circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <defs>
            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--primary))" />
              <stop offset="100%" stopColor="hsl(var(--primary-glow))" />
            </linearGradient>
          </defs>
          <circle cx={size / 2} cy={size / 2} r={radius} stroke="hsl(var(--muted))" strokeWidth="10" fill="none" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="url(#scoreGradient)"
            strokeWidth="10"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-foreground">{hasValue ? value : "—"}</span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Score</span>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        {hasValue ? "Overall compatibility" : "No analysis yet"}
      </p>
    </div>
  );
};
