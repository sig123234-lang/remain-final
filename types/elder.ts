export type ElderGender =
  | "female"
  | "male"
  | "other";

export interface ElderRecord {
  id: string;
  full_name: string;
  display_name?: string | null;
  age?: number | null;
  birth_year?: number | null;
  gender?: ElderGender | null;
  facility_name?: string | null;
  diagnosis?: string | null;
  note?: string | null;
  entry_code?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string | null;
}

export interface CreateElderParams {
  fullName: string;
  displayName?: string;
  age?: number;
  birthYear?: number;
  gender?: ElderGender;
  facilityName?: string;
  diagnosis?: string;
  note?: string;
}
