"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { ANALYTICS_CONFIG } from "@/lib/analytics/config";
import { markAiUsed, markPrimaryFeature, trackEvent } from "@/lib/analytics";
import { parseFileContent } from "@/lib/fileParser";

type Conversation = {
  id: string;
  title?: string | null;
  last_message?: string | null;
  updated_at?: string;
  created_at?: string;
};

type IllustrativeVisual = {
  src: string;
  fullSrc: string;
  alt: string;
  caption?: string;
  attribution?: string;
  usageLabel: string;
};

type Message = {
  id?: string | number;
  role: "user" | "assistant" | "system";
  content: string;
  created_at?: string;
  files?: File[];
  visuals?: IllustrativeVisual[];
};

const AI_CONTEXT = "free_chat" as const;

type AssistantContextValue = {
  conversations: Conversation[];
  messages: Message[];
  selectedConversationId: string | null;
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  refreshConversations: () => Promise<void>;
  selectConversation: (conversationId: string) => Promise<void>;
  sendMessage: (content: string, files?: File[]) => Promise<void>;
  startNewConversation: (title?: string) => Promise<string | null>;
  renameConversation: (conversationId: string, title: string) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;
};

const AssistantContext = createContext<AssistantContextValue | undefined>(undefined);

const getBackendUrl = () =>
  process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || "http://localhost:3001";

async function getAccessToken() {
  const supabase = createClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();
  return session?.access_token;
}

export function AssistantChatProvider({ children }: { children: React.ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const sessionStartedAtRef = useRef<number | null>(null);
  const lastMessageCountRef = useRef(0);

  const backendUrl = useMemo(() => getBackendUrl(), []);

  const startAiSession = useCallback(
    (existingCount = 0) => {
      if (sessionStartedAtRef.current) return;

      sessionStartedAtRef.current = Date.now();
      markPrimaryFeature("ai_assistant");
      markAiUsed();
      trackEvent("ai_session_started", {
        context: AI_CONTEXT,
        widget_type: "text",
        messages_count: existingCount,
        model_tier: ANALYTICS_CONFIG.defaultModelTier
      });
    },
    []
  );

  const endAiSession = useCallback(() => {
    if (!sessionStartedAtRef.current) return;

    const durationSeconds = Math.round((Date.now() - sessionStartedAtRef.current) / 1000);
    trackEvent("ai_session_ended", {
      context: AI_CONTEXT,
      widget_type: "text",
      messages_count: lastMessageCountRef.current,
      session_duration_seconds: durationSeconds,
      model_tier: ANALYTICS_CONFIG.defaultModelTier
    });
    sessionStartedAtRef.current = null;
  }, []);

  useEffect(() => {
    lastMessageCountRef.current = messages.length;
  }, [messages.length]);

  const refreshConversations = useCallback(async () => {
    try {
      const token = await getAccessToken();
      if (!token) {
        setError("Sign in required.");
        setConversations([]);
        return;
      }

      const res = await fetch(`${backendUrl}/ai/assistant/conversations`, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        cache: "no-store"
      });

      if (!res.ok) {
        throw new Error("Failed to fetch conversations");
      }

      const json = await res.json();
      setConversations(json.conversations || []);
      setError(null);
    } catch (err: any) {
      console.error("Assistant conversations fetch error", err);
      setError(err?.message || "Failed to load conversations");
    }
  }, [backendUrl]);

  const fetchMessages = useCallback(
    async (conversationId: string) => {
      try {
        const token = await getAccessToken();
        if (!token) {
          setError("Sign in required.");
          setMessages([]);
          return;
        }

        const res = await fetch(`${backendUrl}/ai/assistant/conversations/${conversationId}/messages`, {
          headers: {
            Authorization: `Bearer ${token}`
          },
          cache: "no-store"
        });

        if (!res.ok) {
          // If conversation doesn't exist (404), silently clear messages instead of showing error
          if (res.status === 404) {
            console.log("Conversation not found, clearing messages");
            setMessages([]);
            setSelectedConversationId(null);
            return;
          }
          throw new Error("Failed to fetch messages");
        }

        const json = await res.json();
        setMessages(json.messages || []);
        setError(null);
        startAiSession(json.messages?.length || 0);
      } catch (err: any) {
        console.error("Assistant messages fetch error", err);
        setError(err?.message || "Failed to load messages");
        setMessages([]);
      }
    },
    [backendUrl, startAiSession]
  );

  const selectConversation = useCallback(
    async (conversationId: string) => {
      setSelectedConversationId(conversationId);
      await fetchMessages(conversationId);
    },
    [fetchMessages]
  );

  const startNewConversation = useCallback(
    async (title?: string) => {
      // If a creation is in flight, or current conversation is empty, reuse it
      if (isCreatingConversation) return selectedConversationId;
      if (selectedConversationId && messages.length === 0) return selectedConversationId;

      try {
        setIsCreatingConversation(true);
        const token = await getAccessToken();
        if (!token) {
          setError("Sign in required.");
          return null;
        }

        const res = await fetch(`${backendUrl}/ai/assistant/conversations`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ title })
        });

        if (!res.ok) throw new Error("Failed to create conversation");

        const json = await res.json();
        const conversationId = json?.conversation?.id as string;
        startAiSession(0);
        await refreshConversations();
        if (conversationId) {
          await selectConversation(conversationId);
        }
        return conversationId || null;
      } catch (err: any) {
        console.error("Assistant start conversation error", err);
        setError(err?.message || "Failed to start conversation");
        return null;
      } finally {
        setIsCreatingConversation(false);
      }
    },
    [backendUrl, refreshConversations, selectConversation, selectedConversationId, messages.length, isCreatingConversation, startAiSession]
  );

  const sendMessage = useCallback(
    async (content: string, files?: File[]) => {
      const trimmedContent = content.trim();
      const effectiveContent =
        trimmedContent ||
        (files && files.length > 0
          ? `Please analyze the attached file${files.length > 1 ? "s" : ""}.`
          : "");

      if (!effectiveContent) return;
      setIsSending(true);
      try {
        startAiSession(messages.length);
        markAiUsed();
        const sessionDuration = sessionStartedAtRef.current
          ? Math.round((Date.now() - sessionStartedAtRef.current) / 1000)
          : undefined;
        trackEvent("ai_message_sent", {
          context: AI_CONTEXT,
          widget_type: "text",
          messages_count: messages.length + 1,
          model_tier: ANALYTICS_CONFIG.defaultModelTier,
          session_duration_seconds: sessionDuration
        });

        const token = await getAccessToken();
        if (!token) {
          setError("Sign in required.");
          return;
        }

        let conversationId = selectedConversationId;
        if (!conversationId) {
          conversationId = await startNewConversation();
        }
        if (!conversationId) return;

        // Optimistic user message; assistant placeholder only when streaming text arrives
        const tempUserId = `temp-user-${Date.now()}`;
        const tempAssistantId = `temp-assistant-${Date.now()}`;
        setMessages((prev) => [...prev, { id: tempUserId, role: "user", content: effectiveContent, files }]);

        // Process files if present - parse by file type (PDF, DOCX, text, etc.)
        let fileContents: Array<{ name: string; content: string; type: string }> = [];
        if (files && files.length > 0) {
          fileContents = await Promise.all(
            files.map(async (file) => {
              try {
                const parsedContent = await parseFileContent(file);
                const content = parsedContent.startsWith("[PDF_BASE64]")
                  ? parsedContent
                  : parsedContent.slice(0, 50000);
                console.log(`Read file ${file.name}: ${content.length} characters`);
                return {
                  name: file.name,
                  content,
                  type: file.type
                };
              } catch (error) {
                console.error(`Error reading file ${file.name}:`, error);
                return {
                  name: file.name,
                  content: `[Error: Could not read file content - ${error}]`,
                  type: file.type
                };
              }
            })
          );
          console.log('Sending files:', fileContents.map(f => ({ name: f.name, length: f.content.length })));
        }

        const res = await fetch(`${backendUrl}/ai/assistant/chat?stream=true`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            conversationId,
            message: effectiveContent,
            files: fileContents
          })
        });

        if (!res.ok || !res.body) {
          throw new Error("Failed to send message");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let assistantText = "";
        let buffer = "";
        let hasStarted = false;
        let messageVisuals: IllustrativeVisual[] = [];

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";

          for (const part of parts) {
            if (!part.trim()) continue;
            
            const lines = part.split("\n");
            let event = "";
            const dataLines: string[] = [];

            for (const line of lines) {
              if (line.startsWith("event:")) {
                event = line.replace(/^event:\s*/, "").trim();
              } else if (line.startsWith("data:")) {
                dataLines.push(line.replace(/^data:\s?/, ""));
              }
            }
            
            const data = dataLines.join("\n");

            if (event === "end") break;
            if (event === "error") {
              let message = "Assistant request failed";
              try {
                const parsed = JSON.parse(data);
                if (parsed?.error && typeof parsed.error === "string") {
                  message = parsed.error;
                }
              } catch {
                if (data?.trim()) {
                  message = data.trim();
                }
              }
              throw new Error(message);
            }
            
            if (event === "title") {
              try {
                let title = data;
                if (title.startsWith('"') && title.endsWith('"')) {
                   title = JSON.parse(title);
                }
                setConversations(prev => prev.map(c => 
                  c.id === conversationId ? { ...c, title } : c
                ));
              } catch (e) {
                console.error("Failed to parse title update", e);
              }
              continue;
            }

            // Handle visuals event - store for the assistant message
            if (event === "visuals") {
              try {
                messageVisuals = JSON.parse(data);
                console.log("[VISUALS] Received", messageVisuals.length, "visuals");
                
                // If we haven't started the assistant message yet, create it now with visuals
                if (!hasStarted) {
                  hasStarted = true;
                  setMessages((prev) => [...prev, { 
                    id: tempAssistantId, 
                    role: "assistant", 
                    content: "",
                    visuals: messageVisuals
                  }]);
                } else {
                  // Update existing message with visuals
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === tempAssistantId ? { ...m, visuals: messageVisuals } : m
                    )
                  );
                }
              } catch (e) {
                console.error("Failed to parse visuals", e);
              }
              continue;
            }

            let payload = data;
            if (!payload && part.startsWith("data:")) {
              const match = part.match(/^data: ?(.*)$/s);
              if (match) payload = match[1];
            }

            if (!payload) continue;
            if (payload === "done" || payload === "[DONE]") continue;

            try {
              if (payload.startsWith('"') && payload.endsWith('"')) {
                 payload = JSON.parse(payload);
              }
            } catch (e) {
              // ignore
            }

            if (!hasStarted) {
              hasStarted = true;
              setMessages((prev) => [...prev, { 
                id: tempAssistantId, 
                role: "assistant", 
                content: "",
                visuals: messageVisuals.length > 0 ? messageVisuals : undefined
              }]);
            }

            assistantText += payload;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === tempAssistantId ? { ...m, content: assistantText, visuals: messageVisuals.length > 0 ? messageVisuals : m.visuals } : m
              )
            );
          }
        }

        if (!hasStarted) {
          throw new Error("No response received from assistant.");
        }

        // After streaming, we have the most up-to-date messages including visuals.
        // Don't overwrite with server messages which don't include visuals.
        // Just refresh conversation list for sidebar without touching messages.
        await refreshConversations();
        setSelectedConversationId(conversationId);
        setError(null);
      } catch (err: any) {
        console.error("Assistant send message error", err);
        setError(err?.message || "Failed to send message");
        // rollback optimistic assistant message
        setMessages((prev) => prev.filter((m) => !(typeof m.id === "string" && m.id.startsWith("temp-"))));
      } finally {
        setIsSending(false);
      }
    },
    [backendUrl, refreshConversations, selectedConversationId, startNewConversation, selectConversation, startAiSession, messages.length]
  );

  const renameConversation = useCallback(
    async (conversationId: string, title: string) => {
      if (!title.trim()) return;
      try {
        const token = await getAccessToken();
        if (!token) {
          setError("Sign in required.");
          return;
        }
        const res = await fetch(`${backendUrl}/ai/assistant/conversations/${conversationId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ title })
        });
        if (!res.ok) throw new Error("Failed to rename conversation");
        await refreshConversations();
      } catch (err: any) {
        console.error("Assistant rename conversation error", err);
        setError(err?.message || "Failed to rename conversation");
      }
    },
    [backendUrl, refreshConversations]
  );

  const deleteConversation = useCallback(
    async (conversationId: string) => {
      try {
        const token = await getAccessToken();
        if (!token) {
          setError("Sign in required.");
          return;
        }
        
        // Perform the delete
        const res = await fetch(`${backendUrl}/ai/assistant/conversations/${conversationId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (!res.ok) throw new Error("Failed to delete conversation");
        
        const wasSelected = selectedConversationId === conversationId;
        
        // Update conversations list optimistically
        setConversations((prev) => {
          const filtered = prev.filter((c) => c.id !== conversationId);
          
          // If we deleted the selected conversation, select the first remaining one
          if (wasSelected && filtered.length > 0) {
            // Clear current state first
            setMessages([]);
            setSelectedConversationId(null);
            // Then select the first conversation in the next tick
            setTimeout(() => {
              selectConversation(filtered[0].id);
            }, 100); // Small delay to ensure clean state transition
          } else if (wasSelected) {
            // No conversations left, just clear
            setMessages([]);
            setSelectedConversationId(null);
          }
          
          return filtered;
        });
        
      } catch (err: any) {
        console.error("Assistant delete conversation error", err);
        setError(err?.message || "Failed to delete conversation");
        // Refresh on error to resync with server
        void refreshConversations();
      }
    },
    [backendUrl, selectedConversationId, selectConversation]
  );

  useEffect(() => {
    const bootstrap = async () => {
      setIsLoading(true);
      await refreshConversations();
      setIsLoading(false);
    };
    void bootstrap();
  }, [refreshConversations]);

  // Track if we've done the initial auto-selection
  const hasAutoSelectedRef = useRef(false);

  useEffect(() => {
    // Only auto-select on initial load, not on subsequent conversation updates
    if (!selectedConversationId && conversations.length > 0 && !isLoading && !hasAutoSelectedRef.current) {
      hasAutoSelectedRef.current = true;
      void selectConversation(conversations[0].id);
    }
  }, [conversations, selectedConversationId, selectConversation, isLoading]);

  useEffect(() => {
    return () => {
      endAiSession();
    };
  }, [endAiSession]);

  const value: AssistantContextValue = {
    conversations,
    messages,
    selectedConversationId,
    isLoading,
    isSending,
    error,
    refreshConversations,
    selectConversation,
    sendMessage,
    startNewConversation,
    renameConversation,
    deleteConversation
  };

  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
}

export function useAssistantChat() {
  const ctx = useContext(AssistantContext);
  if (!ctx) throw new Error("useAssistantChat must be used within AssistantChatProvider");
  return ctx;
}
