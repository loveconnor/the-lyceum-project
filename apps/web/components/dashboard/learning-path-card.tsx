import { BookOpenCheck, GitBranch } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "./empty-state";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { FIRST_WEEK_LOOP_NOTE } from "./first-week-copy";

type LearningPathItem = {
  id?: string;
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
        <CardTitle>Learning Paths</CardTitle>
        <CardAction>
          <GitBranch className="text-muted-foreground size-4" />
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasPath && (
          <div className="max-h-[12rem] space-y-4 overflow-y-auto pr-1 sm:max-h-[14rem] xl:max-h-[16rem]">
            {items.map((item, idx) => (
              <Link
                key={item.id || `${item.title}-${idx}`}
                href={item.id ? `/paths/${item.id}` : "#"}
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
          </div>
        )}
        {!hasPath && (
          <EmptyState
            icon={BookOpenCheck}
            title="No learning path yet"
            description="Complete an activity to unlock your personalized path. Your steps will appear here."
            note={FIRST_WEEK_LOOP_NOTE}>
          </EmptyState>
        )}
      </CardContent>
    </Card>
  );
}
