# The Lyceum Project - Product Spec

This document is a simple, detailed overview of the Lyceum app. It is meant for AI agents and builders who need a clear picture of what exists today and where new features could fit.

**What this app is**
The Lyceum Project is an AI powered learning platform that creates personalized learning paths, hands-on labs, and tutoring-style assistance. The core idea is to help a learner move from interest to mastery with a mix of structured content, practice, and reflection.

**Primary goals**
- Personalize learning paths based on a learner's interests and starting level.
- Make learning active with labs, exercises, and interactive widgets.
- Provide an AI assistant for help, explanations, and guidance.
- Track progress and show what to do next.

**Who it is for**
- Self-directed learners who want a guided path.
- Students who want tutoring and practice without a fixed course schedule.
- People who want to learn skills in math, programming, science, writing, and related topics.

**Core value offer**
- A custom learning path generated per learner.
- Step-by-step labs that save progress and support multiple learning styles.
- A reflection system that helps learners capture what worked and what did not.
- A dashboard that highlights progress, momentum, and recommended topics.

**Apps in the repo**
- `apps/web`: Main application (dashboard, paths, labs, reflections, settings, assistant).
- `apps/landing`: Marketing + waitlist site.
- `apps/backend`: API + AI services (path generation, labs, assistant, dashboard, notifications).

---

**Main user journey**
1. Sign up or log in.
2. Complete onboarding (interests and starting level).
3. Receive an AI generated learning path recommendation.
4. Start a learning path and work through modules and labs.
5. Use the AI assistant when stuck.
6. Capture reflections after learning or labs.
7. Review progress and recommendations on the dashboard.

---

**Main product areas (apps/web)**

**1) Dashboard**
- Welcome card and quick status overview.
- Getting Started Plan checklist with a hide option after completion.
- Learning path progress card.
- Top topics card when there is enough data.
- Success and activity analytics (success rate, in-progress vs completed, activity charts).
- Monthly activity time series (when data exists).
- Recommended courses table based on interests and activity.

**2) Learning Paths**
- List of learning paths with tabs by status.
- Filters: difficulty, estimated duration, core-only, search.
- View modes: grid or list.
- Create or edit a path (dialog sheet).
- Path detail view shows modules, overall progress, difficulty, duration, and locked sequencing.
- Paths are stored in Supabase with learning path items as modules.

**3) Modules inside a Path**
- Each module card shows status and progress.
- Modules can be "learn-by-doing" and track step progress.
- Modules can include counts of labs, readings, slides, audio, or mindmaps.
- Locking logic prevents skipping ahead of the first incomplete module.

**4) Labs**
- Lab list with tabs by status.
- Filters: difficulty, lab type, estimated time, core-only, search.
- View modes: grid or list.
- Create or edit labs in a sheet.
- Lab detail viewer that renders different lab templates.
- Lab progress is saved per step and includes comments.

**5) Lab Templates**
These are the lab experiences rendered in the lab viewer.
- Analyze
- Build
- Derive
- Explain
- Explore
- Revise

**6) AI Assistant**
- Chat interface with rich markdown rendering.
- File attachment support and message copy actions.
- Support for illustrative visuals (image previews + modal expand).
- Conversation list with search, rename, and delete.
- Multiple conversations stored via backend.

**7) Reflections**
- Reflections dashboard with grid or list view.
- Filter by reflection type and search by title or path name.
- Reflection editor is structured into three prompts:
  - What I tried
  - What worked or failed
  - What I would do differently

**8) Settings**
- Account: avatar, name, email, date of birth, language.
- Appearance: font, theme preset, scale, radius, color mode, layout, sidebar mode.
- Display: choose which sidebar items appear.
- Interests: large list of topics and subtopics.
- Notifications: learning reminders, path milestones, lab milestones, email on/off.
- Billing: mock UI for plan, payment method, and transaction history.

**9) Auth and Onboarding**
- Email/password login and sign up.
- Optional OAuth (Google, GitHub) behind env flags.
- Onboarding steps:
  - Interest selection across many topic categories.
  - Starting level (new, familiar, comfortable) with skip option.
  - AI recommendation step that creates a learning path.

**10) Waitlist**
- Dedicated waitlist page in `apps/web` (currently simulated submit).
- Marketing waitlist in `apps/landing` that posts to backend.

---

**Widgets and building blocks**
This is a key area for feature ideas. The app already has a large widget library for learning content.

**Learning widgets (components/learning)**
- Multiple choice, true/false, short answer, fill in the blank, matching, order steps, drag and drop.
- Code fill, code block, code editor.
- Numeric input, rating, checkbox, radio, select, switch, textarea, input.
- Charts: line graph, bar graph, d3 chart, chart widget.
- Diagrams: React Flow widget, diagram selection.
- Math: equation builder.
- Layout and content: stack, grid, card, divider, heading, text, image, markdown.

**Widgets (components/widgets)**
- Code editor widget.
- Multiple choice widget.
- Derivation steps widget.
- Status tabs widget (used for paths/labs filtering).
- Chart widgets (2D, 3D, D3).
- React Flow widget.
- Editor widget and Plate editor kits for rich content.

**Exercises (components/exercises)**
- Multiple choice.
- Short answer.
- Code editor.

**Editor system (Plate)**
- Used for reflections and rich text content.
- Custom nodes for code, equations, media, tables, mentions, and more.

---

**Data model (high level)**
- User profile and settings (stored in Supabase).
- LearningPath
- PathItem / Module
- Lab
- LabProgress
- Reflection
- Notifications

**Key statuses**
- Labs: `not-started`, `in-progress`, `completed`.
- Paths and modules: same status set.
- Difficulty: `intro`, `intermediate`, `advanced` (paths) and `beginner`, `intermediate`, `advanced` (labs).

---

**Completion & mastery semantics**
These rules define what "completed" and "mastered" mean across labs, modules, and paths. Completion is a progress signal. Mastery is an evidence-based learning signal. They are intentionally not the same.

**Definitions (global)**
- Completion: All required steps are done and required checks are attempted. Completion can happen without understanding.
- Mastery: Completion plus evidence of understanding. Mastery never auto-follows completion unless explicit criteria are met.
- Reflection: Optional by default. Only required when an item is flagged `requiresReflection`.
- Status remains `not-started` → `in-progress` → `completed`. Mastery is a separate signal (badge/field), not a replacement status.

**Completion rules**
- Lab completed: All required steps complete and any required checks attempted. Optional steps do not block.
- Module completed: All required labs/content items completed. Optional items do not block.
- Path completed: All required modules completed.

**Mastery rules**
- Lab mastered: Lab completed plus a mastery signal (e.g., assessment score ≥ threshold, validated submission, or two successful attempts on different days). If no mastery signal is configured, the lab cannot be marked mastered.
- Module mastered: Module completed plus a mastery gate (e.g., all core labs mastered or a module assessment passed). If no mastery gate is configured, the module can be completed but not mastered.
- Path mastered: Path completed plus a mastery gate (e.g., all required modules mastered or a path assessment passed). If no mastery gate is configured, the path can be completed but not mastered.

**Reflection requirements**
- Completion does not require reflection unless `requiresReflection` is set.
- Mastery should require at least one reflection tied to the lab/module/path when a reflection prompt is available.

**Analytics guidance**
- Treat completion as activity/progress, not comprehension.
- Report mastery separately as a learning outcome.
- Store separate timestamps and evidence where possible: `completedAt`, `masteredAt`, and `masteryEvidence` (type + score/outcome).

**UI hints (tooltips/info icons)**
- `Completed`: "All required steps finished. This does not imply mastery."
- `Mastered`: "You demonstrated understanding based on assessments or validated work."
- `In progress`: "You have started; required steps remain."
- `Not started`: "No required steps completed yet."
- `Requires reflection`: "A short reflection is needed to finalize this item."

---

**AI and personalization**
- Onboarding generates a recommended learning path via backend AI.
- Learning paths can be AI generated with module outlines and content.
- Labs can be AI generated based on learning goal and path context.
- Assistant supports multi-conversation chat and optional illustrative visuals.
- Visual enrichment system exists in backend for adding diagrams or visuals.
- A source registry system can ground modules with external sources.

**AI generation constraint (visible)**
- Every AI-generated path, module, and lab must include one explicit constraint/assumption shown to the learner (e.g., "Designed for ~30 min/day", "Assumes basic algebra", "Will not introduce new prerequisites"). This sets expectations, reduces perceived randomness, and makes regeneration feel intentional.
- UI hint copy: "Generated with one explicit constraint to set expectations (shown here)."

---

**Backend services (apps/backend)**
- Auth is validated with Supabase JWT.
- `/paths` routes for generating and storing learning paths.
- `/labs` routes for generating labs and tracking progress.
- `/dashboard` routes to compute summary stats and charts.
- `/notifications` routes for learning milestones.
- `/ai` routes for the assistant and onboarding recommendations.
- `/registry` and source registry utilities for content grounding.
- `learn-by-doing` generator for step trees.
- Optional Firecrawl integration for web sources.

---

**Analytics and events**
- Events are tracked for onboarding, path creation, lab progress, and AI sessions.
- The app marks primary features in use (assistant, paths, labs).

---

**Tech stack**
- Next.js + TypeScript + Tailwind CSS on the frontend.
- Supabase for auth, database, and profile storage.
- Express backend for AI generation and data aggregation.
- Plate editor for rich text.
- Shadcn UI components for interface building.

---

**Known placeholders or WIP areas**
- Billing UI uses static mock data.
- Some nav items are commented out (planner, community, relevance explorer).
- The web waitlist page simulates submission.
- Some dashboard data falls back to onboarding interests if backend is unavailable.

---

**Where new feature ideas can fit**
- New module content modes or widgets.
- Richer lab templates or adaptive lab difficulty.
- Personalized review sessions and spaced repetition.
- Collaborative or community learning features.
- Coaching and scheduling (planner / time coach).
- Progress insights and learner diagnostics.
- Better source grounding and citations in modules.
