import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface AIConstraintNoticeProps {
  constraint: string;
  title?: string;
  className?: string;
}

export function AIConstraintNotice({
  constraint,
  title = "Constraint",
  className
}: AIConstraintNoticeProps) {
  if (!constraint) return null;

  return (
    <Alert className={cn("border-muted/70 bg-muted/30", className)}>
      <Info className="text-muted-foreground" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{constraint}</AlertDescription>
    </Alert>
  );
}
