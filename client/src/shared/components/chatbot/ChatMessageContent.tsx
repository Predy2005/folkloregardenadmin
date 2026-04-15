import { ExternalLink } from "lucide-react";

interface MessagePart {
  type: "text" | "link";
  content: string;
  url?: string;
}

// Parse links from AI response [text](url)
function parseMessageContent(
  content: string
): { text: string; parts: MessagePart[] } {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts: MessagePart[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(content)) !== null) {
    // Text before the link
    if (match.index > lastIndex) {
      parts.push({ type: "text", content: content.slice(lastIndex, match.index) });
    }
    parts.push({ type: "link", content: match[1], url: match[2] });
    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < content.length) {
    parts.push({ type: "text", content: content.slice(lastIndex) });
  }

  return { text: content, parts };
}

export function ChatMessageContent({ content }: { content: string }) {
  const { parts } = parseMessageContent(content);

  if (parts.length === 0) return <>{content}</>;

  return (
    <>
      {parts.map((part, i) => {
        if (part.type === "link" && part.url) {
          return (
            <a
              key={i}
              href={part.url}
              className="text-primary underline underline-offset-2 hover:text-primary/80 inline-flex items-center gap-0.5"
              onClick={(e) => {
                e.preventDefault();
                window.location.href = part.url!;
              }}
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
