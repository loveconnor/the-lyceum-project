import { Metadata } from "next";
import { generateMeta } from "@/lib/utils";

import AssistantChatShell from "@/components/chat/assistant-chat-shell";

export async function generateMetadata(): Promise<Metadata> {
  return generateMeta({
    title: "The Lyceum Project - AI Assistant",
    description:
      "The Lyceum Project is an AI-powered learning platform designed to bring personalized, interactive education to everyone.",
    canonical: "/assistant"
  });
}

export default function Page() {
  return (
    <AssistantChatShell />
  );
}
