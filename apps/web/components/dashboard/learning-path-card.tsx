import { BookOpenCheck, GitBranch } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "./empty-state";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

type LearningPathItem = {
  title?: string;
  progress?: number;
  completed?: number;
  total?: number;
};

export function LearningPathCard({
  learningPath = [],
  progress = 0
}: {
  learningPath?: LearningPathItem[];
  progress?: number;
}) {
  const hasPath = learningPath.length > 0;
  const items = hasPath ? learningPath : [];

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Learning Path</CardTitle>
        <CardAction>
          <GitBranch className="text-muted-foreground size-4" />
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item, idx) => (
          <Link
            key={`${item.title}-${idx}`}
            href="#"
            className="hover:bg-muted block rounded-md border p-4 transition-colors">
            <div className="space-y-2">
              <div className="text-xl font-semibold">
                {item.title || "Learning path coming soon"}
              </div>
              <Progress value={item.progress ?? 0} indicatorColor="bg-green-600" />
              <p className="text-muted-foreground text-xs">
                {item.completed ?? 0} of {item.total ?? 0} modules completed
              </p>
            </div>
          </Link>
        ))}
        {!hasPath && (
          <EmptyState
            icon={BookOpenCheck}
            title="No learning path yet"
            description="Complete an activity to unlock your personalized path. Your steps will appear here.">
          </EmptyState>
        )}
      </CardContent>
    </Card>
  );
}
