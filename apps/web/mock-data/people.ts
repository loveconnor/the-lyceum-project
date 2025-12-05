export type Person = {
  id: string
  name: string // Lab / Topic title
  jobTitle: string // Category
  status: "active" | "offline" | "away" // Progress state
  email: string // Confidence level
  phone: string // Time spent
  tags: string[] // Skills / attributes
  address: string // Reflection tag
  avatar: string
}

export const mockPeople: Person[] = [
  { id: "1", name: "Engineering Forces Lab", jobTitle: "Physics / Applied Math", status: "active", email: "82% confidence", phone: "48 mins", tags: ["Mechanics", "Visualization"], address: "Reflection: Strategy tweak", avatar: "https://api.dicebear.com/9.x/glass/svg?seed=forces" },
  { id: "2", name: "Bridge Stress Simulation", jobTitle: "Engineering", status: "offline", email: "68% confidence", phone: "36 mins", tags: ["Statics", "Modeling"], address: "Reflection: Time management", avatar: "https://api.dicebear.com/9.x/glass/svg?seed=bridge" },
  { id: "3", name: "Python Algorithm Lab", jobTitle: "Computer Science", status: "active", email: "74% confidence", phone: "55 mins", tags: ["Algorithms", "Debugging"], address: "Reflection: Strategy use", avatar: "https://api.dicebear.com/9.x/glass/svg?seed=python" },
  { id: "4", name: "Fluid Dynamics Practice", jobTitle: "Physics", status: "offline", email: "61% confidence", phone: "42 mins", tags: ["Fluids", "Modeling"], address: "Reflection: Concept link", avatar: "https://api.dicebear.com/9.x/glass/svg?seed=fluid" },
  { id: "5", name: "UI Accessibility Audit", jobTitle: "Design", status: "active", email: "79% confidence", phone: "30 mins", tags: ["UI/UX", "WCAG"], address: "Reflection: User empathy", avatar: "https://api.dicebear.com/9.x/glass/svg?seed=ui" },
  { id: "6", name: "Algebra Functions Drill", jobTitle: "Math", status: "active", email: "83% confidence", phone: "25 mins", tags: ["Functions", "Practice"], address: "Reflection: Error patterns", avatar: "https://api.dicebear.com/9.x/glass/svg?seed=algebra" },
  { id: "7", name: "Circuit Diagnostics", jobTitle: "Electrical Engineering", status: "away", email: "57% confidence", phone: "40 mins", tags: ["Circuits", "Troubleshoot"], address: "Reflection: Time box", avatar: "https://api.dicebear.com/9.x/glass/svg?seed=circuit" },
  { id: "8", name: "Data Viz Storytelling", jobTitle: "Data / Visualization", status: "away", email: "71% confidence", phone: "33 mins", tags: ["Charts", "Narrative"], address: "Reflection: Audience focus", avatar: "https://api.dicebear.com/9.x/glass/svg?seed=viz" },
  { id: "9", name: "Writing for Impact", jobTitle: "Writing", status: "active", email: "76% confidence", phone: "28 mins", tags: ["Clarity", "Structure"], address: "Reflection: Draft cadence", avatar: "https://api.dicebear.com/9.x/glass/svg?seed=writing" },
  { id: "10", name: "Logic Puzzles Set", jobTitle: "Logic", status: "active", email: "69% confidence", phone: "22 mins", tags: ["Reasoning", "Patterns"], address: "Reflection: Strategy tweak", avatar: "https://api.dicebear.com/9.x/glass/svg?seed=logic" },
  { id: "11", name: "Time Management Mini", jobTitle: "Habits", status: "offline", email: "64% confidence", phone: "18 mins", tags: ["Planning", "Pomodoro"], address: "Reflection: Schedule fit", avatar: "https://api.dicebear.com/9.x/glass/svg?seed=time" },
  { id: "12", name: "Statistical Thinking", jobTitle: "Math / Data", status: "away", email: "58% confidence", phone: "35 mins", tags: ["Stats", "Inference"], address: "Reflection: Concept gaps", avatar: "https://api.dicebear.com/9.x/glass/svg?seed=stats" },
  { id: "13", name: "3D Mechanics Sketches", jobTitle: "Engineering", status: "active", email: "72% confidence", phone: "31 mins", tags: ["Spatial", "Sketch"], address: "Reflection: Visual cues", avatar: "https://api.dicebear.com/9.x/glass/svg?seed=mechanics" },
  { id: "14", name: "API Integration Lab", jobTitle: "Software", status: "offline", email: "66% confidence", phone: "44 mins", tags: ["API", "Debugging"], address: "Reflection: Retry plan", avatar: "https://api.dicebear.com/9.x/glass/svg?seed=api" },
  { id: "15", name: "QA Automation Sprint", jobTitle: "Testing", status: "active", email: "78% confidence", phone: "29 mins", tags: ["QA", "Automation"], address: "Reflection: Edge cases", avatar: "https://api.dicebear.com/9.x/glass/svg?seed=qa" },
  { id: "16", name: "Backend Scaling Lab", jobTitle: "Systems", status: "away", email: "63% confidence", phone: "52 mins", tags: ["Scaling", "Perf"], address: "Reflection: Bottlenecks", avatar: "https://api.dicebear.com/9.x/glass/svg?seed=backend" },
  { id: "17", name: "Project Planning Board", jobTitle: "PM", status: "active", email: "81% confidence", phone: "26 mins", tags: ["Planning", "Agile"], address: "Reflection: Next steps", avatar: "https://api.dicebear.com/9.x/glass/svg?seed=pm" },
  { id: "18", name: "Cloud Cost Optimization", jobTitle: "Cloud", status: "offline", email: "55% confidence", phone: "34 mins", tags: ["Cloud", "FinOps"], address: "Reflection: Trade-offs", avatar: "https://api.dicebear.com/9.x/glass/svg?seed=cloud" },
  { id: "19", name: "Support Triage Simulation", jobTitle: "Support", status: "active", email: "77% confidence", phone: "24 mins", tags: ["CX", "De-escalation"], address: "Reflection: Response tone", avatar: "https://api.dicebear.com/9.x/glass/svg?seed=support" },
  { id: "20", name: "Growth Experiment Design", jobTitle: "Growth", status: "offline", email: "59% confidence", phone: "27 mins", tags: ["Growth", "Hypothesis"], address: "Reflection: Next test", avatar: "https://api.dicebear.com/9.x/glass/svg?seed=growth" },
]

