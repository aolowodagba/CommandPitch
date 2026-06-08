export const config = {
  authSecret: process.env.AUTH_SECRET!,
  authUrl: process.env.AUTH_URL!,
  googleClientId: process.env.AUTH_GOOGLE_ID!,
  googleClientSecret: process.env.AUTH_GOOGLE_SECRET!,
  databaseUrl: process.env.DATABASE_URL!,
  storageBucket: process.env.STORAGE_BUCKET!,
  storageRegion: process.env.STORAGE_REGION!,
  storageAccessKey: process.env.STORAGE_ACCESS_KEY!,
  storageSecretKey: process.env.STORAGE_SECRET_KEY!,
  resendApiKey: process.env.RESEND_API_KEY!,
  receiptExpiryHours: Number(process.env.RECEIPT_EXPIRY_HOURS ?? 24),
}
