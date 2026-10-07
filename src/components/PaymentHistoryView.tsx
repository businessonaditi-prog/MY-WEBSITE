import React, { useState, useEffect } from 'react';
import { CreditCard, CheckCircle2, Download, ShieldCheck, FileText } from 'lucide-react';
import { api } from '../services/apiClient';
import { Payment } from '../types/cinemaPlatform';

export const PaymentHistoryView: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await api.getPaymentHistory();
      setPayments(res.payments);
    } catch (e) {
      console.error('Error fetching payments:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReceipt = (payment: Payment) => {
    const receiptContent = `
======================================================
  CENTRAL BOARD OF FILM CERTIFICATION (CBFC)
  STATUTORY THEATRICAL SUBMISSION INVOICE & RECEIPT
======================================================
Receipt ID:       ${payment.id}
Transaction ID:   ${payment.transactionId}
Date:             ${new Date(payment.createdAt).toLocaleString()}
Production House: ${payment.productionHouseName}
Film Title:       ${payment.filmTitle}
Statutory Fee:    ₹${payment.amount.toLocaleString()} INR
Payment Gateway:  ${payment.gateway}
Payment Status:   SUCCESSFUL (PAID)
Preview Code:     ${payment.previewCodeGenerated || 'N/A'}
======================================================
Authorized Electronic Receipt • Ministry of I&B
`;
    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CBFC_RECEIPT_${payment.transactionId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn pb-12">
      <div className="pb-4 border-b border-neutral-800">
        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-wide uppercase">
          PAYMENT HISTORY &amp; STATUTORY RECEIPTS
        </h2>
        <p className="text-xs sm:text-sm text-neutral-400 mt-1">
          Official record of certification preview payments (Minimum ₹15,000 INR per feature submission).
        </p>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs font-mono text-neutral-500">
          Loading payment records...
        </div>
      ) : payments.length === 0 ? (
        <div className="py-16 text-center rounded-2xl bg-neutral-900 border border-neutral-800 p-8 space-y-2">
          <CreditCard className="w-8 h-8 text-neutral-600 mx-auto" />
          <h3 className="text-sm font-bold text-neutral-300">No Payment Records Found</h3>
          <p className="text-xs text-neutral-500">Transactions will appear here once films are uploaded and paid.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {payments.map((p) => (
            <div
              key={p.id}
              className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-bold text-amber-400">{p.transactionId}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-600/40">
                    PAID ✓
                  </span>
                </div>
                <h3 className="text-base font-bold text-white">{p.filmTitle}</h3>
                <p className="text-xs text-neutral-400 font-mono mt-0.5">
                  Method: {p.gateway} • Date: {new Date(p.createdAt).toLocaleDateString()}
                </p>
              </div>

              <div className="flex items-center gap-4 self-end sm:self-auto">
                <div className="text-right">
                  <div className="text-lg font-mono font-black text-emerald-400">
                    ₹{p.amount.toLocaleString()} INR
                  </div>
                  <span className="text-[10px] font-mono text-neutral-500">Statutory Preview Fee</span>
                </div>

                <button
                  onClick={() => handleDownloadReceipt(p)}
                  className="p-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 transition-colors"
                  title="Download Official CBFC Receipt"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
