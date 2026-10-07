import React, { useState } from 'react';
import { X, Upload, FileCode, Check, AlertCircle } from 'lucide-react';
import { MoviePackage } from '../types/accessibility';

interface ImportCustomPackageModalProps {
  onClose: () => void;
  onImport: (pkg: MoviePackage) => void;
}

export const ImportCustomPackageModal: React.FC<ImportCustomPackageModalProps> = ({
  onClose,
  onImport,
}) => {
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const sampleTemplate: MoviePackage = {
    id: `custom-pkg-${Date.now()}`,
    title: 'Custom Screening Access Test',
    originalLanguage: 'English',
    releaseYear: 2025,
    durationMinutes: 120,
    durationSeconds: 7200,
    posterUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80',
    cbfcRating: 'U/A 13+',
    cbfcCertNo: 'DIL/TEST/CUSTOM/2025',
    producer: 'Independent Cinema Lab',
    director: 'Accessibility Director',
    summary: 'A custom certified accessibility test package with bespoke audio descriptions and closed caption tracks.',
    packageSize: '15.2 MB',
    unlockPin: '9999',
    isDownloaded: true,
    isUnlocked: true,
    downloadProgress: 100,
    availableLanguages: ['English'],
    audioWaveformFingerprint: [0.5, 0.8, 0.4, 0.6, 0.9, 0.3],
    adTracks: {
      English: {
        language: 'English',
        narrator: 'Studio Narrator',
        cues: [
          {
            id: 'c-ad-1',
            startTime: 0,
            endTime: 6,
            text: 'The morning mist clears over the mountain pass as a solitary traveler emerges.',
            category: 'scene_setting',
          },
        ],
      },
    },
    ccTracks: {
      English: {
        language: 'English',
        cues: [
          {
            id: 'c-cc-1',
            startTime: 0,
            endTime: 5,
            speaker: 'TRAVELER',
            text: 'The summit is within reach before nightfall.',
            soundEffect: 'Gentle wind gusts echoing',
          },
        ],
      },
    },
  };

  const handleLoadSample = () => {
    setJsonText(JSON.stringify(sampleTemplate, null, 2));
    setError(null);
  };

  const handleImport = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (!parsed.title || !parsed.id || !parsed.adTracks || !parsed.ccTracks) {
        throw new Error('Package missing required fields: title, id, adTracks, or ccTracks');
      }
      onImport(parsed as MoviePackage);
      onClose();
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError('Invalid JSON package format');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl rounded-2xl bg-neutral-900 border border-neutral-800 p-6 text-neutral-100 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Import Custom Package JSON</h3>
            <p className="text-xs text-neutral-400">
              Paste or load certified accessibility cue package JSON
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono text-neutral-400">JSON PACKAGE SPECIFICATION:</span>
          <button
            onClick={handleLoadSample}
            className="text-xs text-amber-400 hover:underline font-mono"
          >
            Load Sample Template
          </button>
        </div>

        <textarea
          rows={12}
          value={jsonText}
          onChange={(e) => {
            setJsonText(e.target.value);
            setError(null);
          }}
          placeholder="Paste MoviePackage JSON here..."
          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs font-mono text-neutral-200 focus:outline-none focus:border-amber-500 resize-none"
        />

        {error && (
          <p className="text-xs text-red-400 mt-2 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </p>
        )}

        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-neutral-200"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!jsonText.trim()}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-950 font-bold text-xs transition-colors"
          >
            Import &amp; Validate Package
          </button>
        </div>
      </div>
    </div>
  );
};
