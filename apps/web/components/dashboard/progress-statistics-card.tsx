import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
export function ProgressStatisticsCard({
  totalActivity = 0,
  inProgress = 0,
  completed = 0,
  labsCompleted,
  labsInProgress,
  pathsCompleted,
  pathsInProgress
}: {
  totalActivity?: number;
  inProgress?: number;
  completed?: number;
  labsCompleted?: number;
  labsInProgress?: number;
  pathsCompleted?: number;
  pathsInProgress?: number;
}) {
  // Use specific props if available, otherwise fall back to old props (which were mislabeled in UI)
  const displayLabs = labsCompleted ?? inProgress; 
  const displayPaths = pathsCompleted ?? completed;
  
  // Calculate specific totals if we have granular data, otherwise use passed total
  const calculatedTotal = (labsCompleted !== undefined && pathsCompleted !== undefined)
    ? (labsCompleted + (labsInProgress ?? 0) + pathsCompleted + (pathsInProgress ?? 0))
    : (inProgress + completed); /* Old fallback */

  // Percentages - simplified for visual balance
  const totalItems = calculatedTotal > 0 ? calculatedTotal : 1;
  const labsPercent = ((displayLabs) / totalItems) * 100;
  // If we have granular data, pathsPercent based on path count
  // If legacy, based on 'completed' count
  const pathsPercent = ((displayPaths) / totalItems) * 100;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Progress Statistics</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col space-y-6">
        <div className="space-y-4 text-center">
          <div className="text-muted-foreground text-sm">Total Labs & Paths</div>
          <div className="font-display text-3xl lg:text-4xl">
            {calculatedTotal}
          </div>
        </div>
        <div className="grid w-full gap-8 lg:grid-cols-2">
          <div className="flex items-center gap-2">
            <Progress value={labsPercent} indicatorColor="bg-orange-500" />
            <div className="text-muted-foreground text-sm">
              {Math.round(labsPercent)}%
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Progress value={pathsPercent} indicatorColor="bg-green-500" />
            <div className="text-muted-foreground text-sm">
              {Math.round(pathsPercent)}%
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-md border p-4">
            <div className="flex items-center gap-4">
              <span className="w-32 text-sm text-muted-foreground">Labs</span>
              <span className="text-2xl font-semibold">{displayLabs}</span>
            </div>
            {/* If using new data, show 'Completed', otherwise show 'In Progress' to match old bad logic? 
                Actually, user wants it fixed. So if we have labsCompleted, show 'Completed'.
                If we don't, we show 'In Progress' badge but it is confusing. 
                I will change it to 'Completed' if labsCompleted is provided. 
            */}
            <Badge className={`h-auto px-4 py-2 text-sm ${labsCompleted !== undefined ? "bg-green-500" : "bg-orange-500"}`}>
              {labsCompleted !== undefined ? "Completed" : "In Progress"}
            </Badge>
          </div>
          <div className="flex items-center justify-between rounded-md border p-4">
            <div className="flex items-center gap-4">
              <span className="w-32 text-sm text-muted-foreground">Learning Paths</span>
              <span className="text-2xl font-semibold">{displayPaths}</span>
            </div>
            <Badge className="h-auto bg-green-500 px-4 py-2 text-sm">Completed</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
