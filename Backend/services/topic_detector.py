import re
from collections import Counter

# Topic keywords per domain
TOPICS = {
    "Technology": [
        "technology", "computer", "internet", "software", "hardware",
        "artificial intelligence", "ai", "machine learning", "robot",
        "digital", "smartphone", "app", "data", "cyber", "programming",
        "code", "algorithm", "network", "cloud", "blockchain",
        "तकनीक", "कंप्यूटर", "इंटरनेट", "సాంకేతికత", "కంప్యూటర్"
    ],
    "Education": [
        "education", "school", "student", "teacher", "learning", "study",
        "university", "college", "exam", "curriculum", "classroom",
        "knowledge", "skill", "training", "degree", "literacy",
        "शिक्षा", "विद्यालय", "छात्र", "విద్య", "పాఠశాల"
    ],
    "Environment": [
        "environment", "climate", "pollution", "nature", "green",
        "sustainability", "carbon", "global warming", "ecosystem",
        "renewable", "energy", "forest", "water", "plastic", "recycle",
        "पर्यावरण", "जलवायु", "పర్యావరణం", "వాతావరణం"
    ],
    "Health": [
        "health", "medical", "disease", "hospital", "doctor", "medicine",
        "vaccine", "mental health", "fitness", "nutrition", "exercise",
        "pandemic", "virus", "treatment", "patient", "wellbeing",
        "स्वास्थ्य", "चिकित्सा", "ఆరోగ్యం", "వైద్యం"
    ],
    "Politics & Society": [
        "government", "politics", "democracy", "election", "policy",
        "law", "rights", "freedom", "social", "community", "justice",
        "equality", "corruption", "parliament", "citizen", "vote",
        "सरकार", "राजनीति", "ప్రభుత్వం", "రాజకీయం"
    ],
    "Economy": [
        "economy", "business", "market", "trade", "finance", "money",
        "inflation", "gdp", "employment", "job", "startup", "investment",
        "poverty", "wealth", "bank", "currency", "tax",
        "अर्थव्यवस्था", "व्यापार", "ఆర్థికం", "వ్యాపారం"
    ],
    "Sports": [
        "sport", "cricket", "football", "game", "player", "team",
        "tournament", "champion", "athlete", "coach", "match", "score",
        "खेल", "क्रिकेट", "క్రీడ", "క్రికెట్"
    ],
    "Culture & Arts": [
        "culture", "art", "music", "film", "dance", "tradition",
        "festival", "literature", "language", "heritage", "religion",
        "संस्कृति", "कला", "సంస్కృతి", "కళ"
    ],
}


def detect_topic(transcription: str, language: str = "en") -> dict:
    """
    Detects the main topic(s) being discussed in the transcription.
    Returns top topics with confidence scores.
    """
    if not transcription or len(transcription.strip()) < 10:
        return _empty_topic()

    text_lower = transcription.lower()
    words      = re.findall(r'\b\w+\b', text_lower)
    word_count = max(len(words), 1)

    topic_scores = {}

    for topic, keywords in TOPICS.items():
        hits  = 0
        found = []
        for kw in keywords:
            kw_lower = kw.lower()
            if kw_lower in text_lower:
                count  = text_lower.count(kw_lower)
                hits  += count
                if kw_lower not in found:
                    found.append(kw_lower)

        if hits > 0:
            # Score based on keyword density
            density = hits / word_count
            score   = min(100, round(density * 500 + len(found) * 5))
            topic_scores[topic] = {
                "score":    score,
                "hits":     hits,
                "keywords": found[:5],
            }

    if not topic_scores:
        return _empty_topic()

    # Sort by score
    sorted_topics = sorted(
        topic_scores.items(),
        key=lambda x: x[1]["score"],
        reverse=True
    )

    primary_topic   = sorted_topics[0][0]
    secondary_topic = sorted_topics[1][0] if len(sorted_topics) > 1 else None

    # Build summary
    summary = f"The debate appears to be about {primary_topic}."
    if secondary_topic:
        summary += f" Secondary theme: {secondary_topic}."

    return {
        "primary_topic":   primary_topic,
        "secondary_topic": secondary_topic,
        "all_topics":      {t: v["score"] for t, v in sorted_topics[:5]},
        "keywords_found":  sorted_topics[0][1]["keywords"],
        "summary":         summary,
        "confidence":      min(100, sorted_topics[0][1]["score"]),
    }


def _empty_topic():
    return {
        "primary_topic":   "General",
        "secondary_topic": None,
        "all_topics":      {"General": 50},
        "keywords_found":  [],
        "summary":         "Topic could not be determined from the transcription.",
        "confidence":      0,
    }