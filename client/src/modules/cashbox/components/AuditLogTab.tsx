import type { CashboxAuditLogEntry } from "@shared/types";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/components/ui/table";
import { Badge } from "@/shared/components/ui/badge";
import dayjs from "dayjs";

interface AuditLogTabProps {
  auditLogs: CashboxAuditLogEntry[];
}

export function AuditLogTab({ auditLogs }: AuditLogTabProps) {
  if (auditLogs.length === 0) {
    return <div className="py-8 text-center text-muted-foreground">Žádné záznamy v audit logu</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Datum</TableHead>
          <TableHead>Uživatel</TableHead>
          <TableHead>Akce</TableHead>
          <TableHead>Popis</TableHead>
          <TableHead>IP</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {auditLogs.map((log) => (
          <TableRow key={log.id}>
            <TableCell className="text-sm">{dayjs(log.createdAt).format("DD.MM.YYYY HH:mm:ss")}</TableCell>
            <TableCell className="text-sm">{log.userName || "-"}</TableCell>
            <TableCell>
              <Badge variant="outline" className="text-xs">{log.action}</Badge>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground max-w-md truncate">{log.description || "-"}</TableCell>
            <TableCell className="text-xs font-mono text-muted-foreground">{log.ipAddress || "-"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
