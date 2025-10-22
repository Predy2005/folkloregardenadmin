import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { api } from "@/lib/api";
import type { CommissionLog, Partner } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, DollarSign, CheckCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import dayjs from "dayjs";
import { useToast } from "@/hooks/use-toast";

export default function CommissionLogs() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();

  const { data: logs, isLoading } = useQuery<CommissionLog[]>({
    queryKey: ["/api/commission-logs"],
  });

  const { data: partners } = useQuery<Partner[]>({
    queryKey: ["/api/partners"],
  });

  const markAsPaidMutation = useMutation({
    mutationFn: async (id: number) => {
      return await api.put(`/api/commission-logs/${id}/mark-paid`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/commission-logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/partners"] });
      toast({
        title: "Úspěch",
        description: "Provize označena jako zaplacená",
      });
    },
    onError: () => {
      toast({
        title: "Chyba",
        description: "Nepodařilo se označit provizi jako zaplacenou",
        variant: "destructive",
      });
    },
  });

  const filteredLogs = logs?.filter((log) => {
    const matchesSearch = log.partner?.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "paid" && log.isPaid) ||
      (statusFilter === "unpaid" && !log.isPaid);
    return matchesSearch && matchesStatus;
  });

  const totalUnpaid = logs
    ?.filter((log) => !log.isPaid)
    .reduce((sum, log) => sum + log.commissionAmount, 0) || 0;

  const totalPaid = logs
    ?.filter((log) => log.isPaid)
    .reduce((sum, log) => sum + log.commissionAmount, 0) || 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Provizní logy</h1>
          <p className="text-muted-foreground">Záznamy o provizích a výplatách</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Nezaplacené provize</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {totalUnpaid.toLocaleString()} Kč
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Zaplacené provize</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {totalPaid.toLocaleString()} Kč
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Celkem</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(totalUnpaid + totalPaid).toLocaleString()} Kč
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Provizní logy
              </CardTitle>
              <CardDescription>
                Celkem: {logs?.length || 0} záznamů
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48" data-testid="select-status-filter">
                  <SelectValue placeholder="Všechny stavy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Všechny stavy</SelectItem>
                  <SelectItem value="unpaid">Nezaplacené</SelectItem>
                  <SelectItem value="paid">Zaplacené</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Hledat partnera..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 w-64"
                  data-testid="input-search-logs"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Načítání...</div>
          ) : filteredLogs && filteredLogs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead>Partner</TableHead>
                  <TableHead className="text-right">Částka</TableHead>
                  <TableHead className="text-right">Provize</TableHead>
                  <TableHead>Voucher</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Akce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id} data-testid={`row-log-${log.id}`}>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">
                          {dayjs(log.createdAt).format("DD.MM.YYYY")}
                        </div>
                        <div className="text-muted-foreground">
                          {dayjs(log.createdAt).format("HH:mm")}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {log.partner?.name || `ID: ${log.partnerId}`}
                    </TableCell>
                    <TableCell className="text-right">
                      {log.amount.toLocaleString()} Kč
                    </TableCell>
                    <TableCell className="text-right font-medium text-primary">
                      {log.commissionAmount.toLocaleString()} Kč
                    </TableCell>
                    <TableCell>
                      {log.voucher?.code || "-"}
                    </TableCell>
                    <TableCell>
                      {log.isPaid ? (
                        <Badge variant="default">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Zaplaceno
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <XCircle className="w-3 h-3 mr-1" />
                          Nezaplaceno
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {!log.isPaid && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => markAsPaidMutation.mutate(log.id)}
                          disabled={markAsPaidMutation.isPending}
                          data-testid={`button-mark-paid-${log.id}`}
                        >
                          Označit jako zaplaceno
                        </Button>
                      )}
                      {log.isPaid && log.paidAt && (
                        <span className="text-sm text-muted-foreground">
                          {dayjs(log.paidAt).format("DD.MM.YYYY")}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {search || statusFilter !== "all" ? "Žádné záznamy nenalezeny" : "Zatím žádné záznamy"}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
