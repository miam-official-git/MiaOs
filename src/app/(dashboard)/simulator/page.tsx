"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  Bot,
  User,
  RotateCcw,
  Phone,
  MessageCircle,
  Loader2,
} from "lucide-react";

interface BotButton {
  id: string;
  label: string;
}

interface ChatMessage {
  id: string;
  direction: "inbound" | "outbound";
  content: string;
  sender_name: string | null;
  created_at: string;
  buttons?: BotButton[] | null;
}

function generateChatId() {
  const num = `97205${Math.floor(1000000 + Math.random() * 9000000)}`;
  return `${num}@c.us`;
}

export default function SimulatorPage() {
  const [chatId, setChatId] = useState(() => generateChatId());
  const [senderName, setSenderName] = useState("לקוח לדוגמה");
  const [inputMessage, setInputMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [contactInfo, setContactInfo] = useState<{
    id: string;
    name: string;
    phone: string;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  function resetChat() {
    setChatId(generateChatId());
    setMessages([]);
    setContactInfo(null);
    setInputMessage("");
    setSenderName("לקוח לדוגמה");
  }

  async function sendMessage(text?: string, displayLabel?: string) {
    const msgText = (text ?? inputMessage).trim();
    if (!msgText || sending) return;

    setInputMessage("");
    setSending(true);

    const userMsg: ChatMessage = {
      id: `local-${Date.now()}`,
      direction: "inbound",
      content: displayLabel || msgText,
      sender_name: senderName,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch("/api/simulator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msgText,
          chatId,
          senderName,
        }),
      });

      const data = await res.json();

      if (data.contact) {
        setContactInfo(data.contact);
      }

      if (data.botResponses?.length) {
        const botMsgs: ChatMessage[] = data.botResponses.map(
          (resp: { text: string; buttons?: BotButton[] | null }, i: number) => ({
            id: `bot-${Date.now()}-${i}`,
            direction: "outbound" as const,
            content: resp.text,
            sender_name: "Mia-OS Bot",
            created_at: new Date().toISOString(),
            buttons: resp.buttons,
          }),
        );
        setMessages((prev) => [...prev, ...botMsgs]);
      }
    } catch {
      const errMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        direction: "outbound",
        content: "שגיאה בשרת. בדוק את הקונסול.",
        sender_name: "System",
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setSending(false);
    }
  }

  function handleButtonClick(btn: BotButton) {
    sendMessage(btn.id, btn.label);
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString("he-IL", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const lastBotMsgIndex = messages.reduce(
    (acc, msg, i) => (msg.direction === "outbound" && msg.buttons?.length ? i : acc),
    -1,
  );

  return (
    <div className="mx-auto flex h-[calc(100vh-80px)] max-w-2xl flex-col gap-4 p-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2 text-foreground">
            <MessageCircle className="size-5" />
            סימולטור Triage Bot
          </h1>
          <p className="text-sm text-zinc-400">
            בדוק את הבוט בלי חיבור ל-Green API
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={resetChat}>
          <RotateCcw className="size-4" />
          שיחה חדשה
        </Button>
      </div>

      {/* Config */}
      <Card className="p-3 bg-zinc-900 border-zinc-700">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="text-xs text-zinc-400 mb-1 block">שם השולח</label>
            <Input
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              className="h-8 text-sm bg-zinc-800 border-zinc-600 text-white"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-zinc-400 mb-1 block">Chat ID</label>
            <Input
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              className="h-8 text-sm font-mono text-xs bg-zinc-800 border-zinc-600 text-white"
              dir="ltr"
            />
          </div>
          {contactInfo && (
            <div className="text-xs">
              <Badge variant="outline" className="gap-1">
                <Phone className="size-3" />
                {contactInfo.phone}
              </Badge>
            </div>
          )}
        </div>
      </Card>

      {/* Chat area */}
      <Card className="flex-1 overflow-hidden flex flex-col bg-[#0b141a] text-white">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="flex h-full items-center justify-center text-zinc-400 text-sm">
              <div className="text-center space-y-2">
                <Bot className="size-10 mx-auto opacity-50" />
                <p>שלח הודעה כדי להתחיל</p>
                <p className="text-xs text-zinc-500">
                  נסה &quot;היי&quot; כלקוח חדש
                </p>
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={msg.id}>
              <div
                className={`flex ${msg.direction === "inbound" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                    msg.direction === "inbound"
                      ? "bg-emerald-800/60 text-emerald-50"
                      : "bg-zinc-800 text-zinc-100"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {msg.direction === "inbound" ? (
                      <User className="size-3 opacity-60" />
                    ) : (
                      <Bot className="size-3 opacity-60" />
                    )}
                    <span className="text-[10px] font-medium opacity-60">
                      {msg.direction === "inbound"
                        ? msg.sender_name || "לקוח"
                        : "Mia-OS Bot"}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                  </p>
                  <span className="text-[10px] opacity-40 mt-1 block text-left" dir="ltr">
                    {formatTime(msg.created_at)}
                  </span>
                </div>
              </div>

              {/* Render buttons only for the last bot message that has buttons */}
              {msg.buttons?.length && idx === lastBotMsgIndex ? (
                <div className="flex flex-wrap gap-2 mt-2 justify-start" dir="ltr">
                  {msg.buttons.map((btn) => (
                    <button
                      key={btn.id}
                      onClick={() => handleButtonClick(btn)}
                      disabled={sending}
                      className="rounded-full border border-emerald-600/60 bg-emerald-900/30 px-4 py-1.5 text-sm text-emerald-200 hover:bg-emerald-800/50 transition-colors disabled:opacity-40"
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-zinc-700 p-3 flex gap-2">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="כתוב הודעה..."
            className="flex-1 bg-zinc-800 border-zinc-600 text-white placeholder:text-zinc-400"
            disabled={sending}
          />
          <Button
            onClick={() => sendMessage()}
            disabled={sending || !inputMessage.trim()}
            size="icon"
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {sending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
