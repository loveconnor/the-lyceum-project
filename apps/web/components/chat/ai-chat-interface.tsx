"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ArrowUpIcon, MicIcon, Paperclip, X, BrainIcon, CodeIcon, DribbbleIcon, GlobeIcon } from "lucide-react";
import { CopyIcon } from "@radix-ui/react-icons";
import Lottie from "lottie-react";

import {
  Input,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea
} from "@/components/ui/custom/prompt/input";
import { Button } from "@/components/ui/button";
import { ChatContainer } from "@/components/ui/custom/prompt/chat-container";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent
} from "@/components/ui/custom/prompt/message";
import { Markdown } from "@/components/ui/custom/prompt/markdown";
import { PromptLoader } from "@/components/ui/custom/prompt/loader";
import { PromptScrollButton } from "@/components/ui/custom/prompt/scroll-button";

import aiSphereAnimation from "@/app/(main)/assistant/ai-sphere-animation.json";
import { useAssistantChat } from "./assistant-chat-provider";
import { createClient as createSupabaseBrowserClient } from "@/utils/supabase/client";
import { useUserProfile } from "@/components/providers/user-provider";
import { useUserSettings } from "@/components/providers/settings-provider";

export default function AIChatInterface() {
  const { messages, sendMessage, isSending } = useAssistantChat();
  const userProfile = useUserProfile();
  const { settings } = useUserSettings();
  const [prompt, setPrompt] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const [isFirstResponse, setIsFirstResponse] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsFirstResponse(messages.length > 0);
  }, [messages]);

  const displayName = useMemo(() => {
    const fallbackEmail = userProfile?.email?.split("@")[0] || "there";
    const pickName = settings.account?.name || settings.profile?.username || userProfile?.name;
    const first =
      pickName?.split(" ").filter(Boolean)[0] ||
      fallbackEmail;
    return first || "there";
  }, [settings.account?.name, settings.profile?.username, userProfile?.name, userProfile?.email]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  }, []);


  const handleSend = async () => {
    if (!prompt.trim()) return;
    await sendMessage(prompt);
    setPrompt("");
    setFiles([]);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    if (uploadInputRef?.current) {
      uploadInputRef.current.value = "";
    }
  };

  const handleCopyMessage = async (text: string) => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
  };


  const FileListItem = ({
    file,
    dismiss = true,
    index
  }: {
    file: File;
    dismiss?: boolean;
    index: number;
  }) => (
    <div className="bg-muted flex items-center gap-2 rounded-lg px-3 py-2 text-sm">
      <Paperclip className="size-4" />
      <span className="max-w-[120px] truncate">{file.name}</span>
      {dismiss && (
        <button
          onClick={() => handleRemoveFile(index)}
          className="hover:bg-secondary/50 rounded-full p-1">
          <X className="size-4" />
        </button>
      )}
    </div>
  );

  return (
    <div className="mx-auto flex h-full w-full max-w-4xl flex-col items-center justify-center space-y-4 lg:p-4">
      <ChatContainer
        className={cn("relative w-full flex-1 space-y-4 pe-2 pt-10 md:pt-0", {
          hidden: !isFirstResponse
        })}
        ref={containerRef}
        scrollToRef={bottomRef}>
        {messages.map((message, index) => {
          const isAssistant = message.role === "assistant";
          const isLastMessage = index === messages.length - 1;
          const isAssistantPlaceholder = isAssistant && !message.content;

          return (
            <Message
              key={message.id ?? index}
              className={message.role === "user" ? "justify-end" : "justify-start"}>
              <div
                className={cn("max-w-[85%] flex-1 sm:max-w-[75%]", {
                  "justify-end text-end": !isAssistant
                })}>
                {isAssistant ? (
                  <div className="space-y-2">
                    {isAssistantPlaceholder ? (
                      <div className="bg-muted text-foreground prose rounded-lg border p-4">
                        <PromptLoader variant="pulse-dot" />
                      </div>
                    ) : (
                      <div className="bg-muted text-foreground prose rounded-lg border p-4">
                        <Markdown className={"space-y-4"}>{message.content}</Markdown>
                      </div>
                    )}
                    <MessageActions
                      className={cn(
                        "flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100",
                        isLastMessage && "opacity-100"
                      )}>
                      <MessageAction
                        tooltip="Copy"
                        delayDuration={100}
                        onCopy={() => handleCopyMessage(message.content)}>
                        <Button variant="ghost" size="icon" className="rounded-full">
                          <CopyIcon />
                        </Button>
                      </MessageAction>
                    </MessageActions>
                  </div>
                ) : message?.files && message.files.length > 0 ? (
                  <div className="flex flex-col items-end space-y-2">
                    <div className="flex flex-wrap justify-end gap-2">
                      {message.files.map((file, index) => (
                        <FileListItem key={index} index={index} file={file} dismiss={false} />
                      ))}
                    </div>
                    {message.content ? (
                      <>
                        <MessageContent className="bg-primary text-primary-foreground inline-flex">
                          {message.content}
                        </MessageContent>
                      </>
                    ) : null}
                  </div>
                ) : (
                  <MessageContent className="bg-primary text-primary-foreground inline-flex text-start">
                    {message.content}
                  </MessageContent>
                )}
              </div>
            </Message>
          );
        })}

        {isSending && (
          <div className="ps-2">
            <PromptLoader variant="pulse-dot" />
          </div>
        )}
      </ChatContainer>

      <div className="fixed right-4 bottom-4">
        <PromptScrollButton
          containerRef={containerRef}
          scrollRef={bottomRef}
          className="shadow-sm"
        />
      </div>

      {/* Welcome message */}
      {!isFirstResponse && (
        <div className="mb-10">
          <div className="mx-auto -mt-36 hidden w-72 mask-b-from-100% mask-radial-[50%_50%] mask-radial-from-0% md:block">
            <Lottie className="w-full" animationData={aiSphereAnimation} loop autoplay />
          </div>

          <h1 className="text-center text-2xl leading-normal font-medium lg:text-4xl">
            {greeting}, {displayName} <br /> How Can I{" "}
            <span className="bg-gradient-to-r from-purple-400 to-indigo-300 bg-clip-text text-transparent">
              Assist You Today?
            </span>
          </h1>
        </div>
      )}
      {/* Welcome message */}

      <div className="bg-primary/10 w-full rounded-2xl p-2">
        <Input
          value={prompt}
          onValueChange={setPrompt}
          onSubmit={handleSend}
          className="w-full overflow-hidden rounded-2xl border border-neutral-200 bg-white/80 p-1 shadow-sm">
          {files.length > 0 && (
            <div className="flex flex-wrap gap-2 pb-2">
              {files.map((file, index) => (
                <FileListItem key={index} index={index} file={file} />
              ))}
            </div>
          )}

          <PromptInputTextarea
            placeholder="Ask me anything..."
            className="min-h-[92px] rounded-xl border border-neutral-200 bg-white p-4 pt-5"
          />

          <PromptInputActions className="flex items-center justify-between gap-2 p-3">
            <div className="flex items-center gap-2">
              <PromptInputAction tooltip="Attach files">
                <label
                  htmlFor="file-upload"
                  className="hover:bg-secondary-foreground/10 flex size-8 cursor-pointer items-center justify-center rounded-2xl">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <Paperclip className="text-primary size-5" />
                </label>
              </PromptInputAction>
            </div>

            <div className="flex gap-2">
              <PromptInputAction tooltip="Voice input">
                <Button variant="outline" size="icon" className="size-9 rounded-full">
                  <MicIcon size={18} />
                </Button>
              </PromptInputAction>
              <PromptInputAction tooltip={isSending ? "Stop generation" : "Send message"}>
                <Button
                  variant="default"
                  size="icon"
                  className="size-8 rounded-full"
                  onClick={handleSend}
                  disabled={!prompt.trim() || isSending}>
                  <ArrowUpIcon />
                </Button>
              </PromptInputAction>
            </div>
          </PromptInputActions>
        </Input>
      </div>

    </div>
  );
}

const defaultGroups: Record<"summary" | "code" | "design" | "research", string[]> = {
  summary: ["Summarize a document", "Summarize a video", "Summarize a podcast"],
  code: ["Help me debug code", "Explain a concept", "Refactor code for clarity"],
  design: ["Brainstorm UI ideas", "Review a design", "Suggest design improvements"],
  research: ["Find learning resources", "Compare two tools", "Draft a research paper"]
};
