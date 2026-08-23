import type { Metadata } from "next";
import { AgentChat } from "@/app/_components/agent-chat";

export const metadata: Metadata = {
  title: "Compositer — Agent",
};

export default function ChatPage() {
  return <AgentChat />;
}
