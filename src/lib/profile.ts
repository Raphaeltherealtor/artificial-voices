// Server-side helper — import only in Server Components or API routes
import { createClient } from "@/lib/supabase/server";
import type { LearnerProfile } from "@/lib/supabase/types";

export async function getProfile(): Promise<LearnerProfile | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("learner_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();
  return data ?? null;
}

export async function updateProfile(patch: Partial<LearnerProfile>): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("learner_profiles")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("user_id", user.id);
}
