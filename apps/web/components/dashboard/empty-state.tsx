import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  note?: string;
  actionLabel?: string;
  actionIcon?: LucideIcon;
  onAction?: () => void;
  className?: string;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  note,
  actionLabel,
  actionIcon: ActionIcon,
  onAction,
  className
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        "mx-auto max-w-md py-8",
        className
      )}>
      <Icon className="text-muted-foreground mx-auto h-16 w-16" />
      <h2 className="mt-6 text-xl font-semibold">{title}</h2>
      <p className="text-muted-foreground mt-2 text-sm">{description}</p>
      {note && <p className="text-muted-foreground mt-3 text-xs">{note}</p>}
      {actionLabel && (
        <div className="mt-6">
          <Button onClick={onAction}>
            {ActionIcon && <ActionIcon className="mr-2 h-4 w-4" />}
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
