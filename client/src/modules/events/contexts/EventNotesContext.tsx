import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/shared/lib/queryClient";
import { api } from "@/shared/lib/api";
import { useToast } from "@/shared/hooks/use-toast";

interface NotesState {
  notesInternal: string;
  notesStaff: string;
  specialRequirements: string;
}

interface EventNotesContextType {
  notes: NotesState;
  updateNote: (field: keyof NotesState, value: string) => void;
  isDirty: boolean;
  isSaving: boolean;
  lastSaved: Date | null;
  saveNotes: () => void;
}

const EventNotesContext = createContext<EventNotesContextType | null>(null);

interface EventNotesProviderProps {
  eventId: number;
  initialNotes: NotesState;
  children: React.ReactNode;
}

export function EventNotesProvider({ eventId, initialNotes, children }: EventNotesProviderProps) {
  const { toast } = useToast();
  const [notes, setNotes] = useState<NotesState>(initialNotes);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Update initial notes when they change (e.g., after refetch)
  useEffect(() => {
    setNotes(initialNotes);
    setIsDirty(false);
  }, [initialNotes.notesInternal, initialNotes.notesStaff, initialNotes.specialRequirements]);

  const saveMutation = useMutation({
    mutationFn: async (notesData: NotesState) => {
      return await api.put(`/api/events/${eventId}`, notesData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      setLastSaved(new Date());
      setIsDirty(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba při ukládání poznámek",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const saveNotes = useCallback(() => {
    if (isDirty) {
      saveMutation.mutate(notes);
    }
  }, [isDirty, notes, saveMutation]);

  const updateNote = useCallback((field: keyof NotesState, value: string) => {
    setNotes((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);

    // Debounce auto-save (500ms)
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      saveMutation.mutate({ ...notes, [field]: value });
    }, 500);
  }, [notes, saveMutation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <EventNotesContext.Provider
      value={{
        notes,
        updateNote,
        isDirty,
        isSaving: saveMutation.isPending,
        lastSaved,
        saveNotes,
      }}
    >
      {children}
    </EventNotesContext.Provider>
  );
}

export function useEventNotes() {
  const context = useContext(EventNotesContext);
  if (!context) {
    throw new Error("useEventNotes must be used within an EventNotesProvider");
  }
  return context;
}

export { EventNotesContext };
