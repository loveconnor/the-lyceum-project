"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type Conversation = {
  id: string;
  title?: string | null;
  last_message?: string | null;
  updated_at?: string;
  created_at?: string;
};

type Message = {
  id?: string | number;
  role: "user" | "assistant" | "system";
  content: string;
  created_at?: string;
};

type AssistantContextValue = {
  conversations: Conversation[];
  messages: Message[];
  selectedConversationId: string | null;
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  refreshConversations: () => Promise<void>;
  selectConversation: (conversationId: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
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

  const backendUrl = useMemo(() => getBackendUrl(), []);

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
          throw new Error("Failed to fetch messages");
        }

        const json = await res.json();
        setMessages(json.messages || []);
        setError(null);
      } catch (err: any) {
        console.error("Assistant messages fetch error", err);
        setError(err?.message || "Failed to load messages");
        setMessages([]);
      }
    },
    [backendUrl]
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
    [backendUrl, refreshConversations, selectConversation, selectedConversationId, messages.length, isCreatingConversation]
  );

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;
      setIsSending(true);
      try {
        const token = await getAccessToken();
        if (!token) {
          setError("Sign in required.");
          return;
        }

        let conversationId = selectedConversationId;
        if (!conversationId) {
          conversationId = await startNewConversation(content.slice(0, 60));
        }
        if (!conversationId) return;

        // Optimistic user message; assistant placeholder only when streaming text arrives
        const tempUserId = `temp-user-${Date.now()}`;
        const tempAssistantId = `temp-assistant-${Date.now()}`;
        setMessages((prev) => [...prev, { id: tempUserId, role: "user", content: content }]);

        const res = await fetch(`${backendUrl}/ai/assistant/chat?stream=true`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            conversationId,
            message: content
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

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";

          for (const part of parts) {
            if (!part.trim()) continue;
            
            // Handle event messages
            if (part.startsWith("event:")) {
              const eventType = part.replace(/^event:\s*/, "").trim();
              if (eventType === "end") break;
              if (eventType === "error") continue;
              continue;
            }
            
            if (!part.startsWith("data:")) continue;
            const payload = part.replace(/^data:\s*/, "").trim();
            if (!payload || payload === "done" || payload === "[DONE]") continue;

            if (!hasStarted) {
              hasStarted = true;
              // add assistant placeholder when first chunk arrives
              setMessages((prev) => [...prev, { id: tempAssistantId, role: "assistant", content: "" }]);
            }

            // Backend sends raw text chunks, not JSON
            assistantText += payload;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === tempAssistantId ? { ...m, content: assistantText } : m
              )
            );
          }
        }

        // Refresh from server to align IDs/persistence
        await selectConversation(conversationId);
        await refreshConversations();
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
    [backendUrl, refreshConversations, selectedConversationId, startNewConversation, selectConversation]
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
        const res = await fetch(`${backendUrl}/ai/assistant/conversations/${conversationId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (!res.ok) throw new Error("Failed to delete conversation");
        if (selectedConversationId === conversationId) {
          setMessages([]);
          setSelectedConversationId(null);
        }
        await refreshConversations();
      } catch (err: any) {
        console.error("Assistant delete conversation error", err);
        setError(err?.message || "Failed to delete conversation");
      }
    },
    [backendUrl, refreshConversations, selectedConversationId]
  );

  useEffect(() => {
    const bootstrap = async () => {
      setIsLoading(true);
      await refreshConversations();
      setIsLoading(false);
    };
    void bootstrap();
  }, [refreshConversations]);

  useEffect(() => {
    if (!selectedConversationId && conversations.length > 0) {
      void selectConversation(conversations[0].id);
    }
  }, [conversations, selectedConversationId, selectConversation]);

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
