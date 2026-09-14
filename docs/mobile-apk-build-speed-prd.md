# LABTRACK Fast Android APK Build PRD

## 1. Executive Summary

LABTRACK needs a faster, more predictable Android APK build workflow for development testing, stakeholder previews, and production release candidates. The current repo already has Expo/EAS APK profiles, app-version automation, short-path Windows build helpers, and APK artifact download metadata, but the lanes are not clearly separated by speed, risk, and release intent. This PRD defines a build system improvement that preserves the existing Expo setup while adding a documented fast local/dev-client lane, an optimized preview APK lane, a guarded production APK lane, measurable build-time targets, artifact naming, verification gates, and cache hygiene.

## 2. Problem Statement

Developers need to produce LABTRACK APKs quickly without guessing which command to run, waiting on unnecessary cloud builds, or risking production configuration drift.

Current repo signals:

- Root workspace scripts already expose mobile Android build commands through `package.json`.
- `apps/mobile/package.json` contains mobile commands for Expo start, dev-client start, Android install/emulator, short-path sync, version bumping, and EAS APK builds.
- `apps/mobile/eas.json` already defines `development`, `preview`, and `production` profiles with Android `buildType: "apk"`.
- `apps/mobile/scripts/build-android-apk.mjs` already syncs versions, generates assets, syncs selected EAS environment variables, triggers `eas build -p android --profile ... --wait --json`, downloads the artifact into `apps/mobile/builds`, and writes metadata with URL, SHA256, size, and APK path.
- Windows-specific build helpers already exist for short-path native Android work under `I:\labtrack\build`.
- `docs/mobile-apk-release.md` already documents the current cloud-oriented release flow.

The pain is not that LABTRACK has no APK pipeline. The pain is that the pipeline does not yet optimize for the fastest acceptable build per use case.

## 3. Target Users

Primary users:

- Developer or AI coding agent preparing frequent test APKs.
- Project owner who needs a shareable APK fast.
- QA tester installing APKs on emulator or Android device.

Secondary users:

- Instructor/stakeholder reviewing preview builds.
- Future maintainer who needs to recover or reproduce a shipped APK.

Jobs to be done:

- "When I change JS/TS-only mobile code, I want a fast validation path that does not trigger a full release APK build."
- "When I need a shareable APK, I want one command that creates a known profile build and stores a traceable artifact."
- "When I need production, I want a slower but guarded path that prevents quick-login or env leakage."

## 4. Goals

- Reduce routine mobile validation time by routing most changes through dev-client or emulator flows instead of full APK rebuilds.
- Make APK build command choice obvious: fast dev, preview share, or production release.
- Preserve Expo/EAS support because current Expo docs continue to support profile-based Android APK builds with `android.buildType: "apk"` and `eas build -p android --profile preview`.
- Keep Windows native build reliability by using the existing short-path strategy rather than building deep inside the repo path.
- Produce APK artifacts with version, profile, build ID, size, SHA256, and source commit metadata.
- Make failures actionable: cache issue, env issue, EAS issue, Android toolchain issue, or app compile issue.

## 5. Non-Goals

- Do not rewrite LABTRACK from Expo managed/prebuild workflow to a fully bare React Native app.
- Do not remove EAS cloud builds.
- Do not change app features, Supabase schema, auth behavior, QR workflow, or UI.
- Do not publish to Play Store in this phase.
- Do not modify production credentials or server configuration as part of APK speed work.
- Do not silently clean global Gradle, npm, Android SDK, or EAS caches; destructive cleanup must be explicit.

## 6. Current Build Surface

Repo files to treat as source of truth:

- `package.json`: root workspace commands, including `build:mobile:android:*`.
- `apps/mobile/package.json`: mobile commands for Expo, short-path Android install, versioning, and APK builds.
- `apps/mobile/eas.json`: EAS profiles: `development`, `preview`, `production`.
- `apps/mobile/app.json`: Expo app name, slug, package `edu.psu.ccs.labtrack`, version `0.1.1`, and Android `versionCode` `2`.
- `apps/mobile/android/gradle.properties`: local Gradle/JDK tuning and Android architecture settings.
- `apps/mobile/scripts/build-android-apk.mjs`: current EAS APK build orchestrator.
- `apps/mobile/scripts/android-build-paths.ps1`: Windows short-path build environment defaults.
- `apps/mobile/scripts/sync-to-short-path.ps1`: short-path source sync excluding generated or heavy directories.
- `docs/mobile-apk-release.md`: current release-process documentation.

Important current-state warning:

- The working tree currently contains modified files and untracked Android helper scripts. Implementation must inspect and preserve those changes. Do not overwrite or reformat them as part of this PRD.

## 7. Proposed Solution

Implement a three-lane APK build strategy.

### Lane A: Fast Development Validation

Purpose: fastest feedback for everyday app changes.

Expected use:

- JS/TS screen changes.
- Styling changes.
- Supabase client/query changes.
- Navigation changes that do not modify native plugins.

Desired commands:

```powershell
npm run dev:mobile:dev-client
npm run dev:mobile:android:install
```

Requirements:

- Reuse the installed development client when native dependencies have not changed.
- Start Metro with `expo start --dev-client`.
- Use the existing short-path install flow for native dev-client setup.
- Document when a dev-client reinstall is required: native plugin change, Android config change, Expo SDK/native dependency change, permission change, or clean emulator/device.
- Add a smoke-test checklist: app launches, login route renders, QR scanner permission prompt appears, Supabase-backed dashboard loads.

Target:

- JS-only feedback loop: under 2 minutes after Metro is warm.
- Dev-client reinstall after native change: under 15 minutes on the configured Windows machine.

### Lane B: Fast Shareable Preview APK

Purpose: create an installable APK for testers/stakeholders as quickly as possible while keeping non-production conveniences such as quick login.

Expected command:

```powershell
npm run build:mobile:android:preview
```

Requirements:

- Keep `apps/mobile/eas.json` preview profile with `distribution: "internal"` and Android `buildType: "apk"`.
- Continue writing downloaded APKs to `apps/mobile/builds`.
- Preserve metadata JSON next to every APK.
- Add or document an optional "reuse latest matching successful EAS build" behavior when a fresh EAS wait fails but a matching build exists.
- Add a clear difference between preview and production env values.
- Add a post-build command or checklist to verify APK installability with Android tooling.

Target:

- Cloud preview APK: target under 20 minutes, excluding EAS queue delays.
- Recovered existing matching artifact: under 3 minutes.

### Lane C: Guarded Production APK

Purpose: slower, traceable, release-candidate APK with production-safe env and no quick-login behavior.

Expected command:

```powershell
npm run build:mobile:android:production
```

Requirements:

- Production profile must keep `EXPO_PUBLIC_ENABLE_QUICK_LOGIN=false`.
- Build script must continue preventing production quick-login unless an explicit override is passed.
- Version must be bumped before a production APK is shared.
- Production APK must include a metadata file with version, versionCode, EAS build ID, source commit, SHA256, artifact URL, build timestamp, and profile.
- Production release docs must state where the APK is stored and how to verify it.

Target:

- Production APK: correctness over speed; target under 30 minutes excluding EAS queue delays.

## 8. Functional Requirements

### FR1: Build Lane Documentation

Create or update docs so a developer can answer "which command should I run?" within 30 seconds.

Acceptance criteria:

- Documentation lists the three lanes: dev validation, preview APK, production APK.
- Each lane has command, expected output, when to use, when not to use, and verification.
- Docs explicitly say JS-only changes should not start with a full APK build.

### FR2: Build-Time Instrumentation

Every APK build command must report timing for major phases.

Phases:

- env load/sync
- app asset generation
- EAS build start
- EAS wait/recovery
- APK download
- metadata write

Acceptance criteria:

- Console output includes elapsed time per phase.
- Metadata JSON includes total duration and phase durations.
- Failed builds print the phase that failed.

### FR3: Cache and Short-Path Policy

Define a non-destructive cache strategy.

Acceptance criteria:

- Keep Gradle cache in the user profile by default, matching `android-build-paths.ps1`.
- Keep short-path source staging at `I:\labtrack\build` unless overridden by `LABTRACK_ANDROID_BUILD_ROOT`.
- Do not wipe `node_modules`, `.gradle`, Android SDK, or EAS caches automatically.
- Provide a separate explicit cleanup command for generated short-path staging only.

### FR4: EAS Profile Contract

Preserve and tighten EAS profile behavior.

Acceptance criteria:

- `development`, `preview`, and `production` profiles remain present.
- Android profiles continue to produce APK output via `android.buildType: "apk"`.
- `production` disables quick login.
- `development` remains a development-client profile.
- Profile-specific env behavior is documented and validated before build.

### FR5: Artifact Contract

Every shareable APK must be traceable.

Acceptance criteria:

- APK filename includes app name, version, versionCode, profile, timestamp, and build ID.
- Metadata JSON sits next to the APK.
- Metadata includes SHA256 and artifact URL.
- Documentation explains how to identify the latest preview and latest production APK.

### FR6: Install Verification

Preview and production lanes must define a minimum install check.

Acceptance criteria:

- Verify APK file exists and is non-empty.
- Verify file hash matches metadata.
- Verify Android package name is `edu.psu.ccs.labtrack`.
- Verify APK can install on emulator or device.
- Verify app opens to the expected initial route.

### FR7: Failure Classification

Build failures should point to next action.

Failure categories:

- EAS quota/queue/auth problem.
- EAS env sync problem.
- Expo config/prebuild problem.
- Android SDK/JDK/Gradle problem.
- Windows path-length/staging problem.
- App compile/type error.
- APK download/artifact problem.

Acceptance criteria:

- Build script or docs map common error text to one category.
- Each category has a first diagnostic command.
- The diagnostics are read-only unless explicitly labeled cleanup.

## 9. Technical Requirements

Recommended implementation areas:

- `docs/mobile-apk-release.md`: fold in the lane model or link to this PRD after implementation.
- `apps/mobile/scripts/build-android-apk.mjs`: add phase timing, metadata duration fields, and clearer failure categories.
- `apps/mobile/package.json`: add explicit aliases if needed, such as `build:android:fast-preview` or `verify:android:apk`.
- `package.json`: expose only the high-level workspace commands needed by users.
- `apps/mobile/scripts/*.ps1`: preserve short-path behavior; only adjust if needed for verification and cleanup clarity.

Potential new scripts:

```powershell
npm run verify:mobile:android:apk -- <apk-path>
npm run build:mobile:android:preview:reuse
npm run build:mobile:android:dev-client:local
```

Implementation should prefer small changes to the existing scripts over a second build system.

## 10. UX / Developer Experience Requirements

The build flow should be understandable from command names alone.

Expected command naming:

- `dev:mobile:dev-client`: run Metro for fast iteration.
- `dev:mobile:android:install`: install/reinstall dev client.
- `build:mobile:android:preview`: shareable internal APK.
- `build:mobile:android:production`: guarded production APK.
- `version:mobile:android:patch`: production version bump.

CLI output requirements:

- Start by printing profile, version, versionCode, package, and output folder.
- Print whether quick login is enabled.
- Print the artifact path and SHA256 at the end.
- For production builds, print "quick login disabled" explicitly.

## 11. Data / Security Requirements

- Do not print sensitive env values.
- Keep password-like EAS variables sensitive.
- Production builds must not include demo credentials or quick-login defaults.
- Do not persist secrets in generated metadata JSON.
- Do not commit generated APKs unless explicitly intended by release policy.
- Keep `apps/mobile/builds` as local artifact output unless the team chooses a hosted artifact store.

## 12. Rollout Plan

Phase 1: Documentation and measurement

- Add command decision table.
- Add timing instrumentation to current build script.
- Record baseline timings for dev-client install, preview APK, and production APK.

Phase 2: Verification and artifact hardening

- Add APK verification command/checklist.
- Add metadata fields for duration and source commit if missing.
- Document recovery from recent matching EAS artifact.

Phase 3: Fast-lane optimization

- Make dev-client flow the default recommendation for JS-only changes.
- Confirm short-path local install path works on the target Windows machine.
- Avoid unnecessary asset generation or EAS env sync for lanes that do not need it.

Phase 4: Production guardrails

- Enforce production quick-login disabled.
- Require explicit version bump before production.
- Add production release checklist with hash/install verification.

## 13. Success Metrics

Primary metric:

- Median time from "need a testable mobile change" to "running on emulator/device" decreases by at least 50% for JS-only changes.

Secondary metrics:

- Preview APK command success rate above 90%.
- Production APKs always include metadata JSON.
- Zero production APKs shipped with quick login enabled.
- Build failures classify into a known category at least 80% of the time.
- New developer can choose the correct build lane using docs in under 2 minutes.

Baseline to collect during implementation:

- Current `npm run dev:mobile:android:install` duration.
- Current `npm run build:mobile:android:preview` duration.
- Current `npm run build:mobile:android:production` duration.
- EAS queue wait time vs local script time.

## 14. Testing Plan

Static checks:

```powershell
npm run typecheck
npm run test
```

Preview APK test:

```powershell
npm run build:mobile:android:preview
```

Production APK test:

```powershell
npm run version:mobile:android:patch
npm run build:mobile:android:production
```

Manual install smoke test:

- Install APK on emulator or Android device.
- Launch app.
- Confirm package name.
- Confirm sign-in or expected initial screen.
- Confirm scanner permission flow still works.
- Confirm Supabase-backed data loads with the selected profile env.

Do not run production build tests against live credentials without explicit approval.

## 15. Risks and Mitigations

Risk: EAS queue or quota dominates build time.

Mitigation: prioritize dev-client lane for fast iteration and artifact recovery for already-finished matching builds.

Risk: Windows path length or native build instability slows local Android builds.

Mitigation: keep short-path staging under `I:\labtrack\build` and avoid deep in-place native builds.

Risk: Production quick login leaks into release APK.

Mitigation: keep production env guard in the build script and add metadata/docs verification.

Risk: Aggressive cleanup deletes useful caches and makes builds slower.

Mitigation: cleanup only generated staging outputs by explicit command.

Risk: Parallel agents overwrite ongoing build-script changes.

Mitigation: inspect current git status before implementation and patch only targeted files.

## 16. Open Questions

- Should LABTRACK keep using EAS cloud as the only source for shareable APKs, or add a first-class local Gradle APK lane for no-quota builds?
- Should preview APKs be uploaded to a stable public/private download URL after creation?
- Should `apps/mobile/builds` be gitignored if it is not already?
- Should the team standardize on `I:\labtrack\build` or move the short root to `C:\short\labtrack` for machines without an I drive?
- What is the acceptable maximum build time for stakeholder preview APKs when EAS queue delays are high?

## 17. Implementation Checklist

- [ ] Preserve current uncommitted changes; inspect `git status` before editing.
- [ ] Update docs with three build lanes and command decision table.
- [ ] Add timing instrumentation to `build-android-apk.mjs`.
- [ ] Add or document APK verification command.
- [ ] Add failure category mapping.
- [ ] Validate dev-client fast path on emulator.
- [ ] Validate preview APK build and metadata.
- [ ] Validate production quick-login guard without exposing secrets.
- [ ] Record baseline and final timing metrics in release docs.

