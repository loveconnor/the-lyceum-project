import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
export function ProgressStatisticsCard({
  totalActivity = 0,
  inProgress = 0,
  completed = 0
}: {
  totalActivity?: number;
  inProgress?: number;
  completed?: number;
}) {
  // Calculate percentages for progress bars
  const total = inProgress + completed;
  const inProgressPercent = total > 0 ? (inProgress / total) * 100 : 0;
  const completedPercent = total > 0 ? (completed / total) * 100 : 0;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Progress Statistics</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col space-y-6">
        <div className="space-y-4 text-center">
          <div className="text-muted-foreground text-sm">Total Labs & Paths</div>
          <div className="font-display text-3xl lg:text-4xl">
            {total}
          </div>
        </div>
        <div className="grid w-full gap-8 lg:grid-cols-2">
          <div className="flex items-center gap-2">
            <Progress value={inProgressPercent} indicatorColor="bg-orange-500" />
            <div className="text-muted-foreground text-sm">
              {Math.round(inProgressPercent)}%
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Progress value={completedPercent} indicatorColor="bg-green-500" />
            <div className="text-muted-foreground text-sm">
              {Math.round(completedPercent)}%
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-md border p-4">
            <div className="flex items-center gap-4">
              <span className="w-32 text-sm text-muted-foreground">Labs</span>
              <span className="text-2xl font-semibold">{inProgress}</span>
            </div>
            <Badge className="h-auto bg-orange-500 px-4 py-2 text-sm">In Progress</Badge>
          </div>
          <div className="flex items-center justify-between rounded-md border p-4">
            <div className="flex items-center gap-4">
              <span className="w-32 text-sm text-muted-foreground">Learning Paths</span>
              <span className="text-2xl font-semibold">{completed}</span>
            </div>
            <Badge className="h-auto bg-green-500 px-4 py-2 text-sm">Completed</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
