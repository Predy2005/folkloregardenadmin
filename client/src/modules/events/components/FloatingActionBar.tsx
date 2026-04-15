import { useState } from "react";
import { StickyNote, Loader2, Save } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/shared/components/ui/sheet";
import { useEventNotes } from "../contexts/EventNotesContext";

type PanelType = "notes" | null;

export default function FloatingActionBar() {
  const [activePanel, setActivePanel] = useState<PanelType>(null);

  const togglePanel = (panel: PanelType) => {
    setActivePanel((prev) => (prev === panel ? null : panel));
  };

  return (
    <>
      {/* Floating bar — fixed on right edge */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-1 p-1 bg-card border border-r-0 rounded-l-lg shadow-lg">
        <NotesButton isActive={activePanel === "notes"} onClick={() => togglePanel("notes")} />
        {/* Future: add more icons here */}
      </div>

      {/* Panels */}
      <NotesPanel isOpen={activePanel === "notes"} onClose={() => setActivePanel(null)} />
    </>
  );
}

// ── Notes button with dirty indicator ──
function NotesButton({ isActive, onClick }: { isActive: boolean; onClick: () => void }) {
  const { isDirty } = useEventNotes();

  return (
    <div className="relative">
      <Button
        variant={isActive ? "default" : "ghost"}
        size="icon"
        className="h-10 w-10"
        onClick={onClick}
        title="Poznámky"
      >
        <StickyNote className="h-5 w-5" />
      </Button>
      {isDirty && (
        <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-destructive" />
      )}
    </div>
  );
}

// ── Notes sheet panel ──
function NotesPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { notes, updateNote, isDirty, isSaving, lastSaved, saveNotes } = useEventNotes();

  const formatTime = (date: Date | null) => {
    if (!date) return null;
    return date.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-[360px] sm:max-w-[360px]">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <StickyNote className="h-4 w-4" />
              Poznámky
            </span>
            <div className="flex items-center gap-2">
              {isSaving && (
                <Badge variant="secondary" className="text-xs">
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  Ukládám
                </Badge>
              )}
              {!isSaving && lastSaved && (
                <Badge variant="outline" className="text-xs">
                  {formatTime(lastSaved)}
                </Badge>
              )}
              {isDirty && !isSaving && (
                <Button size="sm" variant="ghost" onClick={saveNotes}>
                  <Save className="h-3 w-3" />
                </Button>
              )}
            </div>
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="fab-notesStaff" className="text-sm font-medium">
              Pro personál
            </Label>
            <Textarea
              id="fab-notesStaff"
              value={notes.notesStaff}
              onChange={(e) => updateNote("notesStaff", e.target.value)}
              placeholder="Poznámky viditelné pro personál..."
              className="min-h-[100px] resize-y text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fab-notesInternal" className="text-sm font-medium">
              Interní poznámky
            </Label>
            <Textarea
              id="fab-notesInternal"
              value={notes.notesInternal}
              onChange={(e) => updateNote("notesInternal", e.target.value)}
              placeholder="Interní poznámky (pouze pro management)..."
              className="min-h-[100px] resize-y text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fab-specialRequirements" className="text-sm font-medium">
              Speciální požadavky
            </Label>
            <Textarea
              id="fab-specialRequirements"
              value={notes.specialRequirements}
              onChange={(e) => updateNote("specialRequirements", e.target.value)}
              placeholder="Dietní omezení, přání hostů..."
              className="min-h-[100px] resize-y text-sm"
            />
          </div>

          <div className="text-xs text-muted-foreground pt-2 border-t">
            Poznámky se automaticky ukládají při psaní.
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
