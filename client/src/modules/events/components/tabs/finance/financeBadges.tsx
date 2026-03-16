import { Badge } from "@/shared/components/ui/badge";
import { AlertCircle, Banknote, CheckCircle2, Clock, CreditCard, Globe, Building2 } from "lucide-react";

export function getPaymentStatusBadge(status: string) {
  switch (status) {
    case "PAID":
      return <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Zaplaceno</Badge>;
    case "PARTIAL":
      return <Badge className="bg-yellow-500"><Clock className="w-3 h-3 mr-1" />Částečně</Badge>;
    default:
      return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Nezaplaceno</Badge>;
  }
}

export function getInvoiceStatusBadge(status: string) {
  switch (status) {
    case "PAID":
      return <Badge variant="outline" className="text-green-600 border-green-600">Zaplacena</Badge>;
    case "SENT":
      return <Badge variant="outline" className="text-blue-600 border-blue-600">Odesláno</Badge>;
    case "DRAFT":
      return <Badge variant="outline" className="text-gray-600 border-gray-600">Koncept</Badge>;
    case "CANCELLED":
      return <Badge variant="outline" className="text-red-600 border-red-600">Storno</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function getInvoiceTypeBadge(type: string) {
  switch (type) {
    case "DEPOSIT":
      return <Badge variant="secondary">Záloha</Badge>;
    case "FINAL":
      return <Badge variant="secondary">Doplatek</Badge>;
    default:
      return <Badge variant="secondary">{type}</Badge>;
  }
}

export function getPaymentMethodBadge(method: string | null) {
  if (!method) return <span className="text-muted-foreground text-xs">-</span>;
  const lower = method.toLowerCase();
  if (lower === "cash" || lower === "hotově" || lower === "hotove") {
    return <Badge variant="outline" className="text-green-700 border-green-600"><Banknote className="w-3 h-3 mr-1" />Hotově</Badge>;
  }
  if (lower === "transfer" || lower === "převod" || lower === "prevod" || lower === "bank_transfer") {
    return <Badge variant="outline" className="text-blue-700 border-blue-600"><Building2 className="w-3 h-3 mr-1" />Převod</Badge>;
  }
  if (lower === "online" || lower === "comgate") {
    return <Badge variant="outline" className="text-purple-700 border-purple-600"><Globe className="w-3 h-3 mr-1" />Online</Badge>;
  }
  if (lower === "card" || lower === "kartou" || lower === "karta") {
    return <Badge variant="outline" className="text-orange-700 border-orange-600"><CreditCard className="w-3 h-3 mr-1" />Kartou</Badge>;
  }
  return <Badge variant="outline">{method}</Badge>;
}
