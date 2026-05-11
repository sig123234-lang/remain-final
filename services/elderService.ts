import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  CreateElderParams,
  ElderRecord,
} from "@/types/elder";

const ELDER_SELECT = `
  id,
  full_name,
  display_name,
  age,
  birth_year,
  gender,
  facility_name,
  diagnosis,
  note,
  is_active,
  created_at,
  updated_at
`;

export async function listElders() {
  const supabase =
    getSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("elders")
    .select(ELDER_SELECT)
    .eq("is_active", true)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return (data ?? []) as ElderRecord[];
}

export async function createElder({
  fullName,
  displayName,
  age,
  birthYear,
  gender,
  facilityName,
  diagnosis,
  note,
}: CreateElderParams) {
  const supabase =
    getSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("elders")
    .insert({
      full_name: fullName,
      display_name: displayName,
      age,
      birth_year: birthYear,
      gender,
      facility_name: facilityName,
      diagnosis,
      note,
      is_active: true,
    })
    .select(ELDER_SELECT)
    .single();

  if (error) {
    throw error;
  }

  return data as ElderRecord;
}

export async function getElder(
  elderId: string
) {
  const supabase =
    getSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("elders")
    .select(ELDER_SELECT)
    .eq("id", elderId)
    .single();

  if (error) {
    throw error;
  }

  return data as ElderRecord;
}

export async function listEldersByIds(
  elderIds: string[]
) {
  if (elderIds.length === 0) {
    return [];
  }

  const supabase =
    getSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("elders")
    .select(ELDER_SELECT)
    .in("id", elderIds);

  if (error) {
    throw error;
  }

  return (data ?? []) as ElderRecord[];
}
