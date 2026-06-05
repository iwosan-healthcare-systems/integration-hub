import { useState, useRef, useEffect, Fragment } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import iwosanIcon from "@/assets/iwosan_icon.webp";

function MessageContent({ text }: { text: string }) {
  // Split on **bold** markers, then handle line breaks within each segment
  const segments = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {segments.map((seg, i) => {
        if (seg.startsWith("**") && seg.endsWith("**") && seg.length > 4) {
          return <strong key={i} className="font-semibold">{seg.slice(2, -2)}</strong>;
        }
        return seg.split("\n").map((line, j, arr) => (
          <Fragment key={`${i}-${j}`}>
            {line}
            {j < arr.length - 1 && <br />}
          </Fragment>
        ));
      })}
    </>
  );
}

type Message = {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
};

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

const WELCOME: Message = {
  role: "assistant",
  content:
    "Hi! I'm Iwo, your Iwosan Innovation Hub assistant. I can help you find information about our hospitals, services, leadership, history, and more. How can I help you today?",
};

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 150);
  }, [isOpen]);

  // Refocus input as soon as the response finishes streaming
  useEffect(() => {
    if (!isStreaming && isOpen) inputRef.current?.focus();
  }, [isStreaming, isOpen]);

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 96) + "px";
  };

  async function sendMessage() {
    if (!input.trim() || isStreaming) return;

    const userMsg: Message = { role: "user", content: input.trim() };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setIsStreaming(true);

    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "", streaming: true },
    ]);

    try {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          messages: history.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`${response.status}: ${text || response.statusText}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") break;
          try {
            const parsed = JSON.parse(raw);
            if (parsed.text) {
              setMessages((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last?.streaming) {
                  next[next.length - 1] = {
                    ...last,
                    content: last.content + parsed.text,
                  };
                }
                return next;
              });
            }
            if (parsed.error) throw new Error(parsed.error);
          } catch {
            /* skip malformed lines */
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      const isNotFound = msg.startsWith("404");
      const isUnconfigured = msg.includes("not configured");
      const errorText = isNotFound
        ? "The AI assistant is not yet available. Please check back soon."
        : isUnconfigured
        ? "The AI assistant hasn't been configured yet. Please check back soon."
        : "Sorry, I'm having trouble connecting right now. Please try again or reach us at info@iwosanhealth.com.";

      console.error("[Iwo chat error]", msg);

      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.streaming) {
          next[next.length - 1] = {
            role: "assistant",
            content: errorText,
          };
        }
        return next;
      });
    } finally {
      setMessages((prev) => prev.map((m) => ({ ...m, streaming: false })));
      setIsStreaming(false);
    }
  }

  return (
    <>
      {/* Floating toggle button */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-label={isOpen ? "Close assistant" : "Open AI assistant"}
        className={`fixed bottom-6 right-20 z-50 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 ${
          isOpen
            ? "bg-primary hover:bg-primary/90 scale-90"
            : "bg-accent hover:scale-110"
        }`}
      >
        {isOpen ? (
          <X className="h-5 w-5 text-primary-foreground" />
        ) : (
          <MessageCircle className="h-6 w-6 text-accent-foreground" />
        )}
      </button>

      {/* Chat panel */}
      <div
        className={`fixed bottom-24 right-4 z-50 w-80 sm:w-[360px] bg-background rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right ${
          isOpen
            ? "opacity-100 scale-100 pointer-events-auto"
            : "opacity-0 scale-95 pointer-events-none"
        }`}
        style={{ height: 480 }}
      >
        {/* Header */}
        <div className="bg-primary px-4 py-3 flex items-center gap-3 shrink-0">
          <div className="relative shrink-0">
            <img
              src={iwosanIcon}
              alt="Iwo"
              className="w-9 h-9 rounded-full object-contain bg-white p-1"
            />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-primary-foreground font-semibold text-sm leading-none">
              Iwo
            </p>
            <p className="text-primary-foreground/50 text-xs mt-0.5">
              Iwosan AI Assistant · Online
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Close chat"
            className="text-primary-foreground/40 hover:text-primary-foreground/80 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`rounded-2xl px-4 py-2.5 max-w-[85%] text-sm font-sans leading-relaxed ${
                  msg.role === "user"
                    ? "bg-accent text-accent-foreground rounded-tr-sm"
                    : "bg-muted text-foreground rounded-tl-sm"
                }`}
              >
                {msg.content && (
                  <>
                    {msg.role === "assistant" ? (
                      <MessageContent text={msg.content} />
                    ) : (
                      msg.content
                    )}
                    {msg.streaming && (
                      <span className="inline-block w-0.5 h-3.5 bg-current ml-0.5 animate-pulse align-text-bottom" />
                    )}
                  </>
                )}
                {!msg.content && msg.streaming && (
                  <span className="flex items-center gap-1 py-0.5">
                    {[0, 150, 300].map((delay) => (
                      <span
                        key={delay}
                        className="w-1.5 h-1.5 bg-current rounded-full animate-bounce"
                        style={{ animationDelay: `${delay}ms` }}
                      />
                    ))}
                  </span>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t border-border shrink-0">
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              rows={1}
              disabled={isStreaming}
              placeholder="Ask about Iwosan..."
              onChange={(e) => {
                setInput(e.target.value);
                autoResize(e.target);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              className="flex-1 resize-none rounded-xl border border-border px-3 py-2 text-sm font-sans placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent bg-background disabled:opacity-50 min-h-[38px] max-h-24"
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={!input.trim() || isStreaming}
              aria-label="Send message"
              className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center shrink-0 disabled:opacity-40 hover:opacity-80 transition-opacity"
            >
              {isStreaming ? (
                <Loader2 className="h-4 w-4 text-accent-foreground animate-spin" />
              ) : (
                <Send className="h-4 w-4 text-accent-foreground" />
              )}
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground/40 text-center mt-2 font-sans">
            Powered by Iwosan Healthcare Systems · Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </>
  );
}
