import { z } from "zod";
import { LISTING_LIMITS } from "@/lib/constants";

/** Shared form validation schemas for auth flows. */

export const PASSWORD_MIN = 8;

export const signupSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters")
      .max(60, "Name is too long"),
    email: z.string().trim().toLowerCase().email("Enter a valid email address"),
    password: z
      .string()
      .min(PASSWORD_MIN, `Password must be at least ${PASSWORD_MIN} characters`)
      .max(72, "Password is too long"),
    confirmPassword: z.string(),
    acceptedTerms: z.literal(true, {
      message: "You must accept the Terms and Privacy Policy",
    }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

/** E.164-ish phone: a leading + and 8–15 digits. */
export const phoneSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(
      /^\+[1-9]\d{7,14}$/,
      "Enter your number in international format, e.g. +14155550100",
    ),
});

export const otpSchema = z.object({
  phone: z.string().trim(),
  token: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code"),
});

export const requestResetSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
});

export const updatePasswordSchema = z
  .object({
    password: z
      .string()
      .min(PASSWORD_MIN, `Password must be at least ${PASSWORD_MIN} characters`)
      .max(72, "Password is too long"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

/** Editable profile fields. Avatar URL and path are produced by the
 *  AvatarUploader after a successful Supabase Storage upload (or empty
 *  if the user has no avatar). */
export const profileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(60, "Name is too long"),
  bio: z.string().trim().max(280, "Bio must be 280 characters or fewer"),
  avatarUrl: z
    .string()
    .trim()
    .url("Avatar URL is invalid")
    .or(z.literal("")),
  avatarPath: z.string().trim().max(500).or(z.literal("")),
});

// ============================================================
// Marketplace (Milestone 2)
// ============================================================

/** A single uploaded photo: its public URL + storage object path. */
export const listingPhotoSchema = z.object({
  url: z.string().url(),
  path: z.string().min(1),
});
export type ListingPhotoInput = z.infer<typeof listingPhotoSchema>;

/** Listing create / edit form fields (photos are validated separately). */
export const listingSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(LISTING_LIMITS.TITLE_MIN, `Title must be at least ${LISTING_LIMITS.TITLE_MIN} characters`)
      .max(LISTING_LIMITS.TITLE_MAX, `Title must be ${LISTING_LIMITS.TITLE_MAX} characters or fewer`),
    description: z
      .string()
      .trim()
      .max(
        LISTING_LIMITS.DESCRIPTION_MAX,
        `Description must be ${LISTING_LIMITS.DESCRIPTION_MAX} characters or fewer`,
      ),
    type: z.enum(["goods", "service"], { message: "Choose a listing type" }),
    categoryId: z.string().uuid("Choose a category"),
    locationId: z.string().uuid("Choose a location"),
    // Empty string = "no condition" (valid for services).
    conditionId: z.string().uuid().or(z.literal("")),
    price: z.coerce
      .number()
      .min(0, "Price cannot be negative")
      .max(LISTING_LIMITS.MAX_PRICE, "Price is too high"),
  })
  .refine((d) => d.type === "service" || d.conditionId !== "", {
    message: "Choose a condition",
    path: ["conditionId"],
  });
export type ListingInput = z.infer<typeof listingSchema>;

/** Reporting a listing, user, or message for moderation. */
export const reportSchema = z.object({
  reason: z.string().trim().min(1, "Choose a reason"),
  details: z
    .string()
    .trim()
    .max(1000, "Keep details under 1000 characters"),
});

// ============================================================
// Messaging + Ratings (Milestone 4)
// ============================================================

export const MESSAGE_MAX_LENGTH = 2000;

/** A single chat message body. */
export const messageSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Message can't be empty")
    .max(MESSAGE_MAX_LENGTH, `Message must be ${MESSAGE_MAX_LENGTH} characters or fewer`),
});

/** Star rating + optional written review for a completed transaction. */
export const ratingSchema = z.object({
  stars: z.coerce
    .number()
    .int()
    .min(1, "Choose at least 1 star")
    .max(5, "Maximum is 5 stars"),
  review: z
    .string()
    .trim()
    .max(1000, "Review must be 1000 characters or fewer"),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
