import { ChevronRight } from "lucide-react";

import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Topic = {
  id: number;
  name: string;
  mastery: number; // percentage
  hours: number; // hours studied
};

export function TopicsCard() {
  const topTopics: Topic[] = [
    { id: 1, name: "Linear Algebra", mastery: 92, hours: 46 },
    { id: 2, name: "Python for Data", mastery: 88, hours: 53 },
    { id: 3, name: "Algorithms", mastery: 84, hours: 41 },
    { id: 4, name: "Probabilities", mastery: 81, hours: 38 }
  ];

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
        <div className="space-y-4">
          {topTopics.map((topic, index) => (
            <li key={topic.id} className="flex items-center space-x-4">
              <span className="text-muted-foreground">{index + 1}.</span>
              <div className="flex-1">
                <div className="font-medium">{topic.name}</div>
                <div className="text-muted-foreground text-xs">~{topic.hours} hrs studied</div>
              </div>
              <Badge variant="outline">{topic.mastery}% mastery</Badge>
            </li>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
