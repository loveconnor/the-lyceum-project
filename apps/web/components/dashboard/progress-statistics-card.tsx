import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CalendarCheck2Icon, CalendarClockIcon } from "lucide-react";
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
  return (
    <Card>
      <CardHeader>
        <CardTitle>Progress Statistics</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col space-y-6">
        <div className="space-y-4 text-center">
          <div>Total Activity</div>
          <div className="font-display text-3xl lg:text-4xl">
            {Math.round(totalActivity ?? 0)}%
          </div>
        </div>
        <div className="grid w-full gap-8 lg:grid-cols-2">
          <div className="flex items-center gap-2">
            <Progress value={inProgress} indicatorColor="bg-orange-500" />
            <div className="text-muted-foreground text-sm">
              {Math.round(inProgress ?? 0)}%
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Progress value={completed} indicatorColor="bg-green-500" />
            <div className="text-muted-foreground text-sm">
              {Math.round(completed ?? 0)}%
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-md border p-4">
            <div className="flex items-center gap-4">
              <div className="bg-primary flex size-10 items-center justify-center rounded-lg">
                <CalendarClockIcon className="text-primary-foreground size-4" />
              </div>
              <span className="text-2xl font-semibold">{Math.round(inProgress ?? 0)}</span>
            </div>
            <Badge className="h-auto bg-orange-500 px-4 py-2 text-sm">In Progress</Badge>
          </div>
          <div className="flex items-center justify-between rounded-md border p-4">
            <div className="flex items-center gap-4">
              <div className="bg-primary flex size-10 items-center justify-center rounded-lg">
                <CalendarCheck2Icon className="text-primary-foreground size-4" />
              </div>
              <span className="text-2xl font-semibold">{Math.round(completed ?? 0)}</span>
            </div>
            <Badge className="h-auto bg-green-500 px-4 py-2 text-sm">Completed</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
