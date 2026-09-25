import React, { useEffect, useState } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { RecoveryEngine } from '../storage/recoveryEngine';
import { useDocumentStore } from '../state/useDocumentStore';
import { useUIStore } from '../state/useUIStore';
import type { CrashRecoveryRecord } from '../documents/types';

export const RecoveryModal: React.FC = () => {
  const [record, setRecord] = useState<CrashRecoveryRecord | null>(null);
  const { openDocument } = useDocumentStore();
  const { setStatusMessage } = useUIStore();

  useEffect(() => {
    const check = async () => {
      const rec = await RecoveryEngine.checkForCrashRecovery();
      if (rec && rec.documentData) {
        setRecord(rec);
      }
    };
    check();
  }, []);

  if (!record) return null;

  const handleRecover = () => {
    try {
      const recoveredDoc = JSON.parse(record.documentData);
      openDocument(recoveredDoc);
      RecoveryEngine.discardCrashRecovery();
      setRecord(null);
      setStatusMessage('Recovered unsaved changes from previous session');
    } catch (err) {
      console.error('Failed to parse recovery document data:', err);
    }
  };

  const handleDiscard = async () => {
    await RecoveryEngine.discardCrashRecovery();
    setRecord(null);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-200">
      <div className="bg-surface-100 border border-amber-500/40 rounded-xl shadow-2xl p-4 w-96 text-text-primary">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 mt-0.5">
            <AlertTriangle size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-semibold text-amber-200">Unsaved Session Recovered</h4>
            <p className="text-[11px] text-text-secondary mt-1">
              BANAVA detected unsaved work for "{record.documentName}" from{' '}
              {new Date(record.timestamp).toLocaleTimeString()}.
            </p>
            <div className="flex items-center gap-2 mt-3">
              <button
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs flex items-center gap-1.5"
                onClick={handleRecover}
              >
                <RotateCcw size={12} />
                <span>Recover Work</span>
              </button>
              <button
                className="px-3 py-1.5 rounded-lg bg-surface-200 hover:bg-surface-300 text-text-secondary text-xs"
                onClick={handleDiscard}
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
