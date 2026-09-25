import React from 'react';
import { Download, Plus, Trash2 } from 'lucide-react';
import { PanelSection } from '../components/ui/PanelSection';
import { IconButton } from '../components/ui/IconButton';
import { useDocumentStore } from '../state/useDocumentStore';
import { useUIStore } from '../state/useUIStore';
import { ExportEngine } from '../export/exportEngine';
import type { SceneObject, ExportSetting } from '../types/document';
import { generateId } from '../utils/id';

interface ExportInspectorProps {
  target?: SceneObject | null;
}

export const ExportInspector: React.FC<ExportInspectorProps> = ({ target }) => {
  const { doc, addExportSetting, removeExportSetting } = useDocumentStore();
  const { setStatusMessage } = useUIStore();

  const activePage = doc.pages.find((p) => p.id === doc.activePageId) || doc.pages[0];
  const settings: ExportSetting[] = target
    ? target.exportSettings || []
    : doc.exportSettings || [];

  const handleAddSetting = () => {
    const newSetting: ExportSetting = {
      id: generateId('exp'),
      format: 'PNG',
      scale: 1,
      transparent: true,
    };
    addExportSetting(target?.id, newSetting);
  };

  const handleExportSingle = async (setting: ExportSetting) => {
    if (target) {
      await ExportEngine.exportObject(target, activePage.objects, setting);
      setStatusMessage(`Exported ${target.name} (${setting.format} @${setting.scale}x)`);
    } else {
      await ExportEngine.exportPage(activePage, setting);
      setStatusMessage(`Exported ${activePage.name} (${setting.format} @${setting.scale}x)`);
    }
  };

  const handleExportAll = async () => {
    if (settings.length === 0) {
      // Default export PNG
      const defaultSetting: ExportSetting = { id: 'default', format: 'PNG', scale: 1, transparent: true };
      if (target) {
        await ExportEngine.exportObject(target, activePage.objects, defaultSetting);
      } else {
        await ExportEngine.exportPage(activePage, defaultSetting);
      }
      return;
    }

    for (const setting of settings) {
      if (target) {
        await ExportEngine.exportObject(target, activePage.objects, setting);
      } else {
        await ExportEngine.exportPage(activePage, setting);
      }
    }
    setStatusMessage('Exported all configurations');
  };

  return (
    <PanelSection
      title="Export"
      action={
        <IconButton
          icon={<Plus size={13} />}
          size="sm"
          tooltip="Add Export Configuration"
          onClick={handleAddSetting}
        />
      }
    >
      <div className="space-y-2 text-xs">
        {settings.map((setting) => (
          <div
            key={setting.id}
            className="p-2.5 rounded-lg bg-surface-200/50 border border-border-subtle flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <span className="font-semibold text-text-primary uppercase text-[11px] px-1.5 py-0.5 rounded bg-surface-300">
                {setting.format}
              </span>
              {(setting.format === 'PNG' || setting.format === 'JPG') && (
                <span className="text-[11px] text-text-muted font-mono">{setting.scale}x</span>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                className="px-2 py-1 rounded bg-brand hover:bg-brand-hover text-white text-[11px] font-medium flex items-center gap-1"
                onClick={() => handleExportSingle(setting)}
              >
                <Download size={11} />
                <span>Export</span>
              </button>
              <IconButton
                icon={<Trash2 size={12} />}
                size="sm"
                tooltip="Remove configuration"
                onClick={() => removeExportSetting(target?.id, setting.id)}
              />
            </div>
          </div>
        ))}

        <button
          className="w-full mt-2 py-1.5 px-3 rounded-lg bg-surface-200 hover:bg-surface-300 text-text-primary border border-border-default font-medium flex items-center justify-center gap-1.5 text-xs transition-colors"
          onClick={handleExportAll}
        >
          <Download size={13} />
          <span>Export {target ? target.name : activePage.name}</span>
        </button>
      </div>
    </PanelSection>
  );
};
