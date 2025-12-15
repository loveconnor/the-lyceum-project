import { ChevronRight } from "lucide-react";

import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type Topic = {
  name: string;
  category?: string;
  confidence?: string;
  progress?: number; // percentage
  hours?: number; // hours studied
  count?: number;
};

export function TopicsCard({ topics = [] }: { topics?: Topic[] }) {
  const hasTopics = topics.length > 0;
  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>Top Topics</CardTitle>
        <CardAction className="-mt-2.5">
          <Button variant="outline" size="icon" aria-label="View all topics">
            <ChevronRight />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {hasTopics ? (
          <div className="space-y-4">
            {topics.map((topic, index) => (
              <li key={`${topic.name}-${index}`} className="flex items-center space-x-4">
                <span className="text-muted-foreground">{index + 1}.</span>
                <div className="flex-1">
                  <div className="font-medium">{topic.name}</div>
                  <div className="text-muted-foreground text-xs">
                    {topic.category || "General"} • {topic.confidence || "Unknown confidence"}
                  </div>
                </div>
                <Badge variant="outline">{Math.round(topic.progress ?? 0)}% progress</Badge>
              </li>
            ))}
          </div>
        ) : (
          <div className="text-muted-foreground text-sm">No topics yet. Complete an activity to see recommendations.</div>
        )}
      </CardContent>
    </Card>
  );
}
