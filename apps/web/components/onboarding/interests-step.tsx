"use client";
import React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useOnboardingStore } from "@/app/onboarding/store";
import { Plus } from "lucide-react";

type InterestOption = {
  name: string;
  subtopics?: string[];
};

const interestOptions: InterestOption[] = [
  // Foundations
  {
    name: "Mathematics",
    subtopics: ["Calculus", "Linear Algebra", "Statistics", "Discrete Math", "Number Theory", "Geometry"]
  },
  {
    name: "Logic & Reasoning",
    subtopics: ["Propositional Logic", "Predicate Logic", "Deductive Reasoning", "Inductive Reasoning", "Critical Analysis", "Logical Fallacies"]
  },
  {
    name: "Critical Thinking",
    subtopics: ["Problem Analysis", "Argument Evaluation", "Decision Making", "Research Skills", "Analytical Skills", "Cognitive Biases"]
  },
  {
    name: "Writing & Composition",
    subtopics: ["Essay Writing", "Technical Writing", "Creative Writing", "Academic Writing", "Editing", "Style & Grammar"]
  },
  {
    name: "Problem Solving",
    subtopics: ["Algorithmic Thinking", "Heuristics", "Design Thinking", "Root Cause Analysis", "Troubleshooting", "Strategy"]
  },

  // Computer Science & Technology
  {
    name: "Programming",
    subtopics: ["Python", "JavaScript", "Java", "C++", "Rust", "Go"]
  },
  {
    name: "Data Structures",
    subtopics: ["Arrays", "Linked Lists", "Trees", "Graphs", "Hash Tables", "Stacks & Queues"]
  },
  {
    name: "Algorithms",
    subtopics: ["Sorting", "Searching", "Dynamic Programming", "Greedy Algorithms", "Graph Algorithms", "Complexity Analysis"]
  },
  {
    name: "Web Development",
    subtopics: ["HTML/CSS", "React", "Node.js", "APIs", "Responsive Design", "Web Performance"]
  },
  {
    name: "Systems Design",
    subtopics: ["Architecture", "Scalability", "Distributed Systems", "Microservices", "Load Balancing", "Caching"]
  },
  {
    name: "Databases",
    subtopics: ["SQL", "NoSQL", "Database Design", "Query Optimization", "Transactions", "PostgreSQL"]
  },
  {
    name: "APIs & Backend",
    subtopics: ["REST APIs", "GraphQL", "Authentication", "Server Architecture", "API Design", "Middleware"]
  },
  {
    name: "Frontend Engineering",
    subtopics: ["React", "Vue", "TypeScript", "State Management", "UI Components", "Performance"]
  },
  {
    name: "DevOps",
    subtopics: ["CI/CD", "Docker", "Kubernetes", "Cloud Platforms", "Monitoring", "Infrastructure as Code"]
  },
  {
    name: "Cybersecurity",
    subtopics: ["Network Security", "Cryptography", "Ethical Hacking", "Penetration Testing", "Security Best Practices", "Threat Analysis"]
  },

  // Data & AI
  {
    name: "Data Science",
    subtopics: ["Data Analysis", "Data Visualization", "Pandas", "NumPy", "Statistical Modeling", "Big Data"]
  },
  {
    name: "Machine Learning",
    subtopics: ["Supervised Learning", "Unsupervised Learning", "Neural Networks", "Deep Learning", "Model Training", "Feature Engineering"]
  },
  {
    name: "Artificial Intelligence",
    subtopics: ["NLP", "Computer Vision", "Reinforcement Learning", "AI Ethics", "GPT Models", "AI Applications"]
  },
  {
    name: "Statistics",
    subtopics: ["Probability", "Hypothesis Testing", "Regression Analysis", "Bayesian Statistics", "Statistical Inference", "Distributions"]
  },
  {
    name: "Data Analysis",
    subtopics: ["Exploratory Analysis", "Data Cleaning", "Statistical Analysis", "Predictive Modeling", "A/B Testing", "Data Mining"]
  },

  // Sciences
  {
    name: "Physics",
    subtopics: ["Classical Mechanics", "Quantum Physics", "Electromagnetism", "Thermodynamics", "Relativity", "Particle Physics"]
  },
  {
    name: "Biology",
    subtopics: ["Cell Biology", "Genetics", "Evolution", "Ecology", "Molecular Biology", "Biochemistry"]
  },
  {
    name: "Chemistry",
    subtopics: ["Organic Chemistry", "Inorganic Chemistry", "Physical Chemistry", "Biochemistry", "Chemical Reactions", "Molecular Structure"]
  },
  {
    name: "Environmental Science",
    subtopics: ["Climate Change", "Ecology", "Conservation", "Sustainability", "Renewable Energy", "Environmental Policy"]
  },
  {
    name: "Neuroscience",
    subtopics: ["Brain Structure", "Cognitive Neuroscience", "Neuroplasticity", "Neural Networks", "Behavior", "Memory & Learning"]
  },

  // Humanities & Social Sciences
  {
    name: "Philosophy",
    subtopics: ["Ethics", "Metaphysics", "Epistemology", "Logic", "Political Philosophy", "Existentialism"]
  },
  {
    name: "Psychology",
    subtopics: ["Cognitive Psychology", "Behavioral Psychology", "Social Psychology", "Developmental Psychology", "Clinical Psychology", "Neuroscience"]
  },
  {
    name: "History",
    subtopics: ["World History", "Modern History", "Ancient Civilizations", "Historical Analysis", "Cultural History", "Political History"]
  },
  {
    name: "Ethics",
    subtopics: ["Moral Philosophy", "Applied Ethics", "Bioethics", "Business Ethics", "AI Ethics", "Utilitarianism"]
  },
  {
    name: "Economics",
    subtopics: ["Microeconomics", "Macroeconomics", "Game Theory", "Behavioral Economics", "Economic Policy", "Market Analysis"]
  },
  {
    name: "Political Science",
    subtopics: ["Political Theory", "International Relations", "Comparative Politics", "Public Policy", "Government Systems", "Democracy"]
  },

  // Design & Communication
  {
    name: "Visual Design",
    subtopics: ["UI Design", "Graphic Design", "Typography", "Color Theory", "Layout Design", "Design Systems"]
  },
  {
    name: "UX Design",
    subtopics: ["User Research", "Wireframing", "Prototyping", "Usability Testing", "Information Architecture", "Interaction Design"]
  },
  {
    name: "Information Design",
    subtopics: ["Data Visualization", "Infographics", "Visual Storytelling", "Diagrams", "Information Architecture", "Visual Communication"]
  },
  {
    name: "Technical Writing",
    subtopics: ["Documentation", "API Documentation", "User Guides", "Technical Reports", "Clear Communication", "Content Strategy"]
  },
  {
    name: "Communication Skills",
    subtopics: ["Public Speaking", "Presentation Skills", "Active Listening", "Written Communication", "Persuasion", "Conflict Resolution"]
  },

  // Applied Skills
  {
    name: "Research Methods",
    subtopics: ["Qualitative Research", "Quantitative Research", "Experimental Design", "Data Collection", "Literature Review", "Analysis"]
  },
  {
    name: "Analytical Writing",
    subtopics: ["Argument Construction", "Critical Analysis", "Essay Structure", "Evidence Evaluation", "Academic Writing", "Persuasive Writing"]
  },
  {
    name: "Scientific Reasoning",
    subtopics: ["Hypothesis Testing", "Experimental Method", "Data Interpretation", "Scientific Method", "Evidence-Based Thinking", "Peer Review"]
  },
  {
    name: "Argumentation",
    subtopics: ["Logical Arguments", "Rhetoric", "Debate", "Fallacy Detection", "Persuasive Techniques", "Critical Thinking"]
  },
  {
    name: "Decision Making",
    subtopics: ["Risk Assessment", "Cost-Benefit Analysis", "Strategic Thinking", "Problem Solving", "Decision Frameworks", "Trade-offs"]
  },

  // Interdisciplinary
  {
    name: "Math for Computer Science",
    subtopics: ["Discrete Math", "Linear Algebra", "Probability", "Graph Theory", "Combinatorics", "Algorithm Analysis"]
  },
  {
    name: "AI Ethics",
    subtopics: ["Bias in AI", "Fairness", "Transparency", "Privacy", "Accountability", "Societal Impact"]
  },
  {
    name: "Technology & Society",
    subtopics: ["Digital Divide", "Social Impact", "Privacy Issues", "Technology Policy", "Digital Rights", "Future of Work"]
  },
  {
    name: "Science Communication",
    subtopics: ["Public Engagement", "Science Writing", "Media Relations", "Education", "Visual Communication", "Storytelling"]
  }
];


const initialVisible = 36;

export function InterestsStep() {
  const { data, updateInterests, nextStep } = useOnboardingStore();
  const [selectedInterests, setSelectedInterests] = useState<string[]>(data.interests);
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);

  const toggleExpand = (topicName: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setExpandedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(topicName)) {
        next.delete(topicName);
      } else {
        next.add(topicName);
      }
      return next;
    });
  };

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  const handleNext = () => {
    updateInterests(selectedInterests);
    nextStep();
  };

  const visibleInterests = showAll ? interestOptions : interestOptions.slice(0, initialVisible);

  return (
    <div className="flex h-screen flex-col items-center justify-center px-4 overflow-hidden">
      <div className="w-full max-w-3xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-normal">What are you interested in?</h1>
          <p className="text-muted-foreground text-sm">Choose three or more.</p>
        </div>

        <div className="flex flex-wrap justify-center gap-3 max-h-[50vh] overflow-y-auto px-2 py-1">
          {visibleInterests.map((interest) => {
            const isExpanded = expandedTopics.has(interest.name);
            const hasSubtopics = interest.subtopics && interest.subtopics.length > 0;
            
            return (
              <React.Fragment key={interest.name}>
                <button
                  onClick={() => hasSubtopics ? toggleExpand(interest.name) : toggleInterest(interest.name)}
                  className={`
                    inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors
                    ${isExpanded 
                      ? "bg-foreground text-background border-foreground" 
                      : "bg-background text-foreground border-border hover:border-foreground"
                    }
                  `}
                >
                  <span>{interest.name}</span>
                  <Plus className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-45" : ""}`} />
                </button>
                
                {isExpanded && hasSubtopics && interest.subtopics!.map((subtopic) => {
                  const isSubtopicSelected = selectedInterests.includes(subtopic);
                  return (
                    <button
                      key={subtopic}
                      onClick={() => toggleInterest(subtopic)}
                      className={`
                        inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors animate-in fade-in zoom-in-95 duration-200
                        ${isSubtopicSelected 
                          ? "bg-foreground text-background border-foreground" 
                          : "bg-background text-foreground border-border hover:border-foreground"
                        }
                      `}
                    >
                      <span>{subtopic}</span>
                      <Plus className={`h-3 w-3 transition-transform ${isSubtopicSelected ? "rotate-45" : ""}`} />
                    </button>
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>

        {!showAll && interestOptions.length > initialVisible && (
          <div className="text-center">
            <button
              onClick={() => setShowAll(true)}
              className="text-sm text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
            >
              Show more
            </button>
          </div>
        )}

        <div className="flex justify-center pt-2">
          <Button
            size="lg"
            onClick={handleNext}
            disabled={selectedInterests.length < 3}
            className="min-w-[200px] rounded-full disabled:opacity-50"
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
