import { useState } from "react";
import { useEventNotes } from "../contexts/EventNotesContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Textarea } from "@/shared/components/ui/textarea";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { Badge } from "@/shared/components/ui/badge";
import { ChevronLeft, ChevronRight, Loader2, Save, StickyNote } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export default function FloatingNotesPanel() {
  const { notes, updateNote, isDirty, isSaving, lastSaved, saveNotes } = useEventNotes();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const formatLastSaved = (date: Date | null) => {
    if (!date) return null;
    return date.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" });
  };

  if (isCollapsed) {
    return (
      <div className="sticky top-20 h-fit">
        <Button
          variant="outline"
          size="icon"
          className="h-12 w-12"
          onClick={() => setIsCollapsed(false)}
          title="Rozbalit poznámky"
        >
          <StickyNote className="h-5 w-5" />
        </Button>
        {isDirty && (
          <Badge variant="destructive" className="absolute -top-1 -right-1 h-3 w-3 p-0" />
        )}
      </div>
    );
  }

  return (
    <div className="sticky top-20 h-fit w-80 shrink-0">
      <Card className="shadow-lg border-2">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <StickyNote className="h-4 w-4" />
              Poznámky
            </CardTitle>
            <div className="flex items-center gap-2">
              {isSaving && (
                <Badge variant="secondary" className="text-xs">
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  Ukládám...
                </Badge>
              )}
              {!isSaving && lastSaved && (
                <Badge variant="outline" className="text-xs">
                  Uloženo {formatLastSaved(lastSaved)}
                </Badge>
              )}
              {isDirty && !isSaving && (
                <Button size="sm" variant="ghost" onClick={saveNotes}>
                  <Save className="h-3 w-3" />
                </Button>
              )}
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={() => setIsCollapsed(true)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="notesStaff" className="text-sm font-medium">
              Pro personál
            </Label>
            <Textarea
              id="notesStaff"
              value={notes.notesStaff}
              onChange={(e) => updateNote("notesStaff", e.target.value)}
              placeholder="Poznámky viditelné pro personál..."
              className="min-h-[80px] resize-none text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notesInternal" className="text-sm font-medium">
              Interní poznámky
            </Label>
            <Textarea
              id="notesInternal"
              value={notes.notesInternal}
              onChange={(e) => updateNote("notesInternal", e.target.value)}
              placeholder="Interní poznámky (pouze pro management)..."
              className="min-h-[80px] resize-none text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="specialRequirements" className="text-sm font-medium">
              Speciální požadavky
            </Label>
            <Textarea
              id="specialRequirements"
              value={notes.specialRequirements}
              onChange={(e) => updateNote("specialRequirements", e.target.value)}
              placeholder="Dietní omezení, přání hostů..."
              className="min-h-[80px] resize-none text-sm"
            />
          </div>

          <div className="text-xs text-muted-foreground pt-2 border-t">
            Poznámky se automaticky ukládají při psaní.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
