import { generateMeta } from "@/lib/utils";

import {
  WelcomeCard,
  TopicsCard,
  LearningPathCard,
  ChartMostActivity,
  ProgressStatisticsCard,
  StudentSuccessCard,
  CourseProgressByMonth,
  RecommendedCoursesTable
} from "@/components/dashboard";

export async function generateMetadata() {
  return generateMeta({
    title: "The Lyceum Project",
    description:
      "The Lyceum Project is an AI-powered learning platform designed to bring personalized, interactive education to everyone.",
    canonical: "/"
  });
}

export default function Page() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-12 xl:col-span-6">
          <WelcomeCard />
        </div>
        <div className="lg:col-span-6 xl:col-span-3">
          <LearningPathCard />
        </div>
        <div className="lg:col-span-6 xl:col-span-3">
          <TopicsCard />
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <StudentSuccessCard
          currentSuccessRate={88}
          previousSuccessRate={85}
          totalStudents={1500}
          passingStudents={1320}
        />
        <ProgressStatisticsCard />
        <ChartMostActivity />
      </div>
      <div className="mt-4 gap-4 space-y-4 xl:grid xl:grid-cols-2 xl:space-y-0">
        <CourseProgressByMonth />
        <RecommendedCoursesTable />
      </div>
    </div>
  );
}
