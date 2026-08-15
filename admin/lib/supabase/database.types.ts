export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      admins: {
        Row: {
          admin_level: string
          created_at: string
          id: string
        }
        Insert: {
          admin_level?: string
          created_at?: string
          id: string
        }
        Update: {
          admin_level?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admins_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attribute_definitions: {
        Row: {
          category: string
          display_name: string
          id: number
          key: string
          sort_order: number
        }
        Insert: {
          category: string
          display_name: string
          id?: never
          key: string
          sort_order: number
        }
        Update: {
          category?: string
          display_name?: string
          id?: never
          key?: string
          sort_order?: number
        }
        Relationships: []
      }
      attribute_position_weights: {
        Row: {
          attribute_id: number
          position: Database["public"]["Enums"]["position_code"]
          weight: number
        }
        Insert: {
          attribute_id: number
          position: Database["public"]["Enums"]["position_code"]
          weight: number
        }
        Update: {
          attribute_id?: number
          position?: Database["public"]["Enums"]["position_code"]
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "attribute_position_weights_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "attribute_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          player_id: string
          scout_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          player_id: string
          scout_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          player_id?: string
          scout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_scout_id_fkey"
            columns: ["scout_id"]
            isOneToOne: false
            referencedRelation: "scouts"
            referencedColumns: ["id"]
          },
        ]
      }
      countries: {
        Row: {
          code: string
          is_active: boolean
          name: string
          region: string
        }
        Insert: {
          code: string
          is_active?: boolean
          name: string
          region: string
        }
        Update: {
          code?: string
          is_active?: boolean
          name?: string
          region?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          attachment_path: string | null
          body: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          attachment_path?: string | null
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          attachment_path?: string | null
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      news_posts: {
        Row: {
          author_id: string | null
          body: string
          cover_image_path: string | null
          created_at: string
          id: string
          is_published: boolean
          published_at: string
          title: string
          trial_id: string | null
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          body: string
          cover_image_path?: string | null
          created_at?: string
          id?: string
          is_published?: boolean
          published_at?: string
          title: string
          trial_id?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          body?: string
          cover_image_path?: string | null
          created_at?: string
          id?: string
          is_published?: boolean
          published_at?: string
          title?: string
          trial_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "news_posts_trial_id_fkey"
            columns: ["trial_id"]
            isOneToOne: false
            referencedRelation: "trials"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          data: Json | null
          id: string
          profile_id: string
          read_at: string | null
          title: string
          type: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          profile_id: string
          read_at?: string | null
          title: string
          type: string
        }
        Update: {
          body?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          profile_id?: string
          read_at?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      player_attribute_score_history: {
        Row: {
          attribute_id: number
          confidence: string
          id: number
          job_id: string | null
          player_id: string
          recorded_at: string
          source_video_id: string | null
          value: number
        }
        Insert: {
          attribute_id: number
          confidence: string
          id?: never
          job_id?: string | null
          player_id: string
          recorded_at?: string
          source_video_id?: string | null
          value: number
        }
        Update: {
          attribute_id?: number
          confidence?: string
          id?: never
          job_id?: string | null
          player_id?: string
          recorded_at?: string
          source_video_id?: string | null
          value?: number
        }
        Relationships: []
      }
      player_attribute_scores: {
        Row: {
          attribute_id: number
          confidence: string
          job_id: string | null
          player_id: string
          source_video_id: string | null
          updated_at: string
          value: number
        }
        Insert: {
          attribute_id: number
          confidence: string
          job_id?: string | null
          player_id: string
          source_video_id?: string | null
          updated_at?: string
          value: number
        }
        Update: {
          attribute_id?: number
          confidence?: string
          job_id?: string | null
          player_id?: string
          source_video_id?: string | null
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "player_attribute_scores_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "attribute_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_attribute_scores_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "video_analysis_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_attribute_scores_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_attribute_scores_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_attribute_scores_source_video_id_fkey"
            columns: ["source_video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          bio: string | null
          club: string | null
          created_at: string
          date_of_birth: string | null
          facebook_url: string | null
          gender: string | null
          height_cm: number | null
          id: string
          instagram_handle: string | null
          is_goalkeeper: boolean | null
          jersey_number: number | null
          nationality_code: string | null
          overall_rating: number | null
          preferred_foot: string | null
          primary_position: Database["public"]["Enums"]["position_code"] | null
          profile_completed: boolean
          secondary_position:
            | Database["public"]["Enums"]["position_code"]
            | null
          tiktok_handle: string | null
          updated_at: string
          weight_kg: number | null
          years_playing: number | null
          youtube_url: string | null
        }
        Insert: {
          bio?: string | null
          club?: string | null
          created_at?: string
          date_of_birth?: string | null
          facebook_url?: string | null
          gender?: string | null
          height_cm?: number | null
          id: string
          instagram_handle?: string | null
          is_goalkeeper?: boolean | null
          jersey_number?: number | null
          nationality_code?: string | null
          overall_rating?: number | null
          preferred_foot?: string | null
          primary_position?: Database["public"]["Enums"]["position_code"] | null
          profile_completed?: boolean
          secondary_position?:
            | Database["public"]["Enums"]["position_code"]
            | null
          tiktok_handle?: string | null
          updated_at?: string
          weight_kg?: number | null
          years_playing?: number | null
          youtube_url?: string | null
        }
        Update: {
          bio?: string | null
          club?: string | null
          created_at?: string
          date_of_birth?: string | null
          facebook_url?: string | null
          gender?: string | null
          height_cm?: number | null
          id?: string
          instagram_handle?: string | null
          is_goalkeeper?: boolean | null
          jersey_number?: number | null
          nationality_code?: string | null
          overall_rating?: number | null
          preferred_foot?: string | null
          primary_position?: Database["public"]["Enums"]["position_code"] | null
          profile_completed?: boolean
          secondary_position?:
            | Database["public"]["Enums"]["position_code"]
            | null
          tiktok_handle?: string | null
          updated_at?: string
          weight_kg?: number | null
          years_playing?: number | null
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "players_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_nationality_code_fkey"
            columns: ["nationality_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
        ]
      }
      profile_views: {
        Row: {
          id: number
          viewed_at: string
          viewed_day: string | null
          viewed_profile_id: string
          viewer_id: string
        }
        Insert: {
          id?: never
          viewed_at?: string
          viewed_day?: string | null
          viewed_profile_id: string
          viewer_id: string
        }
        Update: {
          id?: never
          viewed_at?: string
          viewed_day?: string | null
          viewed_profile_id?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_views_viewed_profile_id_fkey"
            columns: ["viewed_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_views_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          is_active: boolean
          phone: string | null
          role: string
          suspended_at: string | null
          suspended_by: string | null
          suspended_reason: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          is_active?: boolean
          phone?: string | null
          role: string
          suspended_at?: string | null
          suspended_by?: string | null
          suspended_reason?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          role?: string
          suspended_at?: string | null
          suspended_by?: string | null
          suspended_reason?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_suspended_by_fkey"
            columns: ["suspended_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          admin_notes: string | null
          created_at: string
          id: string
          reason: string
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          target_id: string
          target_type: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          reason: string
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          target_id: string
          target_type: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          reason?: string
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_player_folders: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          name: string
          scout_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          scout_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          scout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_player_folders_scout_id_fkey"
            columns: ["scout_id"]
            isOneToOne: false
            referencedRelation: "scouts"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_players: {
        Row: {
          created_at: string
          folder_id: string | null
          id: string
          player_id: string
          scout_id: string
        }
        Insert: {
          created_at?: string
          folder_id?: string | null
          id?: string
          player_id: string
          scout_id: string
        }
        Update: {
          created_at?: string
          folder_id?: string | null
          id?: string
          player_id?: string
          scout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_players_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "saved_player_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_players_scout_id_fkey"
            columns: ["scout_id"]
            isOneToOne: false
            referencedRelation: "scouts"
            referencedColumns: ["id"]
          },
        ]
      }
      scout_notes: {
        Row: {
          note: string
          player_id: string
          scout_id: string
          updated_at: string
        }
        Insert: {
          note?: string
          player_id: string
          scout_id: string
          updated_at?: string
        }
        Update: {
          note?: string
          player_id?: string
          scout_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scout_notes_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scout_notes_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scout_notes_scout_id_fkey"
            columns: ["scout_id"]
            isOneToOne: false
            referencedRelation: "scouts"
            referencedColumns: ["id"]
          },
        ]
      }
      scout_preferences: {
        Row: {
          age_max: number | null
          age_min: number | null
          countries: string[]
          min_overall: number | null
          positions: Database["public"]["Enums"]["position_code"][]
          scout_id: string
          updated_at: string
        }
        Insert: {
          age_max?: number | null
          age_min?: number | null
          countries?: string[]
          min_overall?: number | null
          positions?: Database["public"]["Enums"]["position_code"][]
          scout_id: string
          updated_at?: string
        }
        Update: {
          age_max?: number | null
          age_min?: number | null
          countries?: string[]
          min_overall?: number | null
          positions?: Database["public"]["Enums"]["position_code"][]
          scout_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scout_preferences_scout_id_fkey"
            columns: ["scout_id"]
            isOneToOne: true
            referencedRelation: "scouts"
            referencedColumns: ["id"]
          },
        ]
      }
      scout_verification_documents: {
        Row: {
          document_type: string
          file_name: string | null
          id: string
          scout_id: string
          storage_path: string
          submitted_at: string
        }
        Insert: {
          document_type: string
          file_name?: string | null
          id?: string
          scout_id: string
          storage_path: string
          submitted_at?: string
        }
        Update: {
          document_type?: string
          file_name?: string | null
          id?: string
          scout_id?: string
          storage_path?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scout_verification_documents_scout_id_fkey"
            columns: ["scout_id"]
            isOneToOne: false
            referencedRelation: "scouts"
            referencedColumns: ["id"]
          },
        ]
      }
      scouts: {
        Row: {
          bio: string | null
          country_code: string | null
          created_at: string
          id: string
          organization: string | null
          scout_since: string
          updated_at: string
          verification_notes: string | null
          verification_status: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          bio?: string | null
          country_code?: string | null
          created_at?: string
          id: string
          organization?: string | null
          scout_since?: string
          updated_at?: string
          verification_notes?: string | null
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          bio?: string | null
          country_code?: string | null
          created_at?: string
          id?: string
          organization?: string | null
          scout_since?: string
          updated_at?: string
          verification_notes?: string | null
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scouts_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "scouts_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scouts_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trial_applications: {
        Row: {
          applied_at: string
          id: string
          invited_by_scout_id: string | null
          player_id: string
          source: string
          status: string
          status_updated_at: string
          trial_id: string
        }
        Insert: {
          applied_at?: string
          id?: string
          invited_by_scout_id?: string | null
          player_id: string
          source?: string
          status?: string
          status_updated_at?: string
          trial_id: string
        }
        Update: {
          applied_at?: string
          id?: string
          invited_by_scout_id?: string | null
          player_id?: string
          source?: string
          status?: string
          status_updated_at?: string
          trial_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trial_applications_invited_by_scout_id_fkey"
            columns: ["invited_by_scout_id"]
            isOneToOne: false
            referencedRelation: "scouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trial_applications_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trial_applications_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trial_applications_trial_id_fkey"
            columns: ["trial_id"]
            isOneToOne: false
            referencedRelation: "trials"
            referencedColumns: ["id"]
          },
        ]
      }
      trials: {
        Row: {
          age_max: number | null
          age_min: number | null
          application_deadline: string
          club: string
          cover_image_path: string | null
          created_at: string
          description: string | null
          id: string
          location: string
          positions: Database["public"]["Enums"]["position_code"][]
          scout_id: string | null
          status: string
          title: string
          trial_date: string
          updated_at: string
        }
        Insert: {
          age_max?: number | null
          age_min?: number | null
          application_deadline: string
          club: string
          cover_image_path?: string | null
          created_at?: string
          description?: string | null
          id?: string
          location: string
          positions?: Database["public"]["Enums"]["position_code"][]
          scout_id?: string | null
          status?: string
          title: string
          trial_date: string
          updated_at?: string
        }
        Update: {
          age_max?: number | null
          age_min?: number | null
          application_deadline?: string
          club?: string
          cover_image_path?: string | null
          created_at?: string
          description?: string | null
          id?: string
          location?: string
          positions?: Database["public"]["Enums"]["position_code"][]
          scout_id?: string | null
          status?: string
          title?: string
          trial_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trials_scout_id_fkey"
            columns: ["scout_id"]
            isOneToOne: false
            referencedRelation: "scouts"
            referencedColumns: ["id"]
          },
        ]
      }
      video_analysis_jobs: {
        Row: {
          completed_at: string | null
          error: string | null
          id: string
          player_id: string
          requested_at: string
          result_summary: Json | null
          started_at: string | null
          status: string
          video_id: string
        }
        Insert: {
          completed_at?: string | null
          error?: string | null
          id?: string
          player_id: string
          requested_at?: string
          result_summary?: Json | null
          started_at?: string | null
          status?: string
          video_id: string
        }
        Update: {
          completed_at?: string | null
          error?: string | null
          id?: string
          player_id?: string
          requested_at?: string
          result_summary?: Json | null
          started_at?: string | null
          status?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_analysis_jobs_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_analysis_jobs_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_analysis_jobs_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          video_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          video_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_comments_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_likes: {
        Row: {
          created_at: string
          profile_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          profile_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          profile_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_likes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_likes_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_saves: {
        Row: {
          created_at: string
          profile_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          profile_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          profile_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_saves_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_saves_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          comment_count: number
          created_at: string
          description: string | null
          duration_seconds: number | null
          id: string
          is_removed: boolean
          like_count: number
          match_name: string | null
          opponent: string | null
          player_id: string
          removed_at: string | null
          removed_by: string | null
          removed_reason: string | null
          save_count: number
          share_count: number
          status: string
          storage_path: string
          subject_hint_time_ms: number | null
          subject_hint_x: number | null
          subject_hint_y: number | null
          tags: string[]
          thumbnail_path: string | null
          title: string | null
          upload_intent: string
          view_count: number
        }
        Insert: {
          comment_count?: number
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          is_removed?: boolean
          like_count?: number
          match_name?: string | null
          opponent?: string | null
          player_id: string
          removed_at?: string | null
          removed_by?: string | null
          removed_reason?: string | null
          save_count?: number
          share_count?: number
          status?: string
          storage_path: string
          subject_hint_time_ms?: number | null
          subject_hint_x?: number | null
          subject_hint_y?: number | null
          tags?: string[]
          thumbnail_path?: string | null
          title?: string | null
          upload_intent: string
          view_count?: number
        }
        Update: {
          comment_count?: number
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          is_removed?: boolean
          like_count?: number
          match_name?: string | null
          opponent?: string | null
          player_id?: string
          removed_at?: string | null
          removed_by?: string | null
          removed_reason?: string | null
          save_count?: number
          share_count?: number
          status?: string
          storage_path?: string
          subject_hint_time_ms?: number | null
          subject_hint_x?: number | null
          subject_hint_y?: number | null
          tags?: string[]
          thumbnail_path?: string | null
          title?: string | null
          upload_intent?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "videos_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "videos_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "videos_removed_by_fkey"
            columns: ["removed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      player_public_view: {
        Row: {
          age: number | null
          avatar_url: string | null
          club: string | null
          full_name: string | null
          height_cm: number | null
          id: string | null
          is_goalkeeper: boolean | null
          nationality_code: string | null
          nationality_name: string | null
          overall_rating: number | null
          preferred_foot: string | null
          primary_position: Database["public"]["Enums"]["position_code"] | null
          recently_active: boolean | null
          secondary_position:
            | Database["public"]["Enums"]["position_code"]
            | null
          video_count: number | null
          weight_kg: number | null
        }
        Relationships: [
          {
            foreignKeyName: "players_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_nationality_code_fkey"
            columns: ["nationality_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
        ]
      }
    }
    Functions: {
      conversation_previews: {
        Args: { p_conversation_ids: string[] }
        Returns: {
          conversation_id: string
          last_message: string
          last_message_at: string
          unread_count: number
        }[]
      }
      delete_stale_notifications: { Args: never; Returns: undefined }
      increment_video_share: {
        Args: { p_video_id: string }
        Returns: undefined
      }
      increment_video_view: { Args: { p_video_id: string }; Returns: undefined }
      is_admin: { Args: { uid?: string }; Returns: boolean }
      is_verified_scout: { Args: { uid?: string }; Returns: boolean }
      match_score: {
        Args: { p_player_id: string; p_scout_id: string }
        Returns: number
      }
    }
    Enums: {
      position_code:
        | "GK"
        | "CB"
        | "LB"
        | "RB"
        | "CDM"
        | "CM"
        | "CAM"
        | "LM"
        | "RM"
        | "LW"
        | "RW"
        | "ST"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      position_code: [
        "GK",
        "CB",
        "LB",
        "RB",
        "CDM",
        "CM",
        "CAM",
        "LM",
        "RM",
        "LW",
        "RW",
        "ST",
      ],
    },
  },
} as const
