import React, { useState } from 'react';
import { RubricTemplate, Competition } from '../types';
import { FolderGit2, Save, Download, Check, Trash2, Layers } from 'lucide-react';

interface TemplateManagerProps {
  templates: RubricTemplate[];
  activeCompetition: Competition;
  onSaveAsTemplate: (name: string, description: string) => void;
  onApplyTemplate: (templateId: string) => void;
  onDeleteTemplate: (templateId: string) => void;
}

export const TemplateManager: React.FC<TemplateManagerProps> = ({
  templates,
  activeCompetition,
  onSaveAsTemplate,
  onApplyTemplate,
  onDeleteTemplate,
}) => {
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [appliedNotification, setAppliedNotification] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim()) return;

    onSaveAsTemplate(templateName.trim(), templateDesc.trim());
    setTemplateName('');
    setTemplateDesc('');
    setShowSaveModal(false);
  };

  const handleApply = (template: RubricTemplate) => {
    const confirm = window.confirm(
      `Load template "${template.name}"? This will configure rounds and criteria from this template for the active competition.`
    );
    if (!confirm) return;

    onApplyTemplate(template.id);
    setAppliedNotification(template.name);
    setTimeout(() => setAppliedNotification(null), 4000);
  };

  const handleExportJSON = (template: RubricTemplate) => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(template, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${template.name.toLowerCase().replace(/\s+/g, '_')}_template.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Save Action */}
      <div className="bg-tac-ink-800 rounded-sm border border-tac-ink-700 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <FolderGit2 className="w-5 h-5 text-tac-gold-500" />
              <h2 className="font-display font-bold text-lg text-tac-stone-100 uppercase tracking-wide">
                Judging Form Templates (MSP-01)
              </h2>
            </div>
            <p className="text-xs text-tac-stone-400 mt-1 max-w-xl">
              Save configured rounds, criteria, and point scales as reusable templates. Load them for any
              future pitch competition (MCC-BP, IA-EH, AB&P) without rebuilding setup from scratch.
            </p>
          </div>

          <button
            onClick={() => setShowSaveModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-tac-gold-800 hover:bg-tac-gold-900 text-white font-semibold text-xs rounded-xs shadow-tac-sm transition-all"
          >
            <Save className="w-4 h-4 text-tac-gold-300" />
            <span>Save Current Setup as Template</span>
          </button>
        </div>

        {appliedNotification && (
          <div className="mt-4 p-3 bg-green-950/80 border border-green-700 rounded-xs text-green-300 text-xs flex items-center space-x-2">
            <Check className="w-4 h-4 text-green-400" />
            <span>
              Successfully loaded template <strong>"{appliedNotification}"</strong> into active competition!
            </span>
          </div>
        )}
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-tac-ink-900 border border-tac-gold-700/60 rounded-sm max-w-lg w-full p-6 shadow-tac-lg space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-tac-ink-700">
              <h3 className="font-display font-bold text-sm text-tac-stone-100 uppercase tracking-wider">
                Save As Reusable Template
              </h3>
              <button
                onClick={() => setShowSaveModal(false)}
                className="text-tac-stone-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-xs text-tac-stone-300 font-semibold block mb-1">
                  Template Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Magic City Classic 2027 Standard"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full bg-tac-ink-950 border border-tac-ink-700 rounded-xs px-3 py-2 text-xs text-white focus:outline-none focus:border-tac-gold-700"
                />
              </div>

              <div>
                <label className="text-xs text-tac-stone-300 font-semibold block mb-1">
                  Description / Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. 5 categories, 50 points total with booth categories for morning session."
                  value={templateDesc}
                  onChange={(e) => setTemplateDesc(e.target.value)}
                  className="w-full bg-tac-ink-950 border border-tac-ink-700 rounded-xs p-2 text-xs text-white focus:outline-none focus:border-tac-gold-700"
                />
              </div>

              <div className="bg-tac-ink-950 p-3 rounded-xs border border-tac-ink-800 text-xs text-tac-stone-400 space-y-1">
                <span className="font-semibold text-tac-stone-300">Included in this template:</span>
                <p>• {activeCompetition.rounds.length} rounds configured</p>
                <p>• {activeCompetition.rounds.reduce((a, r) => a + r.rubric.criteria.length, 0)} total evaluation criteria</p>
                <p>• Inline listening guidelines and point scale definitions</p>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSaveModal(false)}
                  className="px-3 py-1.5 text-xs text-tac-stone-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-tac-gold-800 hover:bg-tac-gold-900 text-white font-semibold text-xs rounded-xs transition-colors"
                >
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map((template) => {
          const totalCriteria = template.rounds.reduce((a, r) => a + r.rubric.criteria.length, 0);
          const totalPoints = template.rounds.reduce(
            (a, r) => a + r.rubric.criteria.reduce((ca, c) => ca + c.maxPoints, 0),
            0
          );

          return (
            <div
              key={template.id}
              className="bg-tac-ink-800 rounded-sm border border-tac-ink-700 hover:border-tac-gold-700/60 p-5 flex flex-col justify-between transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-display font-bold text-sm text-tac-stone-100">
                      {template.name}
                    </h3>
                    {template.isBuiltIn && (
                      <span className="bg-tac-ink-900 text-tac-gold-400 border border-tac-gold-700/50 text-[10px] font-semibold px-2 py-0.5 rounded-xs">
                        Official TAC
                      </span>
                    )}
                  </div>
                  {!template.isBuiltIn && (
                    <button
                      onClick={() => onDeleteTemplate(template.id)}
                      className="text-tac-stone-500 hover:text-red-400 p-1 transition-colors"
                      title="Delete template"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <p className="text-xs text-tac-stone-400 mt-2 line-clamp-2">
                  {template.description || "Standard judging form template."}
                </p>

                {/* Structure Snapshot */}
                <div className="mt-4 pt-3 border-t border-tac-ink-700/60 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-tac-ink-900 p-2 rounded-xs">
                    <span className="text-[10px] text-tac-stone-400 uppercase block">Rounds</span>
                    <span className="font-bold text-tac-stone-200">{template.rounds.length}</span>
                  </div>
                  <div className="bg-tac-ink-900 p-2 rounded-xs">
                    <span className="text-[10px] text-tac-stone-400 uppercase block">Criteria</span>
                    <span className="font-bold text-tac-stone-200">{totalCriteria}</span>
                  </div>
                  <div className="bg-tac-ink-900 p-2 rounded-xs">
                    <span className="text-[10px] text-tac-stone-400 uppercase block">Total Pts</span>
                    <span className="font-bold text-tac-gold-400">{totalPoints} pts</span>
                  </div>
                </div>

                {/* Rounds Summary */}
                <div className="mt-3 space-y-1">
                  {template.rounds.map((round) => (
                    <div key={round.id} className="text-[11px] text-tac-stone-400 flex items-center justify-between">
                      <span className="flex items-center space-x-1.5">
                        <Layers className="w-3 h-3 text-tac-gold-500" />
                        <span>{round.name}</span>
                      </span>
                      <span>{round.rubric.criteria.length} criteria</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3 border-t border-tac-ink-700/60 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleExportJSON(template)}
                  className="flex items-center space-x-1 px-2.5 py-1.5 bg-tac-ink-900 hover:bg-tac-ink-700 text-tac-stone-300 text-xs rounded-xs border border-tac-ink-700 transition-colors"
                  title="Export template as JSON"
                >
                  <Download className="w-3.5 h-3.5 text-tac-stone-400" />
                  <span>Export</span>
                </button>

                <button
                  onClick={() => handleApply(template)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-tac-gold-800 hover:bg-tac-gold-900 text-white font-semibold text-xs rounded-xs shadow-tac-sm transition-colors"
                >
                  <Check className="w-3.5 h-3.5 text-tac-gold-300" />
                  <span>Load Template</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
