import language_tool_python
import re

# Lazy load — only loads once
_tool = None

def _get_tool(lang="en-US"):
    global _tool
    if _tool is None:
        print("[grammar] Loading LanguageTool...")
        _tool = language_tool_python.LanguageTool(lang)
        print("[grammar] LanguageTool loaded OK")
    return _tool

LANG_MAP = {
    "en": "en-US",
    "hi": "hi",      # Hindi supported
    "te": "te",      # Telugu supported
    "ta": "ta",      # Tamil supported
    "kn": "kn",      # Kannada supported
    "mr": "mr",      # Marathi supported
}

def check_grammar(text: str, language: str = "en") -> dict:
    """
    Returns grammar errors, suggestions, and a corrected version.
    """
    if not text or not text.strip():
        return _empty_grammar()

    lang_code = LANG_MAP.get(language, "en-US")

    try:
        tool    = _get_tool(lang_code)
        matches = tool.check(text)

        errors = []
        for m in matches:
            errors.append({
                "message":     m.message,
                "context":     m.context,
                "offset":      m.offset,
                "length":      m.errorLength,
                "suggestions": m.replacements[:3],  # top 3 suggestions
                "rule_id":     m.ruleId,
                "category":    m.category,
            })

        corrected = language_tool_python.utils.correct(text, matches)

        # Grammar score — based on error density
        words       = len(text.split())
        error_count = len(errors)
        error_ratio = error_count / max(words, 1)
        grammar_score = max(0, min(100, round(100 - (error_ratio * 300))))

        return {
            "grammar_score":  grammar_score,
            "error_count":    error_count,
            "errors":         errors[:10],  # max 10 shown
            "corrected_text": corrected,
            "original_text":  text,
        }

    except Exception as e:
        print(f"[grammar] Error: {e}")
        return _empty_grammar()


def _empty_grammar():
    return {
        "grammar_score":  75,
        "error_count":    0,
        "errors":         [],
        "corrected_text": "",
        "original_text":  "",
    }