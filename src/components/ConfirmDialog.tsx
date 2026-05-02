import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'danger' | 'warning';
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  type = 'danger'
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-sm bg-white rounded-[32px] p-8 shadow-2xl overflow-hidden"
          >
            <button
              onClick={onCancel}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={24} />
            </button>

            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 mx-auto ${
              type === 'danger' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
            }`}>
              <AlertTriangle size={32} />
            </div>

            <h3 className="text-2xl font-bold text-center text-slate-900 mb-2">{title}</h3>
            <p className="text-lg text-center text-slate-600 mb-8">{message}</p>

            <div className="flex flex-col gap-3">
              <button
                id="modal-confirm-btn"
                onClick={() => {
                  onConfirm();
                  onCancel();
                }}
                className={`w-full py-4 rounded-2xl text-xl font-bold transition-all active:scale-95 ${
                  type === 'danger' ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-amber-600 text-white hover:bg-amber-700'
                }`}
              >
                {confirmLabel}
              </button>
              <button
                id="modal-cancel-btn"
                onClick={onCancel}
                className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl text-xl font-bold hover:bg-slate-200 transition-all active:scale-95"
              >
                {cancelLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
