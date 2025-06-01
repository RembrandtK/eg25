# Deployment Guide for World Mini App

This guide will help you deploy your World Mini App to Vercel.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Repository**: Your code should be in a GitHub repository
3. **pnpm**: Make sure pnpm is installed (`npm install -g pnpm`)

## Step 1: Prepare for Deployment

### 1.1 Install Vercel CLI (Optional)
```bash
npm install -g vercel
```

### 1.2 Test Local Build
```bash
cd vote/world-app
pnpm install
pnpm run build
```

## Step 2: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard (Recommended)

1. **Connect Repository**:
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository
   - Select the `vote/world-app` directory as the root

2. **Configure Build Settings**:
   - Framework Preset: Next.js
   - Root Directory: `vote/world-app`
   - Build Command: `pnpm run build`
   - Output Directory: `.next` (default)
   - Install Command: `pnpm install`

3. **Set Environment Variables**:
   Add these environment variables in Vercel project settings:
   ```
   NEXT_PUBLIC_WLD_APP_ID=app_10719845a0977ef63ebe8eb9edb890ad
   NEXT_PUBLIC_WLD_ACTION_ID=vote
   NEXT_PUBLIC_CHAIN_ID=4801
   NEXT_PUBLIC_WORLDCHAIN_SEPOLIA_RPC=https://broken-evocative-general.worldchain-sepolia.quiknode.pro/d7bc6d204f552cc73c7807b4bc1d00055c1b92b9/
   WORLD_CHAIN_RPC=https://broken-evocative-general.worldchain-sepolia.quiknode.pro/d7bc6d204f552cc73c7807b4bc1d00055c1b92b9/
   WORLD_CHAIN_SEPOLIA_RPC=https://broken-evocative-general.worldchain-sepolia.quiknode.pro/d7bc6d204f552cc73c7807b4bc1d00055c1b92b9/
   ```

   **Important**: You'll need to update these after deployment:
   ```
   NEXT_PUBLIC_APP_URL=https://your-app-name.vercel.app
   NEXTAUTH_URL=https://your-app-name.vercel.app
   NEXTAUTH_SECRET=your-secure-random-secret
   ```

4. **Deploy**: Click "Deploy"

### Option B: Deploy via CLI

1. **Login to Vercel**:
   ```bash
   vercel login
   ```

2. **Deploy**:
   ```bash
   cd vote/world-app
   vercel
   ```

3. **Follow prompts**:
   - Set up and deploy? Yes
   - Which scope? (select your account)
   - Link to existing project? No
   - Project name: (choose a name)
   - Directory: `./` (current directory)

## Step 3: Post-Deployment Configuration

### 3.1 Update Environment Variables

After your first deployment, you'll get a URL like `https://your-app-name.vercel.app`. Update these environment variables in Vercel:

```
NEXT_PUBLIC_APP_URL=https://your-app-name.vercel.app
NEXTAUTH_URL=https://your-app-name.vercel.app
NEXTAUTH_SECRET=generate-a-secure-secret
```

**Generate NEXTAUTH_SECRET**:
```bash
openssl rand -base64 32
```

### 3.2 Update World ID App Configuration

1. Go to [World ID Developer Portal](https://developer.worldcoin.org)
2. Update your app's redirect URLs to include your Vercel domain
3. Add your production domain to allowed origins

### 3.3 Redeploy

After updating environment variables, trigger a new deployment:
- Via Dashboard: Go to Deployments tab and click "Redeploy"
- Via CLI: `vercel --prod`

## Step 4: Verify Deployment

1. **Check the app loads**: Visit your Vercel URL
2. **Test World ID integration**: Try the verification flow
3. **Test voting functionality**: Create and vote in an election
4. **Check API endpoints**: Verify `/api/debug` returns correct data

## Troubleshooting

### Common Issues

1. **Build Fails**:
   - Check that all dependencies are in `package.json`
   - Verify TypeScript compilation: `pnpm run type-check`

2. **Environment Variables Not Working**:
   - Ensure variables starting with `NEXT_PUBLIC_` are set
   - Redeploy after changing environment variables

3. **World ID Verification Fails**:
   - Check that `NEXT_PUBLIC_APP_URL` matches your Vercel domain
   - Verify World ID app configuration includes your domain

4. **Contract Interaction Issues**:
   - Ensure RPC URLs are accessible from Vercel
   - Check that contract addresses in `deployment-info.json` are correct

### Logs and Debugging

- **View logs**: Vercel Dashboard > Functions tab
- **Real-time logs**: `vercel logs your-app-name`
- **Local debugging**: `pnpm run dev:debug`

## Security Considerations

1. **Environment Variables**: Never commit secrets to git
2. **CORS**: The app is configured to allow cross-origin requests
3. **Headers**: Security headers are automatically added in production
4. **HTTPS**: Vercel provides HTTPS by default

## Performance Optimization

The deployment is configured with:
- Image optimization
- Compression
- Static file caching
- Edge functions for API routes

Your app should load quickly and handle World ID verification efficiently.
