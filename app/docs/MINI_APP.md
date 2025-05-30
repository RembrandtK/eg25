# Mini App Configuration Guide

This guide covers the frontend configuration, customization, and integration aspects of the World Mini App.

## Architecture Overview

The Mini App is built with:
- **Next.js 15** with App Router
- **React 19** for UI components
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **MiniKit** for World App integration
- **NextAuth** for session management
- **Viem** for blockchain interactions

## Project Structure

```
my-app/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   │   ├── auth/          # NextAuth configuration
│   │   │   ├── verify/        # World ID verification
│   │   │   └── nonce/         # SIWE nonce generation
│   │   ├── globals.css        # Global styles
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Main page
│   ├── components/            # React components
│   │   ├── ClaimButton.tsx    # Token claiming
│   │   ├── VerifyButton.tsx   # World ID verification
│   │   ├── TuteTimer.tsx      # Cooldown timer
│   │   └── wallet-auth-button.tsx # Wallet connection
│   ├── lib/                   # Utilities
│   │   ├── chains.ts          # Blockchain configurations
│   │   └── tute-abi.ts        # Contract ABI
│   ├── providers/             # Context providers
│   │   ├── minikit-provider.tsx    # MiniKit setup
│   │   ├── session-provider.tsx    # NextAuth session
│   │   └── eruda-provider.tsx      # Mobile debugging
│   └── types/                 # TypeScript definitions
└── public/                    # Static assets
```

## Environment Configuration

### Required Variables

Create `my-app/.env.local`:

```bash
# World ID Configuration
NEXT_PUBLIC_WLD_APP_ID="app_your_app_id_here"
NEXT_PUBLIC_WLD_ACTION_ID="vote"

# Application URLs
NEXT_PUBLIC_APP_URL="http://localhost:3001"
NEXTAUTH_URL="http://localhost:3001"

# NextAuth Configuration
NEXTAUTH_SECRET="your-random-secret-key-here"

# Smart Contract
NEXT_PUBLIC_TUTE_CONTRACT_ADDRESS="0xYourContractAddress"

# Optional: Chain Configuration
NEXT_PUBLIC_CHAIN_ID="4801"  # World Chain Sepolia
```

### Environment Variable Usage

```typescript
// Accessing environment variables
const appId = process.env.NEXT_PUBLIC_WLD_APP_ID;
const contractAddress = process.env.NEXT_PUBLIC_TUTE_CONTRACT_ADDRESS;

// Type-safe environment variables
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NEXT_PUBLIC_WLD_APP_ID: string;
      NEXT_PUBLIC_WLD_ACTION_ID: string;
      NEXT_PUBLIC_TUTE_CONTRACT_ADDRESS: string;
    }
  }
}
```

## Component Configuration

### MiniKit Provider Setup

```typescript
// src/providers/minikit-provider.tsx
import { MiniKit } from '@worldcoin/minikit-js';

export default function MiniKitProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    MiniKit.install({
      appId: process.env.NEXT_PUBLIC_WLD_APP_ID!,
      // Additional configuration
    });
  }, []);

  return <>{children}</>;
}
```

### World ID Verification

```typescript
// src/components/VerifyButton.tsx
import { MiniKit, VerificationLevel } from '@worldcoin/minikit-js';

const handleVerify = async () => {
  const { finalPayload } = await MiniKit.commandsAsync.verify({
    action: process.env.NEXT_PUBLIC_WLD_ACTION_ID!,
    verification_level: VerificationLevel.Orb,
    signal: userAddress,
  });

  // Send to verification API
  const response = await fetch('/api/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      payload: finalPayload,
      action: process.env.NEXT_PUBLIC_WLD_ACTION_ID!,
      signal: userAddress,
    }),
  });
};
```

### Wallet Authentication

```typescript
// src/components/wallet-auth-button.tsx
import { MiniKit } from '@worldcoin/minikit-js';
import { signIn } from 'next-auth/react';

const handleWalletAuth = async () => {
  const { finalPayload } = await MiniKit.commandsAsync.walletAuth({
    nonce: await generateNonce(),
    requestId: generateRequestId(),
    expirationTime: new Date(Date.now() + 5 * 60 * 1000),
    notBefore: new Date(),
    statement: 'Sign in to TUTE App',
  });

  await signIn('worldcoin-wallet', {
    message: finalPayload.message,
    signature: finalPayload.signature,
    address: finalPayload.address,
    nonce: finalPayload.nonce,
  });
};
```

## Blockchain Integration

### Chain Configuration

```typescript
// src/lib/chains.ts
import { defineChain } from 'viem';

export const worldchain = defineChain({
  id: 4801, // Sepolia testnet
  name: 'World Chain Sepolia',
  network: 'worldchain-sepolia',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['https://worldchain-sepolia.g.alchemy.com/public'],
    },
    public: {
      http: ['https://worldchain-sepolia.g.alchemy.com/public'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Blockscout',
      url: 'https://worldchain-sepolia.blockscout.com',
    },
  },
});
```

### Contract Interaction

```typescript
// src/components/ClaimButton.tsx
import { createPublicClient, createWalletClient, http } from 'viem';
import { worldchain } from '@/lib/chains';

const publicClient = createPublicClient({
  chain: worldchain,
  transport: http(),
});

const handleClaim = async () => {
  const walletClient = createWalletClient({
    chain: worldchain,
    transport: http(),
  });

  const hash = await walletClient.writeContract({
    address: process.env.NEXT_PUBLIC_TUTE_CONTRACT_ADDRESS as `0x${string}`,
    abi: tuteAbi,
    functionName: 'claim',
  });

  // Wait for transaction confirmation
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
};
```

## Styling and UI

### Tailwind Configuration

```javascript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'world-purple': '#6366f1',
        'world-blue': '#3b82f6',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
```

### Mobile-First Design

```css
/* src/app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Mobile-optimized styles */
.safe-area-inset {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}

/* World App specific styles */
@media (max-width: 480px) {
  .mobile-optimized {
    font-size: 16px; /* Prevent zoom on iOS */
    touch-action: manipulation;
  }
}
```

## State Management

### Session Management

```typescript
// src/providers/session-provider.tsx
import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextAuthSessionProvider
      refetchInterval={5 * 60} // Refetch every 5 minutes
      refetchOnWindowFocus={true}
    >
      {children}
    </NextAuthSessionProvider>
  );
}
```

### Application State

```typescript
// Using React hooks for state management
const [walletConnected, setWalletConnected] = useState(false);
const [verified, setVerified] = useState(false);
const [tuteClaimed, setTuteClaimed] = useState(false);
const [timeRemaining, setTimeRemaining] = useState(300);

// For complex state, consider using useReducer or Zustand
import { create } from 'zustand';

interface AppState {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
}

const useAppStore = create<AppState>((set) => ({
  user: null,
  isLoading: false,
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
}));
```

## API Routes

### World ID Verification

```typescript
// src/app/api/verify/route.ts
import { verifyCloudProof } from '@worldcoin/minikit-js';

export async function POST(req: Request) {
  const { payload, action, signal } = await req.json();
  
  const verifyRes = await verifyCloudProof(
    payload,
    process.env.NEXT_PUBLIC_WLD_APP_ID as `app_${string}`,
    action,
    signal
  );

  if (verifyRes.success) {
    return Response.json({ success: true });
  } else {
    return Response.json({ error: verifyRes.detail }, { status: 400 });
  }
}
```

### SIWE Nonce Generation

```typescript
// src/app/api/nonce/route.ts
import { generateNonce } from 'siwe';

export async function GET() {
  const nonce = generateNonce();
  return Response.json({ nonce });
}
```

## Performance Optimization

### Code Splitting

```typescript
// Dynamic imports for large components
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <div>Loading...</div>,
  ssr: false, // Disable SSR for client-only components
});
```

### Bundle Analysis

```bash
# Analyze bundle size
npm install -g @next/bundle-analyzer
ANALYZE=true pnpm build
```

### Caching Strategies

```typescript
// API route caching
export async function GET() {
  return Response.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  });
}
```

## Testing

### Component Testing

```typescript
// __tests__/components/ClaimButton.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ClaimButton } from '@/components/ClaimButton';

describe('ClaimButton', () => {
  it('renders claim button', () => {
    render(<ClaimButton onSuccess={jest.fn()} />);
    expect(screen.getByText('Claim TUTE')).toBeInTheDocument();
  });

  it('handles click event', () => {
    const onSuccess = jest.fn();
    render(<ClaimButton onSuccess={onSuccess} />);
    
    fireEvent.click(screen.getByText('Claim TUTE'));
    // Add assertions
  });
});
```

### Integration Testing

```typescript
// __tests__/integration/auth.test.tsx
import { render, screen } from '@testing-library/react';
import { SessionProvider } from 'next-auth/react';
import App from '@/app/page';

describe('Authentication Flow', () => {
  it('shows wallet connect when not authenticated', () => {
    render(
      <SessionProvider session={null}>
        <App />
      </SessionProvider>
    );
    
    expect(screen.getByText('Connect your wallet')).toBeInTheDocument();
  });
});
```

## Deployment

### Build Configuration

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  images: {
    domains: ['example.com'],
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
};

module.exports = nextConfig;
```

### Production Optimizations

```bash
# Build for production
pnpm build

# Start production server
pnpm start

# Export static site (if applicable)
pnpm export
```

## Monitoring and Analytics

### Error Tracking

```typescript
// Error boundary for React components
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({ error }: { error: Error }) {
  return (
    <div role="alert">
      <h2>Something went wrong:</h2>
      <pre>{error.message}</pre>
    </div>
  );
}

// Usage
<ErrorBoundary FallbackComponent={ErrorFallback}>
  <App />
</ErrorBoundary>
```

### Performance Monitoring

```typescript
// Web Vitals tracking
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics(metric: any) {
  // Send to your analytics service
  console.log(metric);
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

## Security Best Practices

### Environment Variables

- Never expose private keys in client-side code
- Use `NEXT_PUBLIC_` prefix only for public variables
- Validate all environment variables at startup

### Input Validation

```typescript
// Validate user inputs
import { z } from 'zod';

const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);

function validateAddress(address: string) {
  return addressSchema.safeParse(address);
}
```

### Content Security Policy

```javascript
// next.config.js
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval';",
          },
        ],
      },
    ];
  },
};
```
