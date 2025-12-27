"use client";

import posthog from "posthog-js";
import { AnalyticsEventMap, AnalyticsEventName, PrimaryFeature } from "./events";

const EVENT_FEATURE_MAP: Partial<Record<AnalyticsEventName, PrimaryFeature>> = {
  dashboard_viewed: "dashboard",
  widget_rendered: "widget",
  widget_interacted: "widget",
  learning_path_created: "learning_path",
  learning_path_started: "learning_path",
  learning_path_completed: "learning_path",
  lab_viewed: "lab",
  lab_started: "lab",
  lab_completed: "lab",
  lab_marked_core: "lab",
  lab_recommended_shown: "lab",
  lab_recommended_started: "lab",
  ai_session_started: "ai_assistant",
  ai_message_sent: "ai_assistant",
  ai_widget_used: "ai_assistant",
  ai_session_ended: "ai_assistant"
};

const SENSITIVE_KEYS = /(email|name|prompt|content|message|text)/i;

let isInitialized = false;
let sessionStartedAt: number | null = null;
const labsTouched = new Set<string>();
let primaryFeatureUsed: PrimaryFeature | null = null;
let aiUsed = false;

function sanitizeProperties<T extends Record<string, unknown>>(properties?: T): Record<string, unknown> {
  if (!properties) return {};

  return Object.entries(properties).reduce<Record<string, unknown>>((acc, [key, value]) => {
    if (SENSITIVE_KEYS.test(key)) return acc;

    if (typeof value === "string") {
      const trimmed = value.slice(0, 120);
      if (trimmed) acc[key] = trimmed;
      return acc;
    }

    if (Array.isArray(value)) {
      acc[key] = value.slice(0, 10);
      return acc;
    }

    acc[key] = value;
    return acc;
  }, {});
}

export function initAnalytics() {
  if (isInitialized || typeof window === "undefined") return;

  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[analytics] NEXT_PUBLIC_POSTHOG_KEY is not set. Analytics disabled.");
    }
    return;
  }

  posthog.init(apiKey, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    mask_all_text: true,
    mask_all_element_attributes: true,
    session_recording: {
      maskAllInputs: true,
      sampling: { rate: 0.2 }
    },
    persistence: "memory"
  });

  isInitialized = true;
}

function trackFeatureUsage(eventName: AnalyticsEventName, properties?: Record<string, unknown>) {
  const feature = EVENT_FEATURE_MAP[eventName];
  if (feature && !primaryFeatureUsed) {
    primaryFeatureUsed = feature;
  }

  if (eventName.startsWith("lab_") && properties?.lab_id) {
    labsTouched.add(properties.lab_id as string);
  }

  if (eventName.startsWith("ai_")) {
    aiUsed = true;
  }
}

export function trackEvent<E extends AnalyticsEventName>(
  eventName: E,
  properties: AnalyticsEventMap[E]
) {
  if (!isInitialized) {
    initAnalytics();
  }
  if (!isInitialized) return;

  const payload = sanitizeProperties(properties);
  trackFeatureUsage(eventName, payload);
  posthog.capture(eventName, payload);
}

export function trackPageview(url?: string) {
  if (!isInitialized || typeof window === "undefined") return;
  posthog.capture("$pageview", {
    $current_url: url || window.location.href
  });
}

export function startSession() {
  if (sessionStartedAt || !isInitialized) return;
  sessionStartedAt = Date.now();

  trackEvent("session_started", {
    primary_feature_used: primaryFeatureUsed,
    labs_touched_count: labsTouched.size,
    ai_used: aiUsed
  });
}

export function endSession() {
  if (!sessionStartedAt || !isInitialized) return;

  const durationSeconds = Math.round((Date.now() - sessionStartedAt) / 1000);
  trackEvent("session_ended", {
    session_duration_seconds: durationSeconds,
    primary_feature_used: primaryFeatureUsed,
    labs_touched_count: labsTouched.size,
    ai_used: aiUsed
  });

  sessionStartedAt = null;
  primaryFeatureUsed = null;
  aiUsed = false;
  labsTouched.clear();
}

export function markLabTouched(labId?: string | null) {
  if (!labId) return;
  labsTouched.add(labId);
}

export function markPrimaryFeature(feature: PrimaryFeature) {
  if (!primaryFeatureUsed) {
    primaryFeatureUsed = feature;
  }
}

export function markAiUsed() {
  aiUsed = true;
}

export function isAnalyticsEnabled() {
  return isInitialized;
}
