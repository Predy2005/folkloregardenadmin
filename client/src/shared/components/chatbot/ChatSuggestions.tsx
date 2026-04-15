const SUGGESTIONS = [
  "Kde založím pokladnu?",
  "Najdi rezervace na červen",
  "Jaké akce máme naplánované?",
  "Najdi kontakt Novák",
];

interface ChatSuggestionsProps {
  onSelect: (text: string) => void;
}

export function ChatSuggestions({ onSelect }: ChatSuggestionsProps) {
  return (
    <div className="flex flex-wrap gap-1.5 pt-2">
      {SUGGESTIONS.map((s) => (
        <button
          key={s}
          onClick={() => onSelect(s)}
          className="text-xs px-2.5 py-1.5 rounded-full border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          {s}
        </button>
      ))}
    </div>
  );
}
