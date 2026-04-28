import { ExternalLink } from "lucide-react";
import { useLocation } from "wouter";

interface MessagePart {
  type: "text" | "link";
  content: string;
  url?: string;
}

function parseMessageContent(content: string): { parts: MessagePart[] } {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts: MessagePart[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", content: content.slice(lastIndex, match.index) });
    }
    parts.push({ type: "link", content: match[1], url: match[2].trim() });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) {
    parts.push({ type: "text", content: content.slice(lastIndex) });
  }
  return { parts };
}

export function ChatMessageContent({ content }: { content: string }) {
  const [, setLocation] = useLocation();
  const { parts } = parseMessageContent(content);
  if (parts.length === 0) return <>{content}</>;

  return (
    <>
      {parts.map((part, i) => {
        if (part.type === "link" && part.url) {
          const isInternal = part.url.startsWith("/");
          return (
            <a
              key={i}
              href={part.url}
              className="text-primary underline underline-offset-2 hover:text-primary/80 inline-flex items-center gap-0.5"
              onClick={(e) => {
                if (isInternal) {
                  e.preventDefault();
                  setLocation(part.url!);
                }
              }}
              target={isInternal ? undefined : "_blank"}
              rel={isInternal ? undefined : "noopener noreferrer"}
            >
              {part.content}
              <ExternalLink className="w-3 h-3 inline" />
            </a>
          );
        }
        return <span key={i}>{part.content}</span>;
      })}
    </>
  );
}
