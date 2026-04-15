import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Event } from "@shared/types";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/components/ui/select";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import dayjs from "dayjs";
import { api } from "@/shared/lib/api";
import { useTransferToEvent } from "../hooks/useCashboxTransfers";

interface TransferToEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransferToEventDialog({ open, onOpenChange }: TransferToEventDialogProps) {
  const [eventId, setEventId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const { data: events } = useQuery<Event[]>({
    queryKey: ["/api/events"],
    queryFn: () => api.get<Event[]>("/api/events"),
    enabled: open,
  });

  const upcomingEvents = (events || []).filter(e =>
    dayjs(e.eventDate).isAfter(dayjs().subtract(1, 'day')) &&
    e.status !== 'CANCELLED'
  );

  const transferMutation = useTransferToEvent();

  const handleSubmit = () => {
    if (!eventId || !amount || parseFloat(amount) <= 0) return;
    transferMutation.mutate(
      {
        eventId: parseInt(eventId),
        amount: parseFloat(amount),
        description: description || undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setEventId("");
          setAmount("");
          setDescription("");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Převod na event</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Event</Label>
            <Select value={eventId} onValueChange={setEventId}>
              <SelectTrigger>
                <SelectValue placeholder="Vyberte event" />
              </SelectTrigger>
              <SelectContent>
                {upcomingEvents.map((e) => (
                  <SelectItem key={e.id} value={String(e.id)}>
                    {e.name} — {dayjs(e.eventDate).format("DD.MM.YYYY")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Částka</Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="50000"
            />
          </div>
          <div>
            <Label>Popis (volitelné)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Popis převodu"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Zrušit
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!eventId || !amount || parseFloat(amount) <= 0 || transferMutation.isPending}
          >
            {transferMutation.isPending ? "Převádím..." : "Převést"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
