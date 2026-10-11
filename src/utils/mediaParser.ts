export interface ParsedCue {
  id: string;
  startTime: number;
  endTime: number;
  timeString: string;
  speaker?: string;
  soundEffect?: string;
  text: string;
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function parseTimestampToSeconds(ts: string): number {
  const clean = ts.trim().replace(',', '.');
  const parts = clean.split(':');
  if (parts.length === 3) {
    const hours = parseFloat(parts[0]) || 0;
    const minutes = parseFloat(parts[1]) || 0;
    const seconds = parseFloat(parts[2]) || 0;
    return hours * 3600 + minutes * 60 + seconds;
  } else if (parts.length === 2) {
    const minutes = parseFloat(parts[0]) || 0;
    const seconds = parseFloat(parts[1]) || 0;
    return minutes * 60 + seconds;
  }
  return parseFloat(clean) || 0;
}

export function formatSecondsToTimecode(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  const ms = Math.floor((secs % 1) * 1000);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

export function parseSubtitleText(rawText: string): ParsedCue[] {
  const cues: ParsedCue[] = [];
  if (!rawText) return cues;

  // Normalize line breaks
  const normalized = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = normalized.split(/\n\s*\n/);

  let cueIndex = 1;

  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    let timeLineIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('-->')) {
        timeLineIndex = i;
        break;
      }
    }

    if (timeLineIndex === -1) continue;

    const timeLine = lines[timeLineIndex];
    const [startRaw, endRaw] = timeLine.split('-->');
    if (!startRaw || !endRaw) continue;

    const startTime = parseTimestampToSeconds(startRaw);
    const endTime = parseTimestampToSeconds(endRaw.split(' ')[0] || endRaw);

    const textLines = lines.slice(timeLineIndex + 1);
    let fullText = textLines.join(' ');

    // Extract speaker if indicated by [SPEAKER] or SPEAKER: or <v Speaker>
    let speaker: string | undefined;
    let soundEffect: string | undefined;

    // Check voice tag <v Speaker>
    const vMatch = fullText.match(/<v\s+([^>]+)>(.*)/i);
    if (vMatch) {
      speaker = vMatch[1];
      fullText = vMatch[2];
    }

    // Check bracketed sound effect or speaker: [Dramatic music], [BHAIRAVA]
    const bracketMatch = fullText.match(/^\[(.*?)\]\s*(.*)$/);
    if (bracketMatch) {
      const inside = bracketMatch[1];
      if (inside.toLowerCase().includes('music') || inside.toLowerCase().includes('sound') || inside.toLowerCase().includes('noise') || inside.toLowerCase().includes('blast')) {
        soundEffect = inside;
      } else {
        speaker = inside;
      }
      fullText = bracketMatch[2] || fullText;
    }

    // Check Speaker: text
    const colonMatch = fullText.match(/^([A-Z0-9\s]{2,20}):\s*(.*)$/);
    if (colonMatch && !speaker) {
      speaker = colonMatch[1].trim();
      fullText = colonMatch[2];
    }

    // Strip HTML tags like <b>, <i>, <font>
    fullText = fullText.replace(/<[^>]+>/g, '').trim();

    if (fullText || soundEffect) {
      cues.push({
        id: `cue-${cueIndex++}`,
        startTime,
        endTime,
        timeString: `${startRaw.trim()} --> ${endRaw.trim()}`,
        speaker,
        soundEffect,
        text: fullText || soundEffect || '[Audio cue]',
      });
    }
  }

  return cues;
}

export function detectMediaFormat(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'srt':
      return 'SRT';
    case 'vtt':
      return 'VTT';
    case 'ttml':
    case 'xml':
    case 'dfxp':
      return 'TTML';
    case 'mp3':
      return 'MP3';
    case 'wav':
      return 'WAV';
    case 'aac':
      return 'AAC';
    case 'm4a':
      return 'M4A';
    case 'flac':
      return 'FLAC';
    case 'ogg':
      return 'OGG';
    default:
      return ext?.toUpperCase() || 'UNKNOWN';
  }
}

export const SAMPLE_HINDI_SRT = `1
00:00:01,200 --> 00:00:05,800
[धीमा गूंजता हुआ वायुमंडलीय संगीत]

2
00:00:06,100 --> 00:00:09,400
भैरव: काशी का यह अंतिम द्वार कोई पार नहीं कर सकता।

3
00:00:10,000 --> 00:00:14,200
[बुज्जी के इंजन की तीव्र गड़गड़ाहट]
बुज्जी: भैरव, ऊर्जा स्तर शत-प्रतिशत सामान्य है। लक्ष्य सामने है।

4
00:00:15,000 --> 00:00:19,800
अश्वत्थामा: सदियों की प्रतीक्षा अब समाप्त होने को है।

5
00:00:20,500 --> 00:00:26,000
[दिव्य शंखनाद और पराक्रमी गर्जना]
`;

export const SAMPLE_ENGLISH_SRT = `1
00:00:01,200 --> 00:00:05,800
[Low resonating atmospheric orchestral score]

2
00:00:06,100 --> 00:00:09,400
BHAIRAVA: No one steps past the sacred eastern gates of Kashi.

3
00:00:10,000 --> 00:00:14,200
[BUJJI thrusters roar to maximum output]
BUJJI: Energy matrix at one hundred percent. Target locked.

4
00:00:15,000 --> 00:00:19,800
ASHWATTHAMA: Three thousand years of waiting now reaches its dawn.

5
00:00:20,500 --> 00:00:26,000
[Divine conch shell resonates across the ruined arena]
`;

export const SAMPLE_AUDIO_DESCRIPTION_CUES = [
  {
    id: 'ad-cue-1',
    startTime: 0,
    endTime: 5.5,
    text: 'A scorched crimson sun sets behind the towering fortress of Complex. Sand sweeps across the abandoned outpost.',
    category: 'scene_setting',
  },
  {
    id: 'ad-cue-2',
    startTime: 6.0,
    endTime: 9.8,
    text: 'Bhairava adjusts his cybernetic gauntlet, stepping onto the metal ledge while scanning the distant horizon.',
    category: 'character_action',
  },
  {
    id: 'ad-cue-3',
    startTime: 10.5,
    endTime: 14.5,
    text: 'Bujji’s vehicle lights flicker golden amber as three titanium wheels rotate into combat configuration.',
    category: 'prop_detail',
  },
  {
    id: 'ad-cue-4',
    startTime: 15.0,
    endTime: 21.0,
    text: 'A towering silhouette wrapped in ragged bandages emerges from the shadows of the cave, gripping an ancient divine staff.',
    category: 'character_action',
  },
];
