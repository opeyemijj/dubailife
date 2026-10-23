"use client";

// The one checkout every real-money purchase goes through: a clear summary, then payment. The card
// gateway isn't connected yet, so paying saves the order and explains what happens next — nothing
// is charged and nothing is delivered until the payment is confirmed on the server.

import { ModalPortal } from "@/components/ui/modal-portal";
import { useState } from "react";
import { CreditCard, Loader2, Lock, X, Clock } from "lucide-react";
import { formatAED } from "@/lib/commerce";

export interface CheckoutLine { label: string; value: string }

export function Checkout({ title, lines, amount, note, onConfirm, onClose }: {
  title: string;
  lines: CheckoutLine[];
  amount: number;
  /** Renewal, cancellation or refund terms shown before paying. */
  note?: string;
  /** Creates the order on the server. Resolves to an error message, or null. */
  onConfirm: () => Promise<string | null>;
  onClose: () => void;
}) {
  const [stage, setStage] = useState<"review" | "saving" | "pending">("review");
  const [error, setError] = useState<string | null>(null);

  const pay = async () => {
    setStage("saving");
    setError(null);
    const e = await onConfirm();
    if (e) { setError(e); setStage("review"); return; }
    setStage("pending");
  };

  return (
<ModalPortal>
    <div className="fixed inset-0 z-[200] bg-slate-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-2 sm:p-6" role="dialog" aria-modal="true">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden text-slate-900">
        <div className="flex items-center gap-3 px-5 pt-5">
          <span className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><CreditCard className="w-5 h-5" /></span>
          <h2 className="flex-1 font-black text-lg leading-tight">{stage === "pending" ? "Order saved" : title}</h2>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center" aria-label="Close"><X className="w-4 h-4" /></button>
        </div>

        {stage !== "pending" ? (
          <div className="p-5 space-y-4">
            <dl className="rounded-2xl bg-slate-50 border border-slate-100 divide-y divide-slate-100">
              {lines.map((l) => (
                <div key={l.label} className="flex justify-between gap-4 px-4 py-2.5 text-sm"><dt className="text-slate-500">{l.label}</dt><dd className="font-bold text-right">{l.value}</dd></div>
              ))}
              <div className="flex justify-between px-4 py-3"><dt className="font-black">Total</dt><dd className="font-black text-emerald-600">{formatAED(amount)}</dd></div>
            </dl>
            {note && <p className="text-xs text-slate-500">{note}</p>}
            {error && <p className="text-sm font-bold text-rose-600">{error}</p>}
            <button onClick={pay} disabled={stage === "saving"} className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-black flex items-center justify-center gap-2">
              {stage === "saving" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />} Pay {formatAED(amount)}
            </button>
            <p className="text-[11px] text-slate-400 text-center">Prices include VAT where applicable. Real money — not virtual AED.</p>
          </div>
        ) : (
          <div className="p-5 space-y-4 text-center">
            <span className="mx-auto w-14 h-14 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center"><Clock className="w-7 h-7" /></span>
            <div>
              <h3 className="font-black text-lg">Payment gateway coming soon</h3>
              <p className="text-sm text-slate-600 mt-1">Card payments aren&apos;t live yet, so <strong>you haven&apos;t been charged</strong>. Your order is saved and waiting for payment.</p>
            </div>
            <p className="text-xs text-slate-500">To pay now, email <a className="font-bold text-emerald-700" href="mailto:billing@mydubailife.app">billing@mydubailife.app</a> with your username. Once payment is confirmed, your purchase is activated automatically and shows in your history.</p>
            <button onClick={onClose} className="w-full h-12 rounded-2xl bg-slate-900 text-white font-black">Done</button>
          </div>
        )}
      </div>
    </div>
    </ModalPortal>
  );
}
