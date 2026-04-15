import { Loader2, CreditCard, Receipt, FileText, Banknote, CheckCircle } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { formatCurrency } from '@/shared/lib/formatting';
import type { PaymentSummary } from '@shared/types';
import {
  RESERVATION_PAYMENT_STATUS_LABELS,
  RESERVATION_PAYMENT_METHOD_LABELS,
} from '@shared/types';

type Props = {
  paymentSummary: PaymentSummary | undefined;
  isLoading: boolean;
  isAnyMutationPending: boolean;
  onCreateDeposit: (percent: number) => void;
  onCreateFinalInvoice: () => void;
  onMarkAsPaid: (method: string) => void;
  isDepositPending: boolean;
  isFinalPending: boolean;
  isMarkPaidPending: boolean;
};

export function PaymentSummarySection({
  paymentSummary,
  isLoading,
  isAnyMutationPending,
  onCreateDeposit,
  onCreateFinalInvoice,
  onMarkAsPaid,
  isDepositPending,
  isFinalPending,
  isMarkPaidPending,
}: Props) {
  return (
    <div>
      <h3 className="font-semibold mb-4">Platby a faktury</h3>

      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : paymentSummary && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <p className="text-sm text-muted-foreground">Celková cena</p>
              <p className="text-xl font-bold font-mono">
                {formatCurrency(paymentSummary.totalPrice, paymentSummary.currency)}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-green-500/10 text-center">
              <p className="text-sm text-muted-foreground">Zaplaceno</p>
              <p className="text-xl font-bold font-mono text-green-600">
                {formatCurrency(paymentSummary.paidAmount, paymentSummary.currency)}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-orange-500/10 text-center">
              <p className="text-sm text-muted-foreground">Zbývá</p>
              <p className="text-xl font-bold font-mono text-orange-600">
                {formatCurrency(paymentSummary.remainingAmount, paymentSummary.currency)}
              </p>
            </div>
          </div>

          {/* Payment Status */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Stav platby:</span>
              <span className={`font-medium ${
                paymentSummary.paymentStatus === 'PAID' ? 'text-green-600' :
                paymentSummary.paymentStatus === 'PARTIAL' ? 'text-orange-600' :
                'text-red-600'
              }`}>
                {RESERVATION_PAYMENT_STATUS_LABELS[paymentSummary.paymentStatus]}
              </span>
            </div>
            {paymentSummary.paymentMethod && (
              <span className="text-sm text-muted-foreground">
                Způsob: {RESERVATION_PAYMENT_METHOD_LABELS[paymentSummary.paymentMethod]}
              </span>
            )}
          </div>

          {/* Quick Actions */}
          {!paymentSummary.isFullyPaid && (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onCreateDeposit(25)}
                disabled={isAnyMutationPending}
              >
                {isDepositPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Receipt className="w-4 h-4 mr-2" />
                )}
                Záloha 25%
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onCreateDeposit(50)}
                disabled={isAnyMutationPending}
              >
                <Receipt className="w-4 h-4 mr-2" />
                Záloha 50%
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onCreateFinalInvoice}
                disabled={isAnyMutationPending}
              >
                {isFinalPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4 mr-2" />
                )}
                Ostrá faktura
              </Button>
              <Button
                size="sm"
                variant="default"
                onClick={() => onMarkAsPaid('CASH')}
                disabled={isAnyMutationPending}
              >
                {isMarkPaidPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Banknote className="w-4 h-4 mr-2" />
                )}
                Hotově zaplaceno
              </Button>
            </div>
          )}

          {paymentSummary.isFullyPaid && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Rezervace je plně zaplacena</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
