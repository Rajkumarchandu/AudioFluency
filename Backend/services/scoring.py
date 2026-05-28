# Add at top of scoring.py
from services.grammar_checker      import check_grammar
from services.pronunciation_scorer import score_pronunciation
from services.topic_detector       import detect_topic
# Note: emotion_detector is called separately in audio_tasks.py
# because it needs the audio file, not just text



import re

# Filler words per language
FILLERS = {
    "en": r'\b(um|uh|er|ah|like|you know|basically|literally|actually|so|right)\b',
    "hi": r'\b(मतलब|वो|हम्म|अच्छा|बस|तो|ना|हाँ|अरे|यानी|सही|ठीक है)\b',
    "te": r'\b(అంటే|అది|సరే|హా|ఏమో|అలా|ఇది|కదా|మరి)\b',
    "ta": r'\b(அதாவது|சரி|ஆமா|இல்ல|மாதிரி|அது|இது)\b',
    "kn": r'\b(ಅಂದರೆ|ಸರಿ|ಹೌದು|ಅದು|ಇದು|ಮಾತಾಡಿ)\b',
    "mr": r'\b(म्हणजे|बरं|हो|नाही|तर|असं)\b',
}

# Common pronunciation mistakes per language
# Format: { "wrong": "correct" }
PRONUNCIATION_CORRECTIONS = {
    "en": {
        "gonna": "going to",
        "wanna": "want to",
        "gotta": "got to",
        "kinda": "kind of",
        "sorta": "sort of",
        "dunno": "don't know",
        "lemme": "let me",
        "gimme": "give me",
        "cuz": "because",
        "cos": "because",
        "ain't": "is not",
        "ya": "you",
        "yep": "yes",
        "nope": "no",
        "hafta": "have to",
        "shoulda": "should have",
        "woulda": "would have",
        "coulda": "could have",
        "tryna": "trying to",
        "finna": "going to",
    },
    "hi": {
        "क्या": "क्या",           # correct already
        "नई": "नहीं",             # common shortening
        "बोलना है": "बोलना है",
        "मत्लब": "मतलब",          # mispronounced
        "इस्कूल": "स्कूल",        # extra vowel
        "अक्सर": "अक्सर",
        "कैसे हो": "कैसे हैं",    # informal → formal
        "बहुत अच्चा": "बहुत अच्छा",
        "हमारा": "हमारा",
        "अपना": "अपना",
        "सक्ता": "सकता",
        "सक्ती": "सकती",
        "करेगा": "करेगा",
        "मिलेगा": "मिलेगा",
    },
    "te": {
        "ఏంటి": "ఏమిటి",          # informal → formal
        "ఎంటి": "ఏమిటి",
        "అడిగాడు": "అడిగాడు",
        "చేస్తాడు": "చేస్తాడు",
        "వస్తాడు": "వస్తాడు",
        "చెప్తాడు": "చెప్తాడు",   # shortening
        "చెప్పాడు": "చెప్పాడు",
        "పోతాడు": "పోతాడు",
        "ఇస్తాడు": "ఇస్తాడు",
        "చూస్తాడు": "చూస్తాడు",
    },
}


def compute_scores(transcription: str, diarization: list, language: str = None) -> dict:
    if not transcription:
        return _empty_scores()

    lang    = (language or "en").lower()
    overall = _score_text(transcription, lang)

    # Pronunciation correction (existing)
    corrections = detect_pronunciation_errors(transcription, lang)

    # NEW — Real grammar check
    grammar_result = check_grammar(transcription, lang)

    # NEW — Phoneme-based pronunciation
    phoneme_result = score_pronunciation(transcription, lang)

    # NEW — Topic detection
    topic_result = detect_topic(transcription, lang)

    # Override grammar score with real grammar check
    if grammar_result["error_count"] > 0:
        overall["grammar"] = grammar_result["grammar_score"]
        overall["overall_score"] = round((
            overall["pronunciation"] + overall["fluency"] +
            overall["clarity"] + overall["confidence"] +
            overall["grammar"] + overall["communication"]
        ) / 6)

    # Override pronunciation with phoneme score
    if phoneme_result["phoneme_score"] < overall["pronunciation"]:
        overall["pronunciation"] = phoneme_result["phoneme_score"]

    speaker_scores = {}
    if diarization:
        speakers = list(set(seg["speaker"] for seg in diarization))
        for speaker in speakers:
            speaker_segs = [s for s in diarization if s["speaker"] == speaker]
            total_time   = sum(s["end"] - s["start"] for s in speaker_segs)
            speaker_scores[speaker] = {
                **_score_text(transcription, lang),
                "speaking_time_seconds": round(total_time, 2),
                "segment_count":         len(speaker_segs)
            }

    return {
        "overall":          overall,
        "per_speaker":      speaker_scores,
        "summary":          _generate_summary(overall),
        "language":         lang,
        "corrections":      corrections,
        "corrected_text":   apply_corrections(transcription, lang),

        # NEW fields
        "grammar_check":    grammar_result,
        "phoneme_analysis": phoneme_result,
        "topic":            topic_result,
    }

def detect_pronunciation_errors(text: str, lang: str = "en") -> list:
    """
    Scans transcription for known mispronunciations.
    Returns list of { wrong, correct, position } dicts.
    """
    corrections_map = PRONUNCIATION_CORRECTIONS.get(lang, {})
    errors = []
    words = text.split()

    for i, word in enumerate(words):
        clean = word.lower().strip('.,!?।|')
        if clean in corrections_map:
            errors.append({
                "wrong":    word,
                "correct":  corrections_map[clean],
                "position": i,
                "context":  " ".join(words[max(0, i-2): i+3])
            })

    return errors


def apply_corrections(text: str, lang: str = "en") -> str:
    """
    Returns the full corrected version of the transcription
    with all known mispronunciations fixed.
    """
    corrections_map = PRONUNCIATION_CORRECTIONS.get(lang, {})
    corrected = text

    for wrong, correct in corrections_map.items():
        # Case-insensitive replace
        pattern = re.compile(re.escape(wrong), re.IGNORECASE)
        corrected = pattern.sub(correct, corrected)

    return corrected


def _score_text(text: str, lang: str = "en") -> dict:
    words = text.strip().split()
    word_count = len(words)
    if word_count == 0:
        return _zero_scores()

    sentences = re.split(r'[.!?।|]+', text.strip())
    sentences = [s.strip() for s in sentences if s.strip()]
    sentence_count = len(sentences) or 1

    filler_pattern = FILLERS.get(lang, FILLERS["en"])
    fillers = re.findall(filler_pattern, text, re.IGNORECASE)
    filler_count = len(fillers)
    filler_ratio = filler_count / word_count

    avg_words = word_count / sentence_count

    unique_words = len(set(w.lower().strip('.,!?।|') for w in words))
    vocab_richness = unique_words / word_count

    repeated = sum(
        1 for i in range(1, len(words))
        if words[i].lower() == words[i-1].lower()
    )
    repeat_ratio = repeated / word_count

    # Pronunciation score drops based on error count
    corrections_map = PRONUNCIATION_CORRECTIONS.get(lang, {})
    error_count = sum(
        1 for w in words
        if w.lower().strip('.,!?।|') in corrections_map
    )
    error_ratio = error_count / word_count

    fluency       = _clamp(80 - (filler_ratio * 100) - (repeat_ratio * 50))
    clarity       = _clamp(70 + (vocab_richness * 30) - (filler_ratio * 50))
    grammar       = _clamp(75 - (repeat_ratio * 40) + (min(avg_words, 15) * 1.5))
    confidence    = _clamp(65 + (avg_words * 1.2) - (filler_ratio * 60))
    pronunciation = _clamp(90 - (error_ratio * 200) - (repeat_ratio * 30))  # ← uses real errors now
    communication = _clamp((fluency + clarity + grammar + confidence) / 4 + 3)

    return {
        "pronunciation":  round(pronunciation),
        "fluency":        round(fluency),
        "clarity":        round(clarity),
        "confidence":     round(confidence),
        "grammar":        round(grammar),
        "communication":  round(communication),
        "overall_score":  round((pronunciation + fluency + clarity + confidence + grammar + communication) / 6),
        "word_count":     word_count,
        "sentence_count": sentence_count,
        "filler_count":   filler_count,
        "vocab_richness": round(vocab_richness * 100, 1),
        "language":       lang,
        "error_count":    error_count,
    }


def _clamp(val, lo=0, hi=100):
    return max(lo, min(hi, val))


def _zero_scores():
    return {
        "pronunciation": 0, "fluency": 0, "clarity": 0,
        "confidence": 0, "grammar": 0, "communication": 0,
        "overall_score": 0, "word_count": 0, "sentence_count": 0,
        "filler_count": 0, "vocab_richness": 0,
        "language": "unknown", "error_count": 0
    }


def _empty_scores():
    return {
        "overall":        _zero_scores(),
        "per_speaker":    {},
        "summary":        "No transcription available.",
        "language":       "unknown",
        "corrections":    [],
        "corrected_text": "",
    }


def _generate_summary(scores: dict) -> str:
    overall = scores.get("overall_score", 0)
    lang = scores.get("language", "en")

    weak = []
    if scores.get("fluency", 100) < 60:       weak.append("fluency")
    if scores.get("clarity", 100) < 60:       weak.append("clarity")
    if scores.get("grammar", 100) < 60:       weak.append("grammar")
    if scores.get("confidence", 100) < 60:    weak.append("confidence")
    if scores.get("pronunciation", 100) < 70: weak.append("pronunciation")

    if overall >= 80:
        base = "Excellent performance overall."
    elif overall >= 60:
        base = "Good performance with room for improvement."
    elif overall >= 40:
        base = "Average performance. Consistent practice recommended."
    else:
        base = "Needs significant improvement."

    if weak:
        base += f" Focus areas: {', '.join(weak)}."

    lang_names = {
        "hi": "Hindi", "te": "Telugu", "en": "English",
        "ta": "Tamil", "kn": "Kannada", "mr": "Marathi"
    }
    base += f" (Analyzed in {lang_names.get(lang, lang.upper())})"

    return base