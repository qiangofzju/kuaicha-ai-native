"use client";

import type { ChatMessage } from "@/types/chat";
import { Icons } from "@/components/shared/Icons";
import { RiskCard } from "./RiskCard";
import { ActionButtons } from "./ActionButtons";

interface MessageBubbleProps {
  message: ChatMessage;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderMarkdown(content: string): string {
  const escaped = escapeHtml(content);
  const codeBlocks: string[] = [];

  let text = escaped.replace(/```([\s\S]*?)```/g, (_match, code: string) => {
    const index = codeBlocks.push(code.trim()) - 1;
    return `@@CODE_BLOCK_${index}@@`;
  });

  text = text
    .replace(/^###\s+(.+)$/gm, "<h3>$1</h3>")
    .replace(/^##\s+(.+)$/gm, "<h2>$1</h2>")
    .replace(/^#\s+(.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');

  const lines = text.split(/\r?\n/);
  const html: string[] = [];
  let inList = false;

  for (const line of lines) {
    const trimmed = line.trim();
    const isListItem = /^[-*]\s+/.test(trimmed);

    if (isListItem) {
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      html.push(`<li>${trimmed.replace(/^[-*]\s+/, "")}</li>`);
      continue;
    }

    if (inList) {
      html.push("</ul>");
      inList = false;
    }

    if (!trimmed) {
      html.push("<br />");
      continue;
    }

    if (/^<h[1-3]>/.test(trimmed)) {
      html.push(trimmed);
      continue;
    }

    html.push(`<p>${trimmed}</p>`);
  }

  if (inList) {
    html.push("</ul>");
  }

  return html
    .join("")
    .replace(/@@CODE_BLOCK_(\d+)@@/g, (_match, idx: string) => {
      const code = codeBlocks[Number(idx)] || "";
      return `<pre><code>${code}</code></pre>`;
    });
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const renderedHtml = !isUser && message.content ? renderMarkdown(message.content) : "";

  if (isUser) {
    return (
      <div className="flex justify-end mb-4 animate-fadeIn">
        <div
          className="max-w-[75%] px-[18px] py-3 rounded-2xl rounded-br-[6px] border shadow-[0_10px_24px_rgba(16,22,34,0.24)]"
          style={{
            background: "linear-gradient(145deg, rgba(127,149,184,0.2), rgba(127,149,184,0.08))",
            borderColor: "rgba(127,149,184,0.28)",
          }}
        >
          <p className="text-[14px] text-white/90 leading-relaxed whitespace-pre-wrap break-words">
            {message.content}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 mb-5 animate-fadeIn">
      <div className="shrink-0 mt-0.5">
        <div
          className="w-8 h-8 rounded-[10px] flex items-center justify-center border"
          style={{
            background: "linear-gradient(135deg, rgba(127,149,184,0.88), rgba(127,149,184,0.72))",
            borderColor: "rgba(127,149,184,0.4)",
            boxShadow: "0 8px 22px rgba(127,149,184,0.2)",
          }}
        >
          <Icons.Sparkle className="text-white" size={14} />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="rounded-2xl border border-white/[0.08] bg-[linear-gradient(145deg,rgba(255,255,255,0.028),rgba(255,255,255,0.01))] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_10px_24px_rgba(0,0,0,0.2)] px-4 py-3">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <div className="text-[11px] text-white/45 font-medium">快查 AI</div>
              {message.streamStopped && !message.isStreaming && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-white/35 border border-white/[0.08]">
                  已停止
                </span>
              )}
            </div>
            {message.isStreaming && (
              <span className="inline-flex items-center gap-1.5 text-[10px] text-chat/85">
                <span className="w-1.5 h-1.5 rounded-full bg-chat animate-pulse" />
                生成中
              </span>
            )}
          </div>

          {message.content && (
            <div
              className="chat-markdown text-[14px] text-white/85 leading-[1.72] break-words"
              dangerouslySetInnerHTML={{ __html: renderedHtml }}
            />
          )}

          {message.isStreaming && message.content && (
            <div className="mt-2 flex justify-end">
              <span className="inline-block w-[2px] h-[14px] bg-chat rounded-sm animate-pulse" />
            </div>
          )}

          {message.isStreaming && !message.content && (
            <div className="flex items-center gap-1.5 py-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-chat/60 animate-dotPulse"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
          )}
        </div>

        {message.details && message.details.length > 0 && (
          <RiskCard details={message.details} />
        )}

        {message.actions && message.actions.length > 0 && !message.isStreaming && (
          <ActionButtons actions={message.actions} />
        )}
      </div>
    </div>
  );
}
