import { ChevronRight, GitBranch } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function LearningPathCard() {
  const pathProgress = 40;
  const totalModules = 10;
  const completedModules = 4;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Learning Path</CardTitle>
        <CardAction>
          <GitBranch className="text-muted-foreground size-4" />
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        <Link href="#" className="hover:bg-muted block rounded-md border p-4 transition-colors">
          <div className="space-y-2">
            <div className="text-xl font-semibold">Full-Stack Developer</div>
            <Progress value={pathProgress} indicatorColor="bg-green-600" />
            <p className="text-muted-foreground text-xs">
              {completedModules} of {totalModules} modules completed
            </p>
          </div>
        </Link>
        <Link
          href="#"
          className="hover:bg-muted block space-y-4 rounded-md border p-4 transition-colors">
          <div className="space-y-2">
            <div className="text-xl font-semibold">Full-Stack Developer</div>
            <Progress value={pathProgress} indicatorColor="bg-orange-600" />
            <p className="text-muted-foreground text-xs">
              {completedModules} of {totalModules} modules completed
            </p>
          </div>
        </Link>
      </CardContent>
    </Card>
  );
}