import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  
  let styles = "bg-slate-100 text-slate-600 border-slate-200";
  
  if (["active", "completed", "success", "created"].includes(normalized)) {
    styles = "bg-green-50 text-green-700 border-green-200";
  } else if (["failed", "error", "cancelled"].includes(normalized)) {
    styles = "bg-red-50 text-red-700 border-red-200";
  } else if (["pending", "queued", "processing", "in-progress"].includes(normalized)) {
    styles = "bg-amber-50 text-amber-700 border-amber-200";
  }

  return (
    <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize", styles)}>
      {status}
    </span>
  );
}
