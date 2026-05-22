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
export type PurchaseStatus = "pending" | "completed" | "failed" | "refunded";

type Timestamps = {
  created_at: string;
  updated_at: string;
};

export type Profile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  /** Object path in the `avatars` storage bucket, for cleanup on replace. */
  avatar_path: string | null;
  bio: string | null;
  phone: string | null;
  email_verified: boolean;
  phone_verified: boolean;
  role: UserRole;
  status: UserStatus;
  completed_trades: number;
  /** Denormalised rating average kept up to date by a DB trigger. */
  rating_avg: number;
  /** Denormalised rating count kept up to date by a DB trigger. */
  rating_count: number;
  /** Per-admin UI preference: show admin tools, or browse as a customer. */
  admin_view: boolean;
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
  last_message_at: string | null;
  last_read_buyer_at: string | null;
  last_read_seller_at: string | null;
  created_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  /** False until the recipient opens the conversation thread. */
  viewed: boolean;
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

export type CreditPurchase = {
  id: string;
  user_id: string;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  credits: number;
  amount_usd_cents: number;
  status: PurchaseStatus;
  created_at: string;
  completed_at: string | null;
};

export type PlatformSettings = {
  id: number;
  signup_credit_grant: number;
  monthly_credit_purchase_cap: number;
  /** Platform fee taken from each completed sale, as a 0-1 rate. */
  transaction_fee_rate: number;
  created_at: string;
  updated_at: string;
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
      profiles: TableShape<Profile, "created_at" | "updated_at", "avatar_url" | "avatar_path" | "bio" | "phone" | "email_verified" | "phone_verified" | "role" | "status" | "completed_trades" | "rating_avg" | "rating_count" | "admin_view" | "accepted_terms_at">;
      wallets: TableShape<Wallet, "id" | "created_at" | "updated_at", "balance" | "is_reserve" | "user_id">;
      categories: TableShape<Taxonomy, "id" | "created_at", "sort_order" | "is_active">;
      locations: TableShape<Taxonomy, "id" | "created_at", "sort_order" | "is_active">;
      conditions: TableShape<Taxonomy, "id" | "created_at", "sort_order" | "is_active">;
      listings: TableShape<Listing, "id" | "created_at" | "updated_at" | "search_vector", "description" | "category_id" | "location_id" | "condition_id" | "status">;
      listing_photos: TableShape<ListingPhoto, "id" | "created_at", "sort_order" | "storage_path">;
      favorites: TableShape<Favorite, "id" | "created_at">;
      transactions: TableShape<Transaction, "id" | "created_at", "fee_amount" | "status" | "completed_at" | "listing_id">;
      conversations: TableShape<Conversation, "id" | "created_at", "listing_id" | "last_message_at" | "last_read_buyer_at" | "last_read_seller_at">;
      messages: TableShape<Message, "id" | "created_at", "viewed">;
      blocks: TableShape<Block, "id" | "created_at">;
      ratings: TableShape<Rating, "id" | "created_at", "review">;
      reports: TableShape<Report, "id" | "created_at", "details" | "status" | "resolved_at">;
      ads: TableShape<Ad, "id" | "created_at", "start_date" | "end_date" | "is_enabled">;
      admin_audit_log: TableShape<AdminAuditLog, "id" | "created_at", "detail" | "target_type" | "target_id">;
      credit_purchases: TableShape<CreditPurchase, "id" | "created_at", "stripe_session_id" | "stripe_payment_intent_id" | "status" | "completed_at">;
      platform_settings: TableShape<PlatformSettings, "created_at" | "updated_at", "id" | "signup_credit_grant" | "monthly_credit_purchase_cap" | "transaction_fee_rate">;
    };
    Views: Record<string, never>;
    Functions: {
      transfer_credits: {
        Args: { p_listing_id: string };
        Returns: Transaction;
      };
      apply_credit_purchase: {
        Args: {
          p_user_id: string;
          p_stripe_payment_intent_id: string;
          p_stripe_session_id: string;
          p_credits: number;
          p_amount_usd_cents: number;
        };
        Returns: void;
      };
      is_admin: {
        Args: { uid: string };
        Returns: boolean;
      };
      admin_grant_credits: {
        Args: {
          p_recipient_id: string;
          p_amount: number;
          p_admin_id: string;
          p_note?: string;
        };
        Returns: void;
      };
    };
    Enums: {
      user_role: UserRole;
      user_status: UserStatus;
      listing_type: ListingType;
      listing_status: ListingStatus;
      txn_status: TxnStatus;
      report_target: ReportTarget;
      report_status: ReportStatus;
      purchase_status: PurchaseStatus;
    };
  };
};
