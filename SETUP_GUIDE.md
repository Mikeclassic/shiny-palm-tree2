# Production Setup Guide

This guide walks you through setting up the required services for production deployment.

## 1. Upstash Redis (Rate Limiting)

### Why you need it:
Without Upstash, rate limiting falls back to in-memory storage, which doesn't work across multiple server instances in production.

### Setup Steps:
1. Go to [https://upstash.com/](https://upstash.com/)
2. Sign up for a free account
3. Click "Create Database"
4. Choose a region close to your users
5. Select "Free" plan (includes 10,000 requests/day)
6. Copy the REST URL and token
7. Add to your environment variables:
   ```env
   UPSTASH_REDIS_REST_URL="https://your-instance.upstash.io"
   UPSTASH_REDIS_REST_TOKEN="your-token-here"
   ```

**Cost**: FREE tier includes 10,000 requests/day (plenty for rate limiting)

---

## 2. Sentry (Error Monitoring)

### Why you need it:
Track errors and performance issues in production. Essential for debugging problems users encounter.

### Setup Steps:
1. Go to [https://sentry.io/](https://sentry.io/)
2. Sign up for a free account
3. Click "Create Project"
4. Select "Next.js" as the platform
5. Name your project "clearseller" (or any name)
6. Copy the DSN (Data Source Name)
7. Add to your environment variables:
   ```env
   NEXT_PUBLIC_SENTRY_DSN="https://your-key@sentry.io/your-project-id"
   ```

**Cost**: FREE tier includes 5,000 errors/month

---

## 3. Generate Secrets

You need to generate secure random strings for authentication.

### NEXTAUTH_SECRET
```bash
openssl rand -base64 32
```

### CRON_SECRET
```bash
openssl rand -base64 32
```

Add both to your environment variables:
```env
NEXTAUTH_SECRET="your-generated-secret"
CRON_SECRET="your-generated-secret"
```

---

## 4. Configure Vercel Cron (if using Vercel)

### Setup Steps:
1. Deploy to Vercel
2. Go to your project settings
3. Navigate to "Environment Variables"
4. Add `CRON_SECRET` (same value you generated)
5. The `vercel.json` file is already configured to run the credit refresh daily

### Alternative: GitHub Actions Cron
If not using Vercel, create `.github/workflows/credit-refresh.yml`:

```yaml
name: Daily Credit Refresh

on:
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight UTC

jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Credit Refresh
        run: |
          curl -X GET https://yourdomain.com/api/cron/refresh-credits \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

Don't forget to add `CRON_SECRET` to your GitHub repository secrets.

---

## 5. Deployment Checklist

Before deploying to production:

### Environment Variables
- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `NEXTAUTH_SECRET` - Generated random secret
- [ ] `NEXTAUTH_URL` - Your production domain (e.g., https://clearseller.com)
- [ ] `GOOGLE_CLIENT_ID` - Google OAuth credentials
- [ ] `GOOGLE_CLIENT_SECRET` - Google OAuth credentials
- [ ] `OPENROUTER_API_KEY` - OpenRouter API key
- [ ] `REPLICATE_API_TOKEN` - Replicate API token
- [ ] `UPSTASH_REDIS_REST_URL` - Upstash Redis URL
- [ ] `UPSTASH_REDIS_REST_TOKEN` - Upstash Redis token
- [ ] `NEXT_PUBLIC_SENTRY_DSN` - Sentry DSN (optional but recommended)
- [ ] `CRON_SECRET` - Generated random secret

### Database
- [ ] Run migrations: `npx prisma migrate deploy`
- [ ] Verify connection: `npx prisma db pull`

### Testing
- [ ] Test authentication (Google OAuth)
- [ ] Test AI generation (verify credit deduction)
- [ ] Test rate limiting (make 11 requests quickly)
- [ ] Test account deletion
- [ ] Test data export
- [ ] Verify security headers (use https://securityheaders.com)

### Legal
- [ ] Update Privacy Policy with your company address
- [ ] Update Terms of Service with your jurisdiction and company address
- [ ] Set up privacy@clearseller.com email (or update to your email)
- [ ] Set up legal@clearseller.com email (or update to your email)

---

## 6. Cost Estimates

### Free Tier Services:
- **Upstash Redis**: Free (10,000 requests/day)
- **Sentry**: Free (5,000 errors/month)
- **Vercel Cron**: Free (included in all plans)

### Paid Services (existing):
- **PostgreSQL**: Depends on your provider
- **OpenRouter API**: ~$0.10 per 1M tokens (Grok-4.1-fast)
- **Replicate API**:
  - Background removal: ~$0.002 per image
  - Background change: ~$0.005 per image

### Monthly Cost Protection:
- **Before fixes**: Unlimited usage → Potentially $10,000+
- **After fixes**:
  - Free users: 5 credits/day = ~150 operations/month per user
  - 1,000 free users = ~150,000 operations/month = ~$150-300/month (manageable)

---

## 7. Monitoring in Production

### Check Sentry Dashboard:
- Go to https://sentry.io/
- View errors in real-time
- Set up alerts for critical errors

### Check Upstash Dashboard:
- View rate limiting metrics
- Monitor Redis usage

### Monitor API Costs:
- **OpenRouter**: https://openrouter.ai/activity
- **Replicate**: https://replicate.com/billing

Set up billing alerts to prevent cost overruns.

---

## 8. Common Issues

### Rate limiting not working:
- ✅ Check `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set
- ✅ Check console logs for "Using in-memory rate limiting" warning
- ✅ Verify Upstash database is active

### Credits not deducting:
- ✅ Check database connection
- ✅ Verify user has `credits` field populated
- ✅ Check console logs for credit check errors

### Cron job not running:
- ✅ Verify `CRON_SECRET` matches in environment and request
- ✅ Check Vercel cron logs (if using Vercel)
- ✅ Test manually: `curl -H "Authorization: Bearer YOUR_SECRET" https://yourdomain.com/api/cron/refresh-credits`

### Sentry not capturing errors:
- ✅ Check `NEXT_PUBLIC_SENTRY_DSN` is set correctly (must start with NEXT_PUBLIC_)
- ✅ Rebuild application after adding environment variable
- ✅ Check Sentry project is not paused

---

## 9. Testing in Development

You can test locally without Upstash/Sentry:

```bash
# Copy environment template
cp .env.example .env

# Add required variables
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="test-secret-123"
NEXTAUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
OPENROUTER_API_KEY="..."
REPLICATE_API_TOKEN="..."
CRON_SECRET="test-cron-secret"

# Optional: Skip Upstash/Sentry for local development
# Rate limiting will fall back to in-memory (with console warning)
# Sentry will simply not send events

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma db push

# Start development server
npm run dev
```

**Note**: In development without Upstash, rate limiting uses in-memory storage and won't persist across server restarts.

---

## 10. Next Steps After Deployment

### Week 1 (Critical):
1. Monitor Sentry for errors
2. Check API usage on OpenRouter/Replicate
3. Verify cron job ran successfully (check database for reset credits)
4. Test all features with real users
5. Set up database backups

### Month 1 (Important):
1. Implement proper database migrations (instead of `db push`)
2. Add database indexes for performance
3. Write automated tests
4. Set up staging environment
5. Implement email service for notifications

---

## Need Help?

- **Documentation**: See [PRODUCTION_READINESS.md](./PRODUCTION_READINESS.md)
- **Issues**: Check console logs and Sentry dashboard
- **Rate Limits**: Review [src/lib/ratelimit.ts](./src/lib/ratelimit.ts)
- **Credits**: Review [src/lib/credits.ts](./src/lib/credits.ts)

Good luck with your deployment! 🚀
