"use client";

export type PrimaryFeature =
  | "dashboard"
  | "learning_path"
  | "lab"
  | "ai_assistant"
  | "widget";

export type LabType = "core" | "recommended" | "optional";

export type ModelTier = "lite" | "standard" | "advanced";

export type AnalyticsEventMap = {
  onboarding_started: {
    onboarding_version: string;
  };
  onboarding_completed: {
    onboarding_version: string;
    skipped_steps: boolean;
    time_to_complete_seconds: number;
  };
  activation_completed: {
    path_id?: string;
    generated_by_ai?: boolean;
    topic_domain?: string | null;
    difficulty_level?: string | null;
    total_labs?: number | null;
  };
  learning_path_created: {
    path_id: string;
    generated_by_ai: boolean;
    topic_domain?: string | null;
    difficulty_level?: string | null;
    total_labs?: number | null;
  };
  learning_path_started: {
    path_id: string;
    generated_by_ai?: boolean;
    topic_domain?: string | null;
    difficulty_level?: string | null;
    total_labs?: number | null;
    completed_labs_count?: number | null;
  };
  learning_path_completed: {
    path_id: string;
    generated_by_ai?: boolean;
    topic_domain?: string | null;
    difficulty_level?: string | null;
    total_labs?: number | null;
    completed_labs_count?: number | null;
  };
  learning_path_abandoned: {
    path_id: string;
    generated_by_ai?: boolean;
    topic_domain?: string | null;
    difficulty_level?: string | null;
    total_labs?: number | null;
    completed_labs_count?: number | null;
  };
  lab_viewed: {
    lab_id: string;
    lab_type?: LabType;
    generated_by_ai?: boolean;
    estimated_duration?: number | null;
  };
  lab_started: {
    lab_id: string;
    lab_type?: LabType;
    generated_by_ai?: boolean;
    estimated_duration?: number | null;
  };
  lab_completed: {
    lab_id: string;
    lab_type?: LabType;
    generated_by_ai?: boolean;
    estimated_duration?: number | null;
    completion_time_seconds?: number | null;
    retries_count?: number | null;
  };
  lab_marked_core: {
    lab_id: string;
    lab_type: LabType;
    generated_by_ai?: boolean;
    estimated_duration?: number | null;
  };
  lab_recommended_shown: {
    lab_type: LabType;
    estimated_duration?: number | null;
  };
  lab_recommended_started: {
    lab_id?: string;
    lab_type: LabType;
    estimated_duration?: number | null;
  };
  ai_session_started: {
    context: "lab" | "path" | "dashboard" | "free_chat";
    widget_type: "chart" | "flow" | "code" | "text" | "other";
    messages_count: number;
    model_tier: ModelTier;
  };
  ai_message_sent: {
    context: "lab" | "path" | "dashboard" | "free_chat";
    widget_type: "chart" | "flow" | "code" | "text" | "other";
    messages_count: number;
    model_tier: ModelTier;
    session_duration_seconds?: number;
  };
  ai_widget_used: {
    context: "lab" | "path" | "dashboard" | "free_chat";
    widget_type: "chart" | "flow" | "code" | "text" | "other";
    model_tier: ModelTier;
  };
  ai_session_ended: {
    context: "lab" | "path" | "dashboard" | "free_chat";
    widget_type: "chart" | "flow" | "code" | "text" | "other";
    messages_count: number;
    session_duration_seconds: number;
    model_tier: ModelTier;
  };
  session_started: {
    primary_feature_used: PrimaryFeature | null;
    labs_touched_count: number;
    ai_used: boolean;
  };
  session_ended: {
    session_duration_seconds: number;
    primary_feature_used: PrimaryFeature | null;
    labs_touched_count: number;
    ai_used: boolean;
  };
  dashboard_viewed: {
    dashboard_variant: string;
  };
  widget_rendered: {
    widget_type: string;
    triggered_by_ai: boolean;
    dashboard_variant?: string;
  };
  widget_interacted: {
    widget_type: string;
    triggered_by_ai: boolean;
    dashboard_variant?: string;
    interaction?: string;
    target_id?: string | null;
  };
};

export type AnalyticsEventName = keyof AnalyticsEventMap;
