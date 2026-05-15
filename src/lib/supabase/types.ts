/**
 * Database types for the Supabase client.
 *
 * Hand-maintained to mirror supabase/migrations/*.sql. Once the Supabase
 * project exists you can regenerate this file with:
 *   npx supabase gen types typescript --project-id <id> > src/lib/supabase/types.ts
 */

export type UserRole = "user" | "admin";
export type UserStatus = "active" | "suspended" | "frozen";
export type ListingType = "goods" | "service";
export type ListingStatus = "draft" | "active" | "sold" | "removed";
export type TxnStatus = "pending" | "completed" | "cancelled" | "disputed";
export type ReportTarget = "listing" | "user" | "message";
export type ReportStatus = "open" | "reviewing" | "resolved" | "dismissed";

type Timestamps = {
  created_at: string;
  updated_at: string;
};

export type Profile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  phone: string | null;
  email_verified: boolean;
  phone_verified: boolean;
  role: UserRole;
  status: UserStatus;
  completed_trades: number;
  accepted_terms_at: string | null;
} & Timestamps;

export type Wallet = {
  id: string;
  user_id: string | null;
  balance: number;
  is_reserve: boolean;
} & Timestamps;

export type Taxonomy = {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

export type Listing = {
  id: string;
  seller_id: string;
  title: string;
  description: string;
  type: ListingType;
  category_id: string | null;
  location_id: string | null;
  condition_id: string | null;
  price: number;
  status: ListingStatus;
  /** Generated tsvector for keyword search. Never written by the app. */
  search_vector: string;
} & Timestamps;

export type ListingPhoto = {
  id: string;
  listing_id: string;
  url: string;
  /** Object path within the `listing-photos` storage bucket. */
  storage_path: string | null;
  sort_order: number;
  created_at: string;
};

export type Favorite = {
  id: string;
  user_id: string;
  listing_id: string;
  created_at: string;
};

export type Transaction = {
  id: string;
  listing_id: string | null;
  buyer_id: string;
  seller_id: string;
  gross_amount: number;
  fee_amount: number;
  net_amount: number;
  status: TxnStatus;
  created_at: string;
  completed_at: string | null;
};

export type Conversation = {
  id: string;
  listing_id: string | null;
  buyer_id: string;
  seller_id: string;
  created_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export type Block = {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
};

export type Rating = {
  id: string;
  transaction_id: string;
  rater_id: string;
  ratee_id: string;
  stars: number;
  review: string | null;
  created_at: string;
};

export type Report = {
  id: string;
  reporter_id: string;
  target_type: ReportTarget;
  target_id: string;
  reason: string;
  details: string | null;
  status: ReportStatus;
  created_at: string;
  resolved_at: string | null;
};

export type Ad = {
  id: string;
  slot: string;
  image_url: string;
  link_url: string;
  start_date: string | null;
  end_date: string | null;
  is_enabled: boolean;
  created_at: string;
};

export type AdminAuditLog = {
  id: string;
  admin_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  detail: Record<string, unknown>;
  created_at: string;
};

/** Helper: build the {Row, Insert, Update} shape Supabase expects per table. */
type TableShape<Row, Generated extends keyof Row, Optional extends keyof Row = never> = {
  Row: Row;
  Insert: Omit<Row, Generated | Optional> & Partial<Pick<Row, Generated | Optional>>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: TableShape<Profile, "created_at" | "updated_at", "avatar_url" | "bio" | "phone" | "email_verified" | "phone_verified" | "role" | "status" | "completed_trades" | "accepted_terms_at">;
      wallets: TableShape<Wallet, "id" | "created_at" | "updated_at", "balance" | "is_reserve" | "user_id">;
      categories: TableShape<Taxonomy, "id" | "created_at", "sort_order" | "is_active">;
      locations: TableShape<Taxonomy, "id" | "created_at", "sort_order" | "is_active">;
      conditions: TableShape<Taxonomy, "id" | "created_at", "sort_order" | "is_active">;
      listings: TableShape<Listing, "id" | "created_at" | "updated_at" | "search_vector", "description" | "category_id" | "location_id" | "condition_id" | "status">;
      listing_photos: TableShape<ListingPhoto, "id" | "created_at", "sort_order" | "storage_path">;
      favorites: TableShape<Favorite, "id" | "created_at">;
      transactions: TableShape<Transaction, "id" | "created_at", "fee_amount" | "status" | "completed_at" | "listing_id">;
      conversations: TableShape<Conversation, "id" | "created_at", "listing_id">;
      messages: TableShape<Message, "id" | "created_at">;
      blocks: TableShape<Block, "id" | "created_at">;
      ratings: TableShape<Rating, "id" | "created_at", "review">;
      reports: TableShape<Report, "id" | "created_at", "details" | "status" | "resolved_at">;
      ads: TableShape<Ad, "id" | "created_at", "start_date" | "end_date" | "is_enabled">;
      admin_audit_log: TableShape<AdminAuditLog, "id" | "created_at", "detail" | "target_type" | "target_id">;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      user_status: UserStatus;
      listing_type: ListingType;
      listing_status: ListingStatus;
      txn_status: TxnStatus;
      report_target: ReportTarget;
      report_status: ReportStatus;
    };
  };
};
