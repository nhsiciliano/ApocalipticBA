// Generado por `pnpm db:types` (supabase gen types) desde las migraciones. No editar a mano.
/* eslint-disable */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      game_sessions: {
        Row: {
          app_version: string;
          ended_at: string | null;
          id: string;
          platform: string;
          scenario_id: string;
          started_at: string;
          token_hash: string;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          app_version: string;
          ended_at?: string | null;
          id?: string;
          platform: string;
          scenario_id: string;
          started_at?: string;
          token_hash: string;
          user_id?: string | null;
        };
        Update: {
          app_version?: string;
          ended_at?: string | null;
          id?: string;
          platform?: string;
          scenario_id?: string;
          started_at?: string;
          token_hash?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'game_sessions_scenario_id_fkey';
            columns: ['scenario_id'];
            isOneToOne: false;
            referencedRelation: 'scenarios';
            referencedColumns: ['id'];
          },
        ];
      };
      player_progress: {
        Row: {
          best_time_ms: number | null;
          completed: boolean;
          notes_found: NonNullable<Json>;
          scenario_id: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          best_time_ms?: number | null;
          completed?: boolean;
          notes_found?: NonNullable<Json>;
          scenario_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          best_time_ms?: number | null;
          completed?: boolean;
          notes_found?: NonNullable<Json>;
          scenario_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'player_progress_scenario_id_fkey';
            columns: ['scenario_id'];
            isOneToOne: false;
            referencedRelation: 'scenarios';
            referencedColumns: ['id'];
          },
        ];
      };
      player_unlocks: {
        Row: {
          item_id: string;
          item_type: string;
          unlocked_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          item_id: string;
          item_type: string;
          unlocked_at?: string;
          user_id: string;
        };
        Update: {
          item_id?: string;
          item_type?: string;
          unlocked_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          country: string | null;
          created_at: string;
          display_name: string | null;
          settings: NonNullable<Json>;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          country?: string | null;
          created_at?: string;
          display_name?: string | null;
          settings?: NonNullable<Json>;
          user_id: string;
        };
        Update: {
          country?: string | null;
          created_at?: string;
          display_name?: string | null;
          settings?: NonNullable<Json>;
          user_id?: string;
        };
        Relationships: [];
      };
      remote_config: {
        Row: {
          key: string;
          min_app_version: string | null;
          platform: string;
          value: NonNullable<Json>;
        };
        ComputedFields: never;
        Insert: {
          key: string;
          min_app_version?: string | null;
          platform?: string;
          value: NonNullable<Json>;
        };
        Update: {
          key?: string;
          min_app_version?: string | null;
          platform?: string;
          value?: NonNullable<Json>;
        };
        Relationships: [];
      };
      scenarios: {
        Row: {
          id: string;
          is_active: boolean;
          name: string;
          order: number;
          slug: string;
        };
        ComputedFields: never;
        Insert: {
          id?: string;
          is_active?: boolean;
          name: string;
          order: number;
          slug: string;
        };
        Update: {
          id?: string;
          is_active?: boolean;
          name?: string;
          order?: number;
          slug?: string;
        };
        Relationships: [];
      };
      scores: {
        Row: {
          accuracy: number;
          created_at: string;
          duration_ms: number;
          headshots: number;
          id: string;
          kills: number;
          scenario_id: string;
          score: number;
          session_id: string;
          user_id: string | null;
          validated: boolean;
        };
        ComputedFields: never;
        Insert: {
          accuracy?: number;
          created_at?: string;
          duration_ms: number;
          headshots?: number;
          id?: string;
          kills?: number;
          scenario_id: string;
          score: number;
          session_id: string;
          user_id?: string | null;
          validated?: boolean;
        };
        Update: {
          accuracy?: number;
          created_at?: string;
          duration_ms?: number;
          headshots?: number;
          id?: string;
          kills?: number;
          scenario_id?: string;
          score?: number;
          session_id?: string;
          user_id?: string | null;
          validated?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: 'scores_scenario_id_fkey';
            columns: ['scenario_id'];
            isOneToOne: false;
            referencedRelation: 'scenarios';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'scores_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: true;
            referencedRelation: 'game_sessions';
            referencedColumns: ['id'];
          },
        ];
      };
      telemetry_events: {
        Row: {
          created_at: string;
          id: string;
          payload: NonNullable<Json>;
          session_id: string | null;
          type: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          payload?: NonNullable<Json>;
          session_id?: string | null;
          type: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          payload?: NonNullable<Json>;
          session_id?: string | null;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'telemetry_events_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: false;
            referencedRelation: 'game_sessions';
            referencedColumns: ['id'];
          },
        ];
      };
      waitlist: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          locale: string;
          source: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          email: string;
          id?: string;
          locale: string;
          source?: string | null;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          locale?: string;
          source?: string | null;
        };
        Relationships: [];
      };
      waitlist_rate_limits: {
        Row: {
          bucket: string;
          count: number;
          window_start: string;
        };
        ComputedFields: never;
        Insert: {
          bucket: string;
          count?: number;
          window_start?: string;
        };
        Update: {
          bucket?: string;
          count?: number;
          window_start?: string;
        };
        Relationships: [];
      };
      weapons: {
        Row: {
          base_stats: NonNullable<Json>;
          id: string;
          name: string;
          slug: string;
        };
        ComputedFields: never;
        Insert: {
          base_stats?: NonNullable<Json>;
          id?: string;
          name: string;
          slug: string;
        };
        Update: {
          base_stats?: NonNullable<Json>;
          id?: string;
          name?: string;
          slug?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      bump_rate_limit: {
        Args: { p_bucket: string; p_max: number; p_now?: string; p_window_seconds: number };
        Returns: boolean;
      };
      player_display_name: { Args: { p_user_id: string }; Returns: string };
      top_scores: {
        Args: { p_limit?: number; p_scenario_slug: string };
        Returns: {
          accuracy: number;
          created_at: string;
          display_name: string;
          duration_ms: number;
          headshots: number;
          rank: number;
          score: number;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
