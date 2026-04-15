import React from "react";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { Label } from "@/shared/components/ui/label";
import { Upload } from "lucide-react";
import type { AiParsedMultiReservation } from "@modules/reservations/utils/ai";
import { isAiConfigured } from "@modules/reservations/utils/ai";
import { ACCEPTED_FILE_TYPES } from "@modules/reservations/utils/fileExtractor";
import { getCurrencySymbol } from "@/shared/lib/formatting";
import dayjs from "dayjs";

interface AIAssistantTabProps {
  aiInput: string;
  setAiInput: (value: string) => void;
  aiJson: AiParsedMultiReservation | null;
  aiError: string | null;
  aiLoading: boolean;
  fileProcessing: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleAiAnalyze: () => void;
  handleAiApply: () => void;
  currency: string;
}

export function AIAssistantTab({
  aiInput,
  setAiInput,
  aiJson,
  aiError,
  aiLoading,
  fileProcessing,
  fileInputRef,
  handleFileUpload,
  handleAiAnalyze,
  handleAiApply,
  currency,
}: AIAssistantTabProps) {
  return (
    <div className="space-y-4">
      {!isAiConfigured() && (
        <div className="p-3 rounded-md bg-yellow-100 text-yellow-900 text-sm">
          AI není nakonfigurováno. Žádné AI servery nejsou dostupné.
        </div>
      )}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Vložte e-mail / konverzaci ke zpracování</Label>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_FILE_TYPES}
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={fileProcessing}
            >
              <Upload className="w-4 h-4 mr-1" />
              {fileProcessing ? "Zpracovávám…" : "Nahrát soubor"}
            </Button>
          </div>
        </div>
        <Textarea
          value={aiInput}
          onChange={(e) => setAiInput(e.target.value)}
          placeholder="Sem vložte text e-mailu, nebo nahrajte soubor (PDF, Excel, Word)…"
          className="min-h-48"
        />
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={handleAiAnalyze}
            disabled={aiLoading}
          >
            {aiLoading ? "Analýza…" : "Analyzovat AI"}
          </Button>
          <Button type="button" onClick={handleAiApply} disabled={!aiJson}>
            Použít do formuláře
          </Button>
        </div>
      </div>
      {aiError && (
        <div className="p-3 rounded-md bg-destructive/10 text-destructive">
          {aiError}
        </div>
      )}
      {aiJson && (
        <div className="space-y-2">
          <Label>
            Náhled AI výsledku ({aiJson.reservations.length} rezervací)
          </Label>
          <div className="p-3 bg-muted rounded-md space-y-2">
            <div className="text-sm">
              <strong>Kontakt:</strong> {aiJson.contact.name} (
              {aiJson.contact.email})
            </div>
            <div className="text-sm">
              <strong>Fakturace:</strong> {aiJson.contact.invoiceCompany}, IČO:{" "}
              {aiJson.contact.invoiceIc}, DIČ: {aiJson.contact.invoiceDic}
            </div>
            <div className="border-t pt-2 mt-2">
              <strong className="text-sm">Rezervace:</strong>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mt-1">
                {aiJson.reservations.map((r, i) => (
                  <div
                    key={r.groupCode || `res-${i}`}
                    className="text-xs p-2 bg-background rounded border"
                  >
                    <div className="flex justify-between items-start">
                      <div className="font-medium">
                        {dayjs(r.date).format("D.M.YYYY")}
                      </div>
                      {r.groupCode && (
                        <span className="text-[10px] bg-primary/10 text-primary px-1 rounded">
                          {r.groupCode}
                        </span>
                      )}
                    </div>
                    <div>
                      {r.adults} dosp. + {r.freeTourLeaders || 0} TL +{" "}
                      {r.freeDrivers || 0} řidič
                    </div>
                    {r.pricePerPerson && (
                      <div className="text-green-600 font-medium">
                        Cena: {r.pricePerPerson}{" "}
                        {getCurrencySymbol(aiJson?.priceCurrency || currency)}
                        /os
                      </div>
                    )}
                    {r.menu && (
                      <div
                        className="text-muted-foreground truncate"
                        title={r.menu}
                      >
                        Menu: {r.menu}
                      </div>
                    )}
                    {r.notes && (
                      <div
                        className="text-muted-foreground truncate"
                        title={r.notes}
                      >
                        {r.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
