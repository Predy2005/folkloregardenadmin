import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { invalidateReservationQueries } from "@/shared/lib/query-helpers";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Badge } from "@/shared/components/ui/badge";
import { PageHeader } from "@/shared/components/PageHeader";
import {
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  Loader2,
  CheckCircle,
  AlertCircle,
  X,
  Database,
  Eye,
  Info,
} from "lucide-react";

interface ParsedDraft {
  date: string;
  venue: string;
  section: string | null;
  rowNumber: number;
  pax: number;
  free: number;
  status: string;
  parsedPayment: {
    price: number | null;
    currency: string | null;
    paymentMethod: string | null;
  };
  raw: { company?: string; menu?: string; drinks?: string; platba?: string };
  warnings: string[];
  result?: { action: string; reservationId?: number; message: string };
}

interface FileResult {
  filename: string;
  eventDate: string | null;
  error: string | null;
  count: number;
  drafts: ParsedDraft[];
}

interface PreviewResponse {
  files: FileResult[];
  stats: {
    totalFiles: number;
    totalReservations: number;
    cancelled: number;
    bySection: Record<string, number>;
    byVenue: Record<string, number>;
  };
  importStats?: {
    created: number;
    updated: number;
    skipped: number;
    errors: number;
  };
}

export default function ReservationImportPage() {
  const [, navigate] = useLocation();
  const [files, setFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [committed, setCommitted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const previewMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const fd = new FormData();
      files.forEach((f) => fd.append("files[]", f));
      return api.post<PreviewResponse>("/api/reservations/import/preview", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: (data) => {
      setPreview(data);
      setCommitted(false);
      successToast(`Načteno ${data.stats.totalReservations} rezervací z ${data.stats.totalFiles} souborů`);
    },
    onError: (error: Error) => errorToast(error),
  });

  const commitMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const fd = new FormData();
      files.forEach((f) => fd.append("files[]", f));
      return api.post<PreviewResponse>("/api/reservations/import/commit", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: (data) => {
      setPreview(data);
      setCommitted(true);
      invalidateReservationQueries();
      const s = data.importStats!;
      successToast(`Hotovo: ${s.created} vytvořeno, ${s.updated} aktualizováno, ${s.skipped} přeskočeno`);
    },
    onError: (error: Error) => errorToast(error),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    addFiles(selected);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files).filter((f) =>
      f.name.toLowerCase().endsWith(".xlsx")
    );
    addFiles(dropped);
  };

  const addFiles = (newFiles: File[]) => {
    if (newFiles.length === 0) return;
    setFiles((prev) => {
      const merged = [...prev];
      newFiles.forEach((f) => {
        if (!merged.some((existing) => existing.name === f.name)) merged.push(f);
      });
      if (merged.length > 20) {
        errorToast(
          "PHP umožňuje nahrát max. 20 souborů najednou. Rozděl import na více dávek."
        );
        return prev;
      }
      return merged;
    });
    setPreview(null);
    setCommitted(false);
  };

  const removeFile = (name: string) => {
    setFiles((prev) => prev.filter((f) => f.name !== name));
    setPreview(null);
    setCommitted(false);
  };

  const clearAll = () => {
    setFiles([]);
    setPreview(null);
    setCommitted(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const allDrafts = preview?.files.flatMap((f) => f.drafts) ?? [];
  const isLoading = previewMutation.isPending || commitMutation.isPending;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/reservations")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <PageHeader
          title="Import rezervací z Excelu"
          description='Hromadný import ze souborů "Priprava akce DD_M_YYYY.xlsx"'
        />
      </div>

      {/* Info banner */}
      <div className="flex gap-3 p-4 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-900">
        <Info className="w-5 h-5 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p><strong>Jak to funguje:</strong> Nahrej xlsx soubory ve formátu <code className="px-1 bg-white rounded">Priprava akce DD_M_YYYY.xlsx</code>. Datum se automaticky určí z názvu souboru.</p>
          <p>Nejdřív si zkontroluj <strong>Náhled</strong> (nic se neuloží), pak klikni <strong>Importovat do DB</strong>. Opakovaný import stejných souborů přeskočí beze změny — pokud změníš buňku v Excelu a importuješ znovu, jen ten řádek se aktualizuje.</p>
          <p className="text-xs text-blue-700">Limit: max. 20 souborů na jednu dávku (PHP omezení). Pro 30 souborů použij dvě dávky.</p>
        </div>
      </div>

      {/* Upload area */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Upload className="w-5 h-5" />
            1. Nahrání souborů
          </CardTitle>
          <CardDescription>
            Přetáhni jeden nebo více .xlsx souborů, nebo klikni a vyber. Datum události se
            automaticky určí z názvu souboru.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-12 text-center cursor-pointer hover:bg-muted/30 transition-colors"
          >
            <FileSpreadsheet className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Klikni nebo přetáhni</strong> .xlsx soubory sem
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Můžeš vybrat více souborů najednou
            </p>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {files.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Vybráno: {files.length} souborů</p>
                <Button variant="ghost" size="sm" onClick={clearAll}>
                  Smazat vše
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {files.map((f) => (
                  <div
                    key={f.name}
                    className="flex items-center gap-2 px-3 py-2 rounded border bg-muted/20 text-sm"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="flex-1 truncate">{f.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(f.name);
                      }}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {files.length > 0 && (
            <div className="mt-4 flex gap-2">
              <Button
                variant="outline"
                onClick={() => previewMutation.mutate(files)}
                disabled={isLoading}
              >
                {previewMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Eye className="w-4 h-4 mr-2" />
                )}
                Náhled (bez uložení)
              </Button>
              <Button
                onClick={() => commitMutation.mutate(files)}
                disabled={isLoading}
              >
                {commitMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Database className="w-4 h-4 mr-2" />
                )}
                Importovat do DB
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      {preview && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              {committed ? <CheckCircle className="w-5 h-5 text-green-500" /> : <Eye className="w-5 h-5" />}
              2. {committed ? "Výsledek importu" : "Náhled"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatBox label="Souborů" value={preview.stats.totalFiles} />
              <StatBox label="Rezervací" value={preview.stats.totalReservations} />
              <StatBox label="Storna" value={preview.stats.cancelled} className="text-red-600" />
              <StatBox label="Celkem dnů" value={Object.keys(preview.files).length} />
            </div>

            {committed && preview.importStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t">
                <StatBox label="Vytvořeno" value={preview.importStats.created} className="text-green-600" />
                <StatBox label="Aktualizováno" value={preview.importStats.updated} className="text-blue-600" />
                <StatBox label="Beze změny" value={preview.importStats.skipped} className="text-muted-foreground" />
                <StatBox label="Chyby" value={preview.importStats.errors} className="text-red-600" />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
              <div>
                <p className="text-xs uppercase text-muted-foreground mb-2">Dle zdroje</p>
                <div className="space-y-1">
                  {Object.entries(preview.stats.bySection).map(([key, val]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span>{key}</span>
                      <span className="font-mono font-medium">{val}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground mb-2">Dle prostoru</p>
                <div className="space-y-1">
                  {Object.entries(preview.stats.byVenue).map(([key, val]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span>{key}</span>
                      <span className="font-mono font-medium">{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Drafts table */}
      {preview && allDrafts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">3. Detail rezervací</CardTitle>
            <CardDescription>
              {allDrafts.length} řádků. Žluté = manuální revize doporučena. Červené = storno.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border max-h-[600px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Prostor</TableHead>
                    <TableHead>Zdroj</TableHead>
                    <TableHead>Firma</TableHead>
                    <TableHead className="text-right">Pax</TableHead>
                    <TableHead className="text-right">Free</TableHead>
                    <TableHead className="text-right">Cena/os.</TableHead>
                    <TableHead>Stav</TableHead>
                    {committed && <TableHead>Výsledek</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allDrafts.map((d, idx) => {
                    const isStorno = d.status === "CANCELLED";
                    const hasWarnings = (d.warnings ?? []).length > 0;
                    const rowBg = isStorno
                      ? "bg-red-50/50"
                      : hasWarnings
                        ? "bg-yellow-50/50"
                        : "";
                    return (
                      <TableRow key={idx} className={rowBg}>
                        <TableCell className="font-mono text-xs whitespace-nowrap">
                          {d.date}
                        </TableCell>
                        <TableCell className="text-xs">{d.venue}</TableCell>
                        <TableCell>
                          {d.section && (
                            <Badge variant="outline" className="text-xs">
                              {d.section}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div className="font-medium text-sm truncate" title={d.raw.company}>
                            {d.raw.company || "—"}
                          </div>
                          {hasWarnings && (
                            <div className="text-xs text-yellow-700 flex items-start gap-1 mt-1">
                              <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                              <span className="truncate" title={d.warnings.join(" • ")}>
                                {d.warnings[0]}
                              </span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono">{d.pax}</TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">
                          {d.free || ""}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm whitespace-nowrap">
                          {d.parsedPayment.price !== null
                            ? `${d.parsedPayment.price} ${d.parsedPayment.currency ?? ""}`
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={d.status} />
                        </TableCell>
                        {committed && (
                          <TableCell>
                            {d.result && <ResultBadge result={d.result} />}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatBox({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div className="p-3 rounded-lg bg-muted/50 text-center">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold font-mono ${className ?? ""}`}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    CONFIRMED: { label: "Potvrzeno", cls: "bg-green-100 text-green-700 border-green-300" },
    RECEIVED: { label: "Přijato", cls: "bg-blue-100 text-blue-700 border-blue-300" },
    CANCELLED: { label: "Storno", cls: "bg-red-100 text-red-700 border-red-300" },
  };
  const m = map[status] ?? { label: status, cls: "" };
  return <Badge variant="outline" className={`text-xs ${m.cls}`}>{m.label}</Badge>;
}

function ResultBadge({ result }: { result: { action: string; reservationId?: number } }) {
  const map: Record<string, { label: string; cls: string }> = {
    created: { label: "Vytvořeno", cls: "bg-green-100 text-green-700 border-green-300" },
    updated: { label: "Aktualizováno", cls: "bg-blue-100 text-blue-700 border-blue-300" },
    skipped: { label: "Beze změny", cls: "bg-gray-100 text-gray-600 border-gray-300" },
    error: { label: "Chyba", cls: "bg-red-100 text-red-700 border-red-300" },
  };
  const m = map[result.action] ?? { label: result.action, cls: "" };
  return (
    <Badge variant="outline" className={`text-xs ${m.cls}`}>
      {m.label}
      {result.reservationId ? ` #${result.reservationId}` : ""}
    </Badge>
  );
}
