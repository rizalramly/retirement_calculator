# Retirement Calculator for Malaysian

A cross-platform retirement projection tool for Malaysians — runs as a **responsive web app** and a **native Android app** from a **single React + TypeScript codebase**. Both targets share one pure calculation engine (`src/engine.ts`), so the numbers are always identical on web and mobile.

All amounts are in Malaysian Ringgit (**RM**). Everything runs client-side: **no backend, no login, no tracking**. Inputs are persisted locally (localStorage on web, `@capacitor/preferences` on Android) so they survive restarts.

## Features

- **Savings tab** — EPF + personal-savings accumulation, then a retirement draw-down phase. Year-by-year table from your current age to 85, the retirement-age row highlighted, summary metric cards, and **Export to CSV**.
- **Expenses tab** — Kuala-Lumpur-realistic monthly budget grouped into Housing / Vehicles / Daily Living / Protection / Lifestyle. Each loan or time-limited item shows a live "ends YYYY" badge and drops to RM 0 once its term ends.
- **Outlook tab** — line chart of EPF / personal / total wealth / annual expenses, a stacked "where the money comes from" cashflow chart (green = personal, blue = EPF) with a dashed expense target, and a 5-year milestones table.
- Light / dark mode, mobile-first responsive layout, live (debounced) recalculation, `en-MY` number formatting.

## Tech stack

React 18 + TypeScript · Vite · Tailwind CSS · Recharts · Capacitor (Android) · Vitest.

---

## 1. Local development (web)

```bash
npm install
npm run dev        # http://localhost:5173
```

## 2. Run the engine unit tests

```bash
npm test           # vitest run — covers the retirement waterfall & loan-expiry logic
```

## 3. Web production build

```bash
npm run build      # type-checks, then emits static files to dist/
npm run preview    # serve the production build locally to verify
```

### Deploy `dist/` to static hosting

`dist/` is a fully static bundle (the Vite `base` is `./`, so it works from any sub-path). Deploy it to any static host:

- **Netlify:** drag-and-drop `dist/`, or `netlify deploy --dir=dist --prod`.
- **Vercel:** `vercel --prod` (framework preset: Vite).
- **GitHub Pages:** push the contents of `dist/` to a `gh-pages` branch.
- **Any web server / S3 / Firebase Hosting:** upload the contents of `dist/`.

No server-side runtime is required.

---

## 4. Build the Android app (APK / AAB)

Prerequisites: **Android Studio** (with the Android SDK) and a JDK.

```bash
# One-time: add the Android platform (creates the ./android native project)
npm install
npm run build
npx cap add android

# Each time you change the web code: rebuild + copy into the native project
npm run build
npx cap sync android

# Open the native project in Android Studio
npx cap open android
```

Shortcut: `npm run cap:android` runs `build` + `cap sync android` + `cap open android` in one step.

### Produce a signed APK / AAB in Android Studio

1. In Android Studio: **Build → Generate Signed Bundle / APK…**
2. Choose **Android App Bundle** (`.aab`, for Google Play) or **APK** (for direct install).
3. Create or select a keystore, fill in the signing details, choose the **release** build variant, and finish.
4. The artifact is written under `android/app/build/outputs/` (`bundle/release/*.aab` or `apk/release/*.apk`).

App identity (configured in `capacitor.config.ts`):

- **App ID:** `com.yourname.retirementcalculatormy`
- **App name:** `Retirement Calculator for Malaysian`

To test on a device quickly without signing, use **Run ▶** in Android Studio with a connected device/emulator, or `npx cap run android`.

---

## Calculation logic (summary)

The shared engine in [`src/engine.ts`](src/engine.ts) is a pure function with no platform dependencies.

**Accumulation (age ≤ retirement age):** the first projection year counts only the months after the current one (the current month's contribution is treated as already made — e.g. in June only Jul–Dec = 6 months count); EPF dividend is applied on the average balance (`opening + ½ of inflows`) pro-rated by months; bonus = monthly rate × bonus months, counted only in years where its pay-month is still ahead (so a bonus already paid earlier in the current year is skipped for the first projection year); salary increments raise the contribution from their effective month (a November increment applies only to Nov–Dec that year, then fully thereafter).

**Retirement (age > retirement age), strictly in this order each year:** (1) compute inflated annual expenses with expired loans dropped; (2) personal savings earns its return; (3) transfer up to the cap into EPF (only while age ≤ stop-transfer age and only what's held); (4) EPF earns its dividend on the full balance; (5) withdraw expenses **from personal savings first, then EPF**; (6) neither balance goes below zero.

See [`src/engine.test.ts`](src/engine.test.ts) for the unit tests proving the waterfall and loan-expiry behaviour.

## Disclaimer

This tool is an **educational projection only** and is **not licensed financial advice**. EPF dividend rates vary every year and are not guaranteed. Consult a licensed financial planner before making decisions.
