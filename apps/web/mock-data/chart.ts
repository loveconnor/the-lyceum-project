export type ChartDataPoint = {
  week: string;
  learningHours: number;
  reflections: number;
};

export const mockChartData: ChartDataPoint[] = [
  { week: "Week 1", learningHours: 8, reflections: 5 },
  { week: "Week 2", learningHours: 10, reflections: 6 },
  { week: "Week 3", learningHours: 7, reflections: 4 },
  { week: "Week 4", learningHours: 12, reflections: 8 },
  { week: "Week 5", learningHours: 9, reflections: 5 },
  { week: "Week 6", learningHours: 11, reflections: 7 },
];
  