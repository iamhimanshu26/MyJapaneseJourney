# Japanese Learning Platform — Planning Document

**Status:** Draft  
**Last updated:** March 2025

---

## 1. Vision & Goals

A **multi-user, AI-enhanced Japanese learning platform** where:

- Anyone can learn Japanese from zero (N5) to advanced (N1)
- Each user has their own progress, level, and goals
- Multiple users can use the platform at the same time (Person A at N5, Person B at N3)
- Learning is **interactive** and covers **grammar, vocabulary, reading, and listening**
- Content leverages **free resources** from the internet
- AI assists with practice, explanations, and personalized feedback

---

## 2. Core Concepts

### 2.1 Multi-User, Individual Progress

| User | Level | Goal | What they do |
|------|-------|------|--------------|
| Person A | N5 | Start Japanese journey | Basic vocab, simple grammar, hiragana/katakana |
| Person B | N3 | JLPT N3 preparation | Grammar drills, reading, listening practice |
| Person C | N1 | Maintain / polish | Advanced reading, nuance, listening comprehension |

Each user:
- Has a **profile** (level, progress, goals)
- Gets **personalized content** and exercises
- Can log in and continue where they left off
- Uses the app **at the same time** as others without conflict

### 2.2 Four Skills + Interactive Learning

| Skill | Interactive Ideas |
|-------|-------------------|
| **Vocabulary** | Flashcards, fill-in-the-blank, matching, AI-generated sentences |
| **Grammar** | Pattern practice, sentence building, error correction, AI explanations |
| **Reading** | Graded passages, comprehension questions, AI-generated readings |
| **Listening** | Audio clips + transcripts, dictation, AI-generated dialogue practice |

### 2.3 JLPT Alignment (N5 → N1)

- Content organized by **JLPT level**
- Users can set target level (e.g. "I'm aiming for N3")
- Progress tracked per level and per skill

### 2.4 "Heard New Word / Grammar" — Lookup & Save Feature

**Real-world learning:** User hears a new word or grammar (in a conversation, anime, song, podcast, etc.) and wants to quickly look it up.

| What the user does | What the platform does |
|--------------------|------------------------|
| Searches for the word/grammar (Japanese or romaji) | Returns: **concise explanation**, **example sentences**, **JLPT level** (N5–N1) |
| If word/grammar **exists** in platform | Show from DB; user can save to "My Discovered" list |
| If word/grammar **does not exist** | AI generates the info → **store it** in the platform for future use |
| Saves a word | Organize in "My Discovered Vocab" → **grouped by level** (N5, N4, N3, …) |

**Vocabulary-specific UI:**

- Prominent entry point: **"Heard New Vocab — Find Here more about it"**
  - Always visible (e.g. on Dashboard, Vocab section, or a floating quick-search)
  - User types what they heard → instant lookup
- After lookup → user can **save** the word to their personal list
- Saved words appear in **level-based sections**: "My N5 words", "My N4 words", etc.

**Grammar:** Same flow — search, get explanation/examples/level, save if new, store in platform if not already there.

---

*See full plan in this file. Summary: Vision, 4 skills, JLPT N5–N1, Heard New Vocab feature, Phases 1–3, Tech stack (React, Supabase, Gemini), Content structure, Risks.*
