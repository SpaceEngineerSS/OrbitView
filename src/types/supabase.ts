export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            users: {
                Row: {
                    id: string
                    email: string | null
                    full_name: string | null
                    avatar_url: string | null
                    created_at: string
                }
                Insert: {
                    id: string
                    email?: string | null
                    full_name?: string | null
                    avatar_url?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    email?: string | null
                    full_name?: string | null
                    avatar_url?: string | null
                    created_at?: string
                }
            }
            tle_cache: {
                Row: {
                    norad_id: string
                    name: string
                    line1: string
                    line2: string
                    updated_at: string
                }
                Insert: {
                    norad_id: string
                    name: string
                    line1: string
                    line2: string
                    updated_at?: string
                }
                Update: {
                    norad_id?: string
                    name?: string
                    line1?: string
                    line2?: string
                    updated_at?: string
                }
            }
            tracked_satellites: {
                Row: {
                    id: string
                    user_id: string
                    norad_id: string | null
                    notes: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    norad_id?: string | null
                    notes?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    norad_id?: string | null
                    notes?: string | null
                    created_at?: string
                }
            }
        }
    }
}
