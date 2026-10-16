This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Spin & Win locally

pbzone-api doesn't serve `/v1/spin` yet (see [the contract](docs/spin-api-contract.md)), so run the dev mock:

1. Put `SPIN_API_BASE_URL=http://127.0.0.1:4010` in `.env.local`. Only `/api/spin` moves; the quiz, the wallet and everything else keep using `QUIZ_API_BASE_URL`. `next dev` picks up `.env.local` edits by itself (it logs `Reload env: .env.local`).
2. Run `node scripts/mock-spin-api.mjs` (`--help` lists `--port`, `--latency`, `--fail-rate`, `--jackpot-cap` and `--spins-per-day`).
3. Open [http://localhost:3000/games/spin-win](http://localhost:3000/games/spin-win).

The mock keeps everything in memory and doesn't verify tokens. It also has its own wallet (1,000 coins per player), so balances that the app reads from the real API can differ from it. `POST /__mock/advance` jumps to the next IST day, `POST /__mock/force?segment=gift` picks the next prize, and `POST /__mock/reset` starts over.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
# pb-zone
