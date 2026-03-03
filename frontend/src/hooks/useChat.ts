"use client";

import { useEffect, useRef, useCallback } from "react";
import { useChatStore } from "@/stores/chatStore";

/**
 * Custom hook that wraps the chat store for component-level usage.
 * Provides auto-scroll behavior and convenience methods.
 */
export function useChat() {
  const {
    sessions,
    currentSessionId,
    messages,
    isLoading,
    loadSessions,
    createSession,
    setCurrentSession,
    sendMessage,
    stopStreaming,
    clearMessages,
  } = useChatStore();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isInitialized = useRef(false);

  // Load sessions on mount
  useEffect(() => {
    if (!isInitialized.current) {
      isInitialized.current = true;
      loadSessions();
    }
  }, [loadSessions]);

  // Auto-scroll to bottom when messages change
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Send a message, creating a session if needed
  const handleSend = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || isLoading) return;
      await sendMessage(trimmed);
    },
    [isLoading, sendMessage]
  );

  // Start a new chat session
  const handleNewChat = useCallback(async () => {
    clearMessages();
    // Will create a new session when the first message is sent
    useChatStore.setState({ currentSessionId: null });
  }, [clearMessages]);

  return {
    sessions,
    currentSessionId,
    messages,
    isLoading,
    messagesEndRef,
    handleSend,
    stopStreaming,
    handleNewChat,
    setCurrentSession,
    createSession,
  };
}
