/**
 * parseScores — converts the stored scores JSON string into a flat object
 * The DB scores column now stores a flat object with overall_score, pronunciation, etc.
 * at the top level. This function handles both old nested format and new flat format.
 */
export function parseScores(scoresJson) {
  if (!scoresJson) return null;

  let raw = null;
  try {
    raw = typeof scoresJson === "string" ? JSON.parse(scoresJson) : scoresJson;
  } catch {
    return null;
  }

  if (!raw) return null;

  // NEW flat format (audio_tasks.py saves flat scores directly)
  // Check if overall_score exists at top level
  if (typeof raw.overall_score === "number") {
    return {
      overall_score: raw.overall_score,
      pronunciation: raw.pronunciation ?? 0,
      fluency:       raw.fluency       ?? 0,
      grammar:       raw.grammar       ?? 0,
      confidence:    raw.confidence    ?? 0,
      clarity:       raw.clarity       ?? 0,
      communication: raw.communication ?? 0,
      word_count:    raw.word_count    ?? 0,
      filler_count:  raw.filler_count  ?? 0,
      vocab_richness: raw.vocab_richness ?? 0,
    };
  }

  // OLD nested format fallback: { overall: { overall_score, ... }, per_speaker: {} }
  if (raw.overall && typeof raw.overall.overall_score === "number") {
    return {
      overall_score: raw.overall.overall_score,
      pronunciation: raw.overall.pronunciation ?? 0,
      fluency:       raw.overall.fluency       ?? 0,
      grammar:       raw.overall.grammar       ?? 0,
      confidence:    raw.overall.confidence    ?? 0,
      clarity:       raw.overall.clarity       ?? 0,
      communication: raw.overall.communication ?? 0,
      word_count:    raw.overall.word_count    ?? 0,
      filler_count:  raw.overall.filler_count  ?? 0,
      vocab_richness: raw.overall.vocab_richness ?? 0,
    };
  }

  return null;
}

/**
 * scoreColor — returns a color string based on score value
 */
export function scoreColor(score) {
  if (score === null || score === undefined) return "#64748b";
  if (score >= 80) return "#22c55e";  // green
  if (score >= 60) return "#f59e0b";  // amber
  if (score >= 40) return "#f97316";  // orange
  return "#ef4444";                   // red
}

/**
 * scoreLabel — returns a text label based on score value
 */
export function scoreLabel(score) {
  if (score === null || score === undefined) return "—";
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Average";
  return "Needs Work";
}

/**
 * parseDiarization — safely parse diarization JSON
 */
export function parseDiarization(diarizationJson) {
  if (!diarizationJson) return [];
  try {
    const parsed = typeof diarizationJson === "string"
      ? JSON.parse(diarizationJson)
      : diarizationJson;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}