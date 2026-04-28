const SUGGESTIONS = [
  "Najdi rezervace Novák",
  "Jaké akce máme tento měsíc?",
  "Kde nastavím pokladnu?",
  "Rozsaď hosty této akce",
  "Navrhni parametry nové folklore show pro 80 lidí",
  "Založ rezervaci 20.6.2026, Jan Svoboda, 4 osoby, 777123456",
  "Přidej kontakt Petr Novák, petr@example.cz",
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
