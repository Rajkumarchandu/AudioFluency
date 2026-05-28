import re
import os

# Phoneme-based pronunciation scoring using
# edit distance between expected and actual word pronunciations

def _levenshtein(s1: str, s2: str) -> int:
    """Edit distance between two strings."""
    if len(s1) < len(s2):
        return _levenshtein(s2, s1)
    if len(s2) == 0:
        return len(s1)
    prev = list(range(len(s2) + 1))
    for i, c1 in enumerate(s1):
        curr = [i + 1]
        for j, c2 in enumerate(s2):
            curr.append(min(prev[j + 1] + 1, curr[j] + 1,
                            prev[j] + (c1 != c2)))
        prev = curr
    return prev[len(s2)]


def _word_similarity(w1: str, w2: str) -> float:
    """0.0 = completely different, 1.0 = identical."""
    w1, w2 = w1.lower().strip(), w2.lower().strip()
    if w1 == w2:
        return 1.0
    max_len = max(len(w1), len(w2), 1)
    dist    = _levenshtein(w1, w2)
    return max(0.0, 1.0 - dist / max_len)


# Common word pairs — expected vs common mispronunciation
PRONUNCIATION_PAIRS = {
    "en": [
        ("because",     ["cuz", "cos", "becoz"]),
        ("going to",    ["gonna", "gunna"]),
        ("want to",     ["wanna"]),
        ("have to",     ["hafta", "hav to"]),
        ("should have", ["shoulda", "should of"]),
        ("would have",  ["woulda", "would of"]),
        ("could have",  ["coulda", "could of"]),
        ("let me",      ["lemme"]),
        ("give me",     ["gimme"]),
        ("kind of",     ["kinda"]),
        ("sort of",     ["sorta"]),
        ("don't know",  ["dunno"]),
        ("trying to",   ["tryna"]),
        ("yes",         ["yep", "ya", "yah"]),
        ("no",          ["nope", "nah"]),
        ("is not",      ["ain't", "aint"]),
    ],
    "hi": [
        ("नहीं",    ["नई", "नहि"]),
        ("मतलब",   ["मत्लब", "मतब"]),
        ("स्कूल",  ["इस्कूल", "इस्कुल"]),
        ("सकता",   ["सक्ता", "सकता"]),
        ("क्योंकि", ["क्यूंकि", "क्युंकि"]),
    ],
    "te": [
        ("ఏమిటి",   ["ఏంటి", "ఎంటి"]),
        ("చేస్తాను", ["చేస్తా", "చేస్తన్"]),
        ("వస్తాను",  ["వస్తా"]),
    ],
}


def score_pronunciation(transcription: str, language: str = "en") -> dict:
    """
    Scores pronunciation by detecting mispronounced words
    and computing an overall pronunciation accuracy score.
    """
    if not transcription:
        return _empty_pronunciation()

    words  = transcription.lower().split()
    pairs  = PRONUNCIATION_PAIRS.get(language, PRONUNCIATION_PAIRS["en"])
    errors = []

    for correct, variants in pairs:
        for variant in variants:
            # Check if variant appears in transcription
            pattern = re.compile(re.escape(variant), re.IGNORECASE)
            if pattern.search(transcription):
                # Find position
                for i, word in enumerate(words):
                    if _word_similarity(word, variant) > 0.85:
                        errors.append({
                            "spoken":    word,
                            "expected":  correct,
                            "variant":   variant,
                            "position":  i,
                            "context":   " ".join(words[max(0, i-2):i+3]),
                            "similarity": round(_word_similarity(word, correct) * 100, 1),
                        })
                        break

    # Score: start at 100, deduct per error
    word_count     = max(len(words), 1)
    error_ratio    = len(errors) / word_count
    phoneme_score  = max(0, min(100, round(100 - (error_ratio * 400))))

    # Also compute average word clarity (how clearly words are formed)
    unique_ratio   = len(set(words)) / word_count
    clarity_bonus  = min(10, round(unique_ratio * 10))
    final_score    = min(100, phoneme_score + clarity_bonus)

    return {
        "phoneme_score":    final_score,
        "error_count":      len(errors),
        "errors":           errors[:10],
        "corrected_text":   _apply_corrections(transcription, pairs),
        "word_count":       word_count,
        "clarity_bonus":    clarity_bonus,
    }


def _apply_corrections(text: str, pairs: list) -> str:
    corrected = text
    for correct, variants in pairs:
        for variant in variants:
            pattern   = re.compile(re.escape(variant), re.IGNORECASE)
            corrected = pattern.sub(correct, corrected)
    return corrected


def _empty_pronunciation():
    return {
        "phoneme_score":  90,
        "error_count":    0,
        "errors":         [],
        "corrected_text": "",
        "word_count":     0,
        "clarity_bonus":  0,
    }