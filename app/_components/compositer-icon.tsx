import { cn } from "@/lib/utils";

/** Bright bold star — Compositer mark */
export function CompositerIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn(
        "fill-white drop-shadow-[0_0_10px_rgba(255,255,255,0.65)]",
        className,
      )}
      aria-hidden="true"
    >
      <path d="M12 1.25l2.95 6.45 7.05 1.02-5.1 4.68 1.5 6.95L12 16.9l-6.4 3.4 1.5-6.95-5.1-4.68 7.05-1.02L12 1.25z" />
    </svg>
  );
}
