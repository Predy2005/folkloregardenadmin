import { useState, useRef, useEffect, useCallback } from "react";
import {
  MessageCircleQuestion,
  X,
  Loader2,
  Trash2,
  Search,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import {
  type ChatMessage,
  type ChatLink,
  detectSearchIntent,
  fetchRagContext,
  chatCompletion,
} from "./chatbot/chatbotService";
import { ChatMessageContent } from "./chatbot/ChatMessageContent";
import { ChatInput } from "./chatbot/ChatInput";
import { ChatSuggestions } from "./chatbot/ChatSuggestions";

export function HelpChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        'Ahoj! Jsem pomocník pro navigaci v systému Folklore Garden Admin.\n\nMůžu ti pomoct s:\n- Navigací v systému (kde co najdeš)\n- Vysvětlením funkcí\n- Hledáním konkrétních dat (rezervací, akcí, kontaktů...)\n\nZkus třeba: "Najdi rezervace Novák" nebo "Kde nastavím pokladnu?"',
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const processAndSend = useCallback(
    async (text: string, currentMessages: ChatMessage[]) => {
      setIsLoading(true);

      try {
        // Step 1: Detect if we need to search for data (RAG)
        const { entities, searchTerms } = detectSearchIntent(text);
        let ragContext = "";
        let ragLinks: ChatLink[] = [];

        if (entities.length > 0) {
          setIsSearching(true);
          const rag = await fetchRagContext(entities, searchTerms);
          ragContext = rag.context;
          ragLinks = rag.links;
          setIsSearching(false);
        }

        // Step 2: Build messages for AI with RAG context injected
        const contextMessages = currentMessages.slice(-10).map((m) => ({
          role: m.role,
          content: m.content,
        }));

        // If we have RAG data, append it to the user message
        const lastUserMsg = contextMessages[contextMessages.length - 1];
        if (ragContext && lastUserMsg) {
          lastUserMsg.content =
            lastUserMsg.content +
            "\n\n--- VÝSLEDKY HLEDÁNÍ V SYSTÉMU (použij je ve své odpovědi, uveď odkazy) ---" +
            ragContext;
        }

        // Step 3: Get AI response
        const response = await chatCompletion(contextMessages);

        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: response, links: ragLinks },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "Omlouvám se, nepodařilo se mi spojit s AI serverem. Zkuste to prosím znovu za chvíli.",
          },
        ]);
      } finally {
        setIsLoading(false);
        setIsSearching(false);
      }
    },
    []
  );

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");

    await processAndSend(text, updatedMessages);
  }, [input, isLoading, messages, processAndSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage]
  );

  const clearChat = useCallback(() => {
    setMessages([
      {
        role: "assistant",
        content: "Chat vymazán. Jak ti mohu pomoci?",
      },
    ]);
  }, []);

  const handleSuggestion = useCallback(
    (text: string) => {
      const userMsg: ChatMessage = { role: "user", content: text };
      const updatedMessages = [...messages, userMsg];
      setMessages(updatedMessages);
      setInput("");
      processAndSend(text, updatedMessages);
    },
    [messages, processAndSend]
  );

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex items-center justify-center",
          "w-14 h-14 rounded-full shadow-lg transition-all duration-200",
          "hover:scale-105 active:scale-95",
          isOpen
            ? "bg-muted text-muted-foreground"
            : "bg-primary text-primary-foreground"
        )}
        title="Nápověda - AI asistent"
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <MessageCircleQuestion className="w-6 h-6" />
        )}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div
          className={cn(
            "fixed bottom-24 right-6 z-50",
            "w-[420px] max-w-[calc(100vw-2rem)] h-[580px] max-h-[calc(100vh-8rem)]",
            "bg-card border border-border rounded-xl shadow-2xl",
            "flex flex-col overflow-hidden",
            "animate-in slide-in-from-bottom-4 fade-in duration-200"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/50">
            <div className="flex items-center gap-2">
              <MessageCircleQuestion className="w-5 h-5 text-primary" />
              <div>
                <h3 className="text-sm font-semibold">Pomocník</h3>
                <p className="text-xs text-muted-foreground">
                  Navigace a vyhledávání v systému
                </p>
              </div>
            </div>
            <button
              onClick={clearChat}
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Vymazat chat"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "flex",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] px-3 py-2 rounded-lg text-sm whitespace-pre-wrap",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  )}
                >
                  {msg.role === "assistant" ? (
                    <ChatMessageContent content={msg.content} />
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}

            {/* Loading states */}
            {(isLoading || isSearching) && (
              <div className="flex justify-start">
                <div className="bg-muted px-3 py-2 rounded-lg rounded-bl-sm flex items-center gap-2">
                  {isSearching ? (
                    <>
                      <Search className="w-4 h-4 animate-pulse text-primary" />
                      <span className="text-xs text-muted-foreground">
                        Hledám v systému...
                      </span>
                    </>
                  ) : (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              </div>
            )}

            {/* Suggestions - only show at start */}
            {messages.length === 1 && !isLoading && (
              <ChatSuggestions onSelect={handleSuggestion} />
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <ChatInput
            input={input}
            setInput={setInput}
            isLoading={isLoading}
            isOpen={isOpen}
            onSend={sendMessage}
            onKeyDown={handleKeyDown}
          />
        </div>
      )}
    </>
  );
}
