export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      card_tags: {
        Row: {
          card_id: string
          tag_id: string
        }
        Insert: {
          card_id: string
          tag_id: string
        }
        Update: {
          card_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_tags_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      card_types: {
        Row: {
          created_at: string
          emoji: string
          id: string
          is_active: boolean
          key: string
          label: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          is_active?: boolean
          key: string
          label: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          is_active?: boolean
          key?: string
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      cards: {
        Row: {
          card_type_id: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          modelo_id: string | null
          observacoes: string | null
          priority_id: string
          responsavel_id: string | null
          search_vector: unknown
          status_id: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          card_type_id: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          modelo_id?: string | null
          observacoes?: string | null
          priority_id: string
          responsavel_id?: string | null
          search_vector?: unknown
          status_id: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          card_type_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          modelo_id?: string | null
          observacoes?: string | null
          priority_id?: string
          responsavel_id?: string | null
          search_vector?: unknown
          status_id?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cards_card_type_id_fkey"
            columns: ["card_type_id"]
            isOneToOne: false
            referencedRelation: "card_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "modelos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_priority_id_fkey"
            columns: ["priority_id"]
            isOneToOne: false
            referencedRelation: "priorities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_details: {
        Row: {
          assuntos: string | null
          card_id: string
          created_at: string
          meeting_date: string
          meeting_time: string | null
          updated_at: string
        }
        Insert: {
          assuntos?: string | null
          card_id: string
          created_at?: string
          meeting_date: string
          meeting_time?: string | null
          updated_at?: string
        }
        Update: {
          assuntos?: string | null
          card_id?: string
          created_at?: string
          meeting_date?: string
          meeting_time?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_details_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: true
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_participants: {
        Row: {
          card_id: string
          team_member_id: string
        }
        Insert: {
          card_id: string
          team_member_id: string
        }
        Update: {
          card_id?: string
          team_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_participants_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "meeting_details"
            referencedColumns: ["card_id"]
          },
          {
            foreignKeyName: "meeting_participants_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      modelos: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      priorities: {
        Row: {
          color: string
          created_at: string
          id: string
          is_active: boolean
          key: string
          label: string
          sort_order: number
        }
        Insert: {
          color: string
          created_at?: string
          id?: string
          is_active?: boolean
          key: string
          label: string
          sort_order?: number
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_active?: boolean
          key?: string
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      statuses: {
        Row: {
          color: string
          created_at: string
          id: string
          is_active: boolean
          key: string
          label: string
          sort_order: number
        }
        Insert: {
          color: string
          created_at?: string
          id?: string
          is_active?: boolean
          key: string
          label: string
          sort_order?: number
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_active?: boolean
          key?: string
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      tags: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          avatar_color: string
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
        }
        Insert: {
          avatar_color?: string
          created_at?: string
          email: string
          full_name: string
          id: string
          is_active?: boolean
        }
        Update: {
          avatar_color?: string
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

