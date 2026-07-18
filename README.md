# Caipy

A Character.AI–style chat app for iOS that talks to your **local LM Studio** server.
Recreates the C.AI chat UI — character cards, message bubbles, streaming replies —
and connects to an OpenAI-compatible LM Studio endpoint over your Wi-Fi.

Built with **Expo + React Native (TypeScript)**. The `.ipa` builds for free on
**GitHub Actions** (macOS runner, no Mac needed, no $99 Apple Developer account).
Sideload onto your iPhone via **SideStore** with a free Apple ID.

---

## What it does

- 🦊 Create characters (name, avatar emoji, personality/system prompt, temperature)
- 💬 Chat with a C.AI-style UI: user bubbles right, AI left with avatar + name, streaming token-by-token, typing indicator, regenerate
- 🔌 Connects to LM Studio's OpenAI-compatible API (`/v1/chat/completions`, SSE streaming)
- ⚙️ Settings: server URL, optional API key, model picker (auto-loads from `/v1/models`), max tokens, theme
- 🔒 Server URL + API key stored in the iOS Keychain; chats/characters in AsyncStorage
- 📡 Works over your LAN (phone and Arch box on the same Wi-Fi)

---

## How it works (the build + install pipeline)

The key insight: **building and signing are separate steps.**

```
Your Arch box                    GitHub cloud              Your iPhone
─────────────                    ────────────              ──────────
push to repo  ──────────────►  Actions runs on
  (free)          free          macos-latest runner
                                (no account needed)
                                    │
                                    ▼
                                xcodebuild archives
                                → unsigned .ipa
                                    │
                                    ▼
                                upload as artifact  ──────► download .ipa
                                                              │
                                                              ▼
                                                        SideStore signs
                                                        with free Apple ID
                                                        → app runs!
                                                        (re-sign every 7 days)
```

- **Build**: GitHub Actions macOS runner — **free for public repos**, no account needed.
  Produces an *unsigned* `.ipa` (no signing credentials required).
- **Sign + install**: [SideStore](https://sidestore.io/) signs the unsigned `.ipa`
  on-device with a **free Apple ID** (any iCloud account — no $99).
- **7-day expiry**: Apple's rule for free-ID signing. SideStore refreshes wirelessly
  over Wi-Fi. No USB needed after initial pairing.

**Total cost: $0. No Mac. No $99 account. Just a free Apple ID and a public GitHub repo.**

---

## 1. LM Studio setup (on your Arch box)

1. Open **LM Studio → Developer** tab.
2. Start the server on port **1234**.
3. **Toggle "Serve on Local Network"** — this binds `0.0.0.0` instead of `localhost`,
   which your phone needs to reach it. Without this, the connection silently fails.
4. **Load a model** in LM Studio (the same model id the app will show).
5. Find your Arch box's LAN IP:
   ```bash
   ip -br addr        # look for your wlan/eth interface, e.g. 192.168.1.50
   ```
6. From the phone, sanity-check it's reachable (any browser):
   ```
   http://192.168.1.50:1234/v1/models
   ```
   You should see a JSON list of models.

> **Security note:** Binding to `0.0.0.0` exposes the API to everyone on your Wi-Fi.
> That's fine at home; don't forward port 1234 through your router.

---

## 2. Build the `.ipa` (GitHub Actions, free)

### Create a public GitHub repo

```bash
cd caipy
git init
git add .
git commit -m "initial commit"
gh repo create caipy --public --source --push
# or: create a repo on github.com, add remote, push manually
```

> **Public repo required.** GitHub's macOS runners are free for public repos.
> For private repos, macOS minutes cost ~$0.08/min and burn through your free
> 2000 min/mo quota fast (~25 builds).

### The workflow runs automatically

The `.github/workflows/build-ios.yml` workflow triggers on every push to `main`
or `master`. It also has a manual trigger (Actions tab → "Run workflow").

It does:
1. Checks out code, installs Node 20 + deps
2. `npx expo prebuild` — generates the native `ios/` Xcode project
3. Patches signing to disable code signing (unsigned archive)
4. `xcodebuild archive` on the macOS runner
5. Packages the `.app` into a SideStore-compatible unsigned `.ipa`
6. Uploads `Caipy-unsigned.ipa` as a downloadable artifact

### Download the `.ipa`

1. Go to your repo on github.com → **Actions** tab
2. Click the latest workflow run
3. Scroll to **Artifacts** → download `caipy-unsigned-ipa`
4. Extract the zip — inside is `Caipy-unsigned.ipa`

Build takes ~15-25 minutes. The log uploads automatically on failure for debugging.

---

## 3. Sideload the `.ipa` onto your iPhone (free Apple ID)

### One-time: pair your iPhone from Linux

1. Install sideload dependencies:
   ```bash
   sudo pacman -S libimobiledevice usbmuxd
   ```
2. Plug the iPhone into your Arch box via USB. **Trust the computer** on the phone.
3. Pair:
   ```bash
   idevicepair pair
   ```
4. Follow [SideStore's setup guide](https://sidestore.io/) for the initial
   wireless pairing (generates a provisioning file so SideStore can sign apps
   without a computer going forward).

### Install SideStore + Caipy

1. On the phone, install **SideStore** itself ([sidestore.io](https://sidestore.io/)
   has the latest method).
2. Open SideStore, sign in with your **free Apple ID** (any iCloud account).
3. Transfer `Caipy-unsigned.ipa` to your phone (AirDrop, Files app, iCloud Drive, etc.).
4. In SideStore, tap the `+` and select the `.ipa`.
5. SideStore signs it with your Apple ID and installs it.
6. **Trust the developer cert:** Settings → General → VPN & Device Management →
   tap your Apple ID → Trust.

The app appears on your home screen. Open it → Settings → enter your LM Studio
URL → Test connection → pick model → chat!

### Refreshing after 7 days

SideStore refreshes apps wirelessly when on Wi-Fi. Open SideStore occasionally
and tap **Refresh** on Caipy. No USB needed after the first pairing.

---

## 4. Configure the app

1. Open Caipy → **Settings** (⚙️ gear in the top-right of Home).
2. **Server URL**: `http://192.168.1.50:1234/v1` (your Arch box's LAN IP).
3. **API key**: optional — LM Studio doesn't require one by default.
4. Tap **Test connection**. You should see ✓ Connected and a model list.
5. Pick a model. Done — go back and tap a character to start chatting.

---

## 5. Developing / making changes

Install dependencies locally:
```bash
cd caipy
yarn install              # npm isn't present; yarn is (Arch ships it)
```

Typecheck:
```bash
node node_modules/typescript/bin/tsc --noEmit
```

Regenerate placeholder icon/splash assets:
```bash
node scripts/gen-assets.js
```

After making changes, push to the repo and the GitHub Actions workflow rebuilds
the `.ipa` automatically. Download the new artifact and re-sideload.

> **Iterating faster:** Each push = ~15-25 min cloud build. To test UI changes
> without burning builds, you can run `yarn expo start` and test in the Expo Go
> app on your phone (limited — no native module testing, but good for layout work).

---

## Project structure

```
caipy/
├── .github/workflows/build-ios.yml   GitHub Actions: unsigned .ipa build
├── app.config.ts                     Expo config (ATS for LAN http, bundle id)
├── eas.json                          EAS profiles (optional, for if you get $99)
├── package.json
├── tsconfig.json
├── babel.config.js
├── App.tsx                           entry; hydrates Keychain, mounts navigator
├── assets/                           icon, splash, adaptive icon (generated)
├── scripts/gen-assets.js              regenerates assets
└── src/
    ├── types.ts
    ├── api/lmstudio.ts               OpenAI-compat client + SSE streaming
    ├── store/                        zustand stores (settings, characters, chats)
    ├── screens/                      Home, Chat, CharacterEditor, Settings
    ├── components/                   Avatar, MessageBubble, TypingIndicator, …
    ├── navigation/                   RootNavigator + route types
    └── theme/                        dark/light palettes + useTheme hook
```

---

## Troubleshooting

### Build issues

**"No .app found in archive"**
- Check the uploaded `xcodebuild-log` artifact for the actual error.
- Common: CocoaPods version mismatch. The `pod install --repo-update` step
  should handle this, but GitHub's macOS image occasionally ships a stale version.

**Workflow not triggering**
- Must push to `main` or `master`. Or use Actions tab → "Run workflow" (manual).

**Private repo builds**
- Work, but macOS minutes are billed (~$0.08/min). Your free 2000 min/mo GitHub
  allowance goes fast on macOS. Public is truly free.

### Sideload issues

**"Couldn't reach LM Studio"**
- Is LM Studio's server running? (Developer tab → server started)
- Is **Serve on Local Network** on?
- Are phone and Arch box on the same Wi-Fi? (not a guest network)
- Try `http://192.168.1.50:1234/v1/models` in the phone's browser — JSON?
- Some routers isolate Wi-Fi clients; disable "AP isolation" if so.

**App installs but won't open / "Untrusted Developer"**
- Settings → General → VPN & Device Management → tap your Apple ID → Trust.

**App stopped working after a week**
- 7-day free-signing expiry. Open SideStore → Refresh.

---

## Honest limitations

- **7-day re-sign** is an Apple rule, not a tool limitation. No way around it
  without a $99 Apple Developer Program account (which would let EAS produce
  a permanently-signed `.ipa` — the `eas.json` in this repo supports that path
  if you ever add one).
- **3 apps per device** max with a free Apple ID (also Apple's rule).
- **Public repo** — your code is visible. Fine for a personal chat client.
- **LAN only** (per your choice). For anywhere-access, add a tunnel
  (Tailscale/cloudflared/ngrok) and point the Server URL at it.
- **Not an official Character.AI product** — a UI recreation that talks to
  your local model instead of C.AI's servers.
