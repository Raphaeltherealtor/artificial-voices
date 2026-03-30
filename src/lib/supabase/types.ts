// Supabase database types
// Regenerate with: npx supabase gen types typescript --project-id YOUR_ID > src/lib/supabase/types.ts

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type LearnerProfile = {
  id: string;
  user_id: string;
  native_language: string;
  target_language: string;
  target_language_flag: string;
  current_level: "beginner" | "intermediate" | "advanced";
  preferred_mode: "guided" | "adaptive";
  confidence_score: number;
  weak_vocabulary: string[];
  weak_grammar: string[];
  pronunciation_issues: string[];
  completed_scenarios: string[];
  completed_story_chapters: string[];
  total_xp: number;
  streak_days: number;
  last_active_at: string;
  created_at: string;
  updated_at: string;
};

export type Session = {
  id: string;
  user_id: string;
  scenario_id: string;
  session_type: "scenario" | "story" | "camera" | "lesson";
  mode: "guided" | "adaptive" | "free";
  difficulty: "beginner" | "intermediate" | "advanced";
  mission_completed: boolean;
  xp_earned: number;
  started_at: string;
  ended_at: string | null;
};

export type TranscriptTurn = {
  id: string;
  session_id: string;
  user_id: string;
  speaker: "user" | "ai";
  text: string;
  text_english: string | null;
  latency_ms: number | null;
  corrections: string[];
  created_at: string;
};

export type SessionScore = {
  id: string;
  session_id: string;
  user_id: string;
  pronunciation: number;
  grammar: number;
  vocabulary: number;
  naturalness: number;
  mission_completed: boolean;
  strengths: string[];
  corrections: string[];
  next_step: string;
  created_at: string;
};

export type VocabularyProgress = {
  id: string;
  user_id: string;
  word_en: string;
  word_native: string;
  language: string;
  times_seen: number;
  times_correct: number;
  last_seen_at: string;
};

export type Database = {
  public: {
    Tables: {
      learner_profiles: {
        Row: LearnerProfile;
        Insert: Partial<LearnerProfile> & { user_id: string };
        Update: Partial<LearnerProfile>;
        Relationships: [];
      };
      sessions: {
        Row: Session;
        Insert: Partial<Session> & { user_id: string; scenario_id: string };
        Update: Partial<Session>;
        Relationships: [];
      };
      transcript_turns: {
        Row: TranscriptTurn;
        Insert: Partial<TranscriptTurn> & { session_id: string; user_id: string; speaker: "user" | "ai"; text: string };
        Update: Partial<TranscriptTurn>;
        Relationships: [];
      };
      session_scores: {
        Row: SessionScore;
        Insert: Partial<SessionScore> & { session_id: string; user_id: string };
        Update: Partial<SessionScore>;
        Relationships: [];
      };
      vocabulary_progress: {
        Row: VocabularyProgress;
        Insert: Partial<VocabularyProgress> & { user_id: string; word_en: string; word_native: string; language: string };
        Update: Partial<VocabularyProgress>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
