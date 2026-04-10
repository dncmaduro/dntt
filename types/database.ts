export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      notifications: {
        Row: {
          body: string;
          created_at: string;
          entity_id: string | null;
          entity_type: string | null;
          id: string;
          is_read: boolean;
          read_at: string | null;
          title: string;
          type: string;
          user_id: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string | null;
          id?: string;
          is_read?: boolean;
          read_at?: string | null;
          title: string;
          type: string;
          user_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string | null;
          id?: string;
          is_read?: boolean;
          read_at?: string | null;
          title?: string;
          type?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      payment_request_attachments: {
        Row: {
          created_at: string;
          created_by: string;
          file_name: string;
          file_path: string;
          file_type: string | null;
          id: string;
          payment_request_id: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          file_name: string;
          file_path: string;
          file_type?: string | null;
          id?: string;
          payment_request_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          file_name?: string;
          file_path?: string;
          file_type?: string | null;
          id?: string;
          payment_request_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payment_request_attachments_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payment_request_attachments_payment_request_id_fkey";
            columns: ["payment_request_id"];
            isOneToOne: false;
            referencedRelation: "payment_requests";
            referencedColumns: ["id"];
          },
        ];
      };
      payment_request_logs: {
        Row: {
          action: string;
          actor_id: string;
          created_at: string;
          id: string;
          meta: Json | null;
          payment_request_id: string;
        };
        Insert: {
          action: string;
          actor_id: string;
          created_at?: string;
          id?: string;
          meta?: Json | null;
          payment_request_id: string;
        };
        Update: {
          action?: string;
          actor_id?: string;
          created_at?: string;
          id?: string;
          meta?: Json | null;
          payment_request_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payment_request_logs_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payment_request_logs_payment_request_id_fkey";
            columns: ["payment_request_id"];
            isOneToOne: false;
            referencedRelation: "payment_requests";
            referencedColumns: ["id"];
          },
        ];
      };
      payment_requests: {
        Row: {
          accounting_confirmed_at: string | null;
          accounting_confirmed_by: string | null;
          accounting_note: string | null;
          amount: number | null;
          created_at: string;
          deleted_at: string | null;
          description: string | null;
          director_approved_at: string | null;
          director_approved_by: string | null;
          director_note: string | null;
          id: string;
          is_deleted: boolean;
          note: string | null;
          paid_at: string | null;
          paid_by: string | null;
          payment_bill_name: string | null;
          payment_bill_path: string | null;
          payment_bill_type: string | null;
          payment_date: string;
          payment_reference: string | null;
          status: string;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          accounting_confirmed_at?: string | null;
          accounting_confirmed_by?: string | null;
          accounting_note?: string | null;
          amount?: number | null;
          created_at?: string;
          deleted_at?: string | null;
          description?: string | null;
          director_approved_at?: string | null;
          director_approved_by?: string | null;
          director_note?: string | null;
          id?: string;
          is_deleted?: boolean;
          note?: string | null;
          paid_at?: string | null;
          paid_by?: string | null;
          payment_bill_name?: string | null;
          payment_bill_path?: string | null;
          payment_bill_type?: string | null;
          payment_date: string;
          payment_reference?: string | null;
          status: string;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          accounting_confirmed_at?: string | null;
          accounting_confirmed_by?: string | null;
          accounting_note?: string | null;
          amount?: number | null;
          created_at?: string;
          deleted_at?: string | null;
          description?: string | null;
          director_approved_at?: string | null;
          director_approved_by?: string | null;
          director_note?: string | null;
          id?: string;
          is_deleted?: boolean;
          note?: string | null;
          paid_at?: string | null;
          paid_by?: string | null;
          payment_bill_name?: string | null;
          payment_bill_path?: string | null;
          payment_bill_type?: string | null;
          payment_date?: string;
          payment_reference?: string | null;
          status?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payment_requests_accounting_confirmed_by_fkey";
            columns: ["accounting_confirmed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payment_requests_director_approved_by_fkey";
            columns: ["director_approved_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payment_requests_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          full_name: string | null;
          id: string;
          qr_payment_url: string | null;
          role: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          full_name?: string | null;
          id: string;
          qr_payment_url?: string | null;
          role?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          full_name?: string | null;
          id?: string;
          qr_payment_url?: string | null;
          role?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      insert_payment_request_log: {
        Args: {
          target_action: string;
          target_actor_id: string;
          target_meta?: Json | null;
          target_request_id: string;
        };
        Returns: undefined;
      };
      list_request_users_for_director: {
        Args: Record<PropertyKey, never>;
        Returns: {
          full_name: string | null;
          id: string;
          qr_payment_url: string | null;
          role: string | null;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type PaymentRequestRow =
  Database["public"]["Tables"]["payment_requests"]["Row"];
export type PaymentRequestAttachmentRow =
  Database["public"]["Tables"]["payment_request_attachments"]["Row"];
export type PaymentRequestLogRow =
  Database["public"]["Tables"]["payment_request_logs"]["Row"];
export type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];
