# Sharing a test APK

Yes — `preview` is an internal-distribution profile and now builds an APK you
can hand to testers directly (a link or the file itself, no Play Store).

```
cd app
npx eas-cli@latest build --profile preview --platform android
```

EAS returns a download URL when it finishes. Anyone can install it after
allowing "install from unknown sources".

## Before you send it out

**1. The Supabase keys must reach the cloud build.** This is the one that will
bite you. `app/.env` exists on your machine, but EAS builds on Expo's servers
and never sees it — so a build made today would ship without
`EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`, and
`src/lib/supabase.ts` throws on startup. Every tester would get an immediate
crash.

Push them as EAS environment variables once:

```
npx eas-cli@latest env:create --name EXPO_PUBLIC_SUPABASE_URL      --value "<url>"  --environment preview
npx eas-cli@latest env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "<key>" --environment preview
```

The anon key is designed to be public and is safe in a client bundle — it is
the *service_role* key that must never be. Do not add that one.

**2. Tell testers what is not wired up.** They will otherwise report these as
bugs:

- **Payments do nothing.** `billingRepository` throws by design; checkout,
  premium and billing screens show "payments are not connected yet". No
  provider is configured.
- **The 6-digit signup code will not work** until the Supabase "Confirm
  signup" template includes `{{ .Token }}`. The email link in the same message
  does work, and the verify screen polls for it — so testers should tap the
  link, not type a code.
- **The selfie check** on player verification is not connected to any identity
  provider.
- **Club accounts** work against the live database (the clubs migration is
  applied), but no club has been verified, so club testers will correctly see
  under-18 players hidden.

**3. Ratings come from the real pipeline.** `ai-service` must be running for an
AI-analysis upload to ever leave `queued`. If it is not, testers will see the
analysis screen sit there — which is accurate, not a UI bug.

## What is worth asking testers to check

The flows that are fully wired end to end: sign up, complete the profile
wizard, upload a highlight, browse Reels, apply to a trial, message a scout,
and the settings screens. Those exercise the parts that are real.
