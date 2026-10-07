import React from 'react';
import { ShieldCheck, FileCheck, Headphones, Subtitles, Moon, VolumeX, Eye, BookOpen, CheckCircle2 } from 'lucide-react';

export const CBFCGuide: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Title */}
      <div className="text-center sm:text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono font-semibold mb-2">
          <ShieldCheck className="w-4 h-4" />
          <span>MINISTRY OF INFORMATION &amp; BROADCASTING (MIB)</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-wide">
          CBFC Accessibility Guidelines (2024)
        </h2>
        <p className="text-xs sm:text-sm text-neutral-400 mt-1 max-w-2xl leading-relaxed">
          Guidelines for Making Feature Films Accessible for Persons with Hearing and Visual Impairment in Theatrical Exhibitions.
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-sm font-mono">
            <Headphones className="w-4 h-4" />
            <span>AUDIO DESCRIPTION (AD) STANDARDS</span>
          </div>
          <p className="text-xs text-neutral-300 leading-relaxed">
            Audio Description (AD) provides an additional narration track that describes essential visual elements
            of the film — including physical actions, facial expressions, costumes, scenery, and scene changes.
          </p>
          <ul className="text-xs text-neutral-400 space-y-1.5 list-disc list-inside">
            <li>Must fit within natural pauses in dialogue to prevent speech collision</li>
            <li>Headphone-first delivery to prevent leakage into the main auditorium</li>
            <li>Multilingual narration tracks matching feature film dub versions</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
          <div className="flex items-center gap-2 text-sky-400 font-bold text-sm font-mono">
            <Subtitles className="w-4 h-4" />
            <span>CLOSED CAPTION (CC) STANDARDS</span>
          </div>
          <p className="text-xs text-neutral-300 leading-relaxed">
            Closed Captions (CC) convey not only dialogic text but also rich non-speech audio cues essential
            for Deaf and Hard-of-Hearing viewers.
          </p>
          <ul className="text-xs text-neutral-400 space-y-1.5 list-disc list-inside">
            <li>Identification of speaking characters in brackets or distinct color</li>
            <li>Description of significant background sounds: [GUNSHOT], [FOOTSTEPS]</li>
            <li>Description of emotional tone (whispers, laughter) and music cues (♪)</li>
            <li>High-contrast customizable formatting (minimum WCAG AA ratio)</li>
          </ul>
        </div>
      </div>

      {/* Auditorium Etiquette Checklist */}
      <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Moon className="w-5 h-5 text-purple-400" />
          <span>Auditorium Courtesy &amp; Theater Etiquette</span>
        </h3>
        <p className="text-xs text-neutral-400">
          Pixapix is engineered to allow people with disabilities to enjoy cinema screenings seamlessly alongside all audience members:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-start gap-3">
            <Headphones className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-xs text-neutral-200 block">Always Use Headphones</strong>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Ensure wired earphones or Bluetooth earbuds are firmly connected before playing AD.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-start gap-3">
            <Moon className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-xs text-neutral-200 block">Enable Cinema Dimmer</strong>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Set screen brightness to minimum or use Pixapix Cinema Dimmer to prevent glare for patrons behind you.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-start gap-3">
            <VolumeX className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-xs text-neutral-200 block">Silence Notifications</strong>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Switch mobile device to Do Not Disturb to prevent notification rings or vibration rings during film.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-start gap-3">
            <Eye className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-xs text-neutral-200 block">Instant Blackout Mode</strong>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                If only listening to AD, activate Blackout Mode by tapping the moon icon to keep the screen pitch black.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* DRM & Legal Notice */}
      <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800/80 text-[11px] text-neutral-400 leading-relaxed font-mono">
        <p className="font-bold text-neutral-300 mb-1">LEGAL EXHIBITION COMPLIANCE NOTICE</p>
        Pixapix AD &amp; CC Player is an authorized accessibility conduit under the Rights of Persons with Disabilities Act (RPwD) 2016.
        The application does not store, broadcast, stream, or decrypt commercial video frames. Synchronization is achieved through
        passive acoustic frequency hashing. All package rights remain with respective producers and certified access creators.
      </div>
    </div>
  );
};
