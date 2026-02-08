import PageContainer from "@/app/components/container/PageContainer";
import Breadcrumb from "../../layout/shared/breadcrumb/Breadcrumb";
import ChatAI from "@/app/components/apps/chat-ai/index";
import { ChatAIProvider } from "@/app/context/AIChatContext";
import AppCard from "@/app/components/shared/AppCard";

const BCrumb = [
  {
    to: "/",
    title: "Dashboard",
  },

  {
    title: "chat-ai",
  },
];

export default function AiChatPage() {
  return (
    <ChatAIProvider>
      <PageContainer title="Chat-AI" description="this is Chat-AI">
        <Breadcrumb title="Chat-AI" items={BCrumb} />
        <AppCard>
          <ChatAI />
        </AppCard>
      </PageContainer>
    </ChatAIProvider>
  );
}
