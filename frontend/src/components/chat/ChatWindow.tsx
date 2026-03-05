"use client";

import { useChat } from "@/hooks/useChat";
import { SuggestionPills } from "./SuggestionPills";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";

export function ChatWindow() {
  const { messages, isLoading, messagesEndRef, handleSend, stopStreaming } = useChat();
  const hasMessages = messages.length > 0;

  return (
    <div className="flex h-full min-h-0 flex-col animate-fadeIn">
      <div className="flex-1 min-h-0 overflow-hidden">
        {!hasMessages ? (
          <div className="h-full flex flex-col items-center justify-center px-6">
            <h1 className="text-[32px] font-semibold text-main mb-10 tracking-tight text-center">
              企业智能问答，从这里开始
            </h1>
            <SuggestionPills onSelect={handleSend} />
          </div>
        ) : (
          <div className="h-full overflow-y-auto">
            <div className="mx-auto max-w-[860px] px-6 py-5">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}
      </div>

      <ChatInput onSend={handleSend} onStop={stopStreaming} isLoading={isLoading} />
    </div>
  );
}
