export type Document = {
  id: string;
  name: string;
  confidenceDelta: string;
  author: string;
  authorAvatar: string;
  uploadedAt: string;
  icon: string;
};

export const mockDocuments: Document[] = [
  {
    id: "1",
    name: "Reflection • Bridge Stress Lab",
    confidenceDelta: "+6%",
    author: "You",
    authorAvatar: "https://api.dicebear.com/9.x/glass/svg?seed=you",
    uploadedAt: "Today",
    icon: "reflection",
  },
  {
    id: "2",
    name: "Lab Session • Python Algorithm Lab",
    confidenceDelta: "+3%",
    author: "You",
    authorAvatar: "https://api.dicebear.com/9.x/glass/svg?seed=python",
    uploadedAt: "Yesterday",
    icon: "lab",
  },
  {
    id: "3",
    name: "Goal Update • Master Algebra Functions",
    confidenceDelta: "+2%",
    author: "You",
    authorAvatar: "https://api.dicebear.com/9.x/glass/svg?seed=algebra",
    uploadedAt: "2 Days Ago",
    icon: "goal",
  },
  {
    id: "4",
    name: "AI Insight • Schedule shorter sessions",
    confidenceDelta: "Tip",
    author: "AI Coach",
    authorAvatar: "https://api.dicebear.com/9.x/glass/svg?seed=aicoach",
    uploadedAt: "4 Days Ago",
    icon: "insight",
  },
  {
    id: "5",
    name: "Path Progress • Applied Forces unlocked",
    confidenceDelta: "+8%",
    author: "Pathway",
    authorAvatar: "https://api.dicebear.com/9.x/glass/svg?seed=path",
    uploadedAt: "A Week Ago",
    icon: "path",
  },
  {
    id: "6",
    name: "Reflection • Energy Transfer Lab",
    confidenceDelta: "+4%",
    author: "You",
    authorAvatar: "https://api.dicebear.com/9.x/glass/svg?seed=energy",
    uploadedAt: "2 Weeks Ago",
    icon: "reflection",
  },
  {
    id: "7",
    name: "Lab Session • Circuit Diagnostics",
    confidenceDelta: "+5%",
    author: "You",
    authorAvatar: "https://api.dicebear.com/9.x/glass/svg?seed=circuit",
    uploadedAt: "3 Weeks Ago",
    icon: "lab",
  },
  {
    id: "8",
    name: "Goal Update • Strengthen Time Management",
    confidenceDelta: "+1%",
    author: "You",
    authorAvatar: "https://api.dicebear.com/9.x/glass/svg?seed=time",
    uploadedAt: "1 Month Ago",
    icon: "goal",
  },
  {
    id: "9",
    name: "AI Insight • Reflection lagging after long sessions",
    confidenceDelta: "Tip",
    author: "AI Coach",
    authorAvatar: "https://api.dicebear.com/9.x/glass/svg?seed=coach",
    uploadedAt: "1 Month Ago",
    icon: "insight",
  },
  {
    id: "10",
    name: "Path Progress • Visualization Skill",
    confidenceDelta: "+7%",
    author: "Pathway",
    authorAvatar: "https://api.dicebear.com/9.x/glass/svg?seed=viz",
    uploadedAt: "2 Months Ago",
    icon: "path",
  },
  {
    id: "11",
    name: "Reflection • Fluid Dynamics Lab",
    confidenceDelta: "+5%",
    author: "You",
    authorAvatar: "https://api.dicebear.com/9.x/glass/svg?seed=fluid",
    uploadedAt: "2 Months Ago",
    icon: "reflection",
  },
  {
    id: "12",
    name: "Lab Session • UI Accessibility Audit",
    confidenceDelta: "+2%",
    author: "You",
    authorAvatar: "https://api.dicebear.com/9.x/glass/svg?seed=ui",
    uploadedAt: "3 Months Ago",
    icon: "lab",
  },
];
  