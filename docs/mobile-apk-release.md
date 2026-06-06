# LABTRACK Mobile APK Release Flow

This app builds Android APK releases with Expo EAS cloud builds. Production APKs are not built from a local Android device.

## Version Source

- The committed source of truth is `apps/mobile/app.json`.
- `expo.version` is the user-visible app version, for example `0.1.1`.
- `expo.android.versionCode` is the Android installer version and must increase for every APK shipped.
- `apps/mobile/eas.json` keeps `cli.appVersionSource` set to `local` so the APK version matches the committed app config.
- If a local generated `apps/mobile/android` folder exists, the version and build helpers sync `android/app/build.gradle` from `app.json` before building. The generated native folder stays ignored unless the project intentionally becomes a bare React Native app.
- `apps/mobile/package.json` and `package-lock.json` are kept in sync by the version script.

Current production release target: `0.1.1` with Android `versionCode` `2`.

## Release Steps

1. Start from a clean, updated `main` branch.
2. Bump the mobile version:

   ```powershell
   npm.cmd run version:mobile:android:patch
   ```

   Use `version:mobile:android:minor` or `version:mobile:android:major` for larger releases.

3. Review and commit the changed version files.
4. Push the commit to `main`.
5. Build the production APK in EAS cloud:

   ```powershell
   npm.cmd run build:mobile:android:production
   ```

6. Confirm the downloaded APK and metadata JSON in `apps/mobile/builds/`.

## Production Defaults

- Production uses the `production` EAS profile.
- The production profile pins `environment: "production"` so the internal APK reads EAS production environment variables.
- Production produces an APK with `android.buildType: "apk"` and `distribution: "internal"`.
- Quick-login is disabled for production builds by default with `EXPO_PUBLIC_ENABLE_QUICK_LOGIN=false`.
- The build helper syncs only the required public Supabase variables for production unless quick-login is explicitly enabled.
- Quick-login password variables are synced to EAS as `sensitive` values for non-production builds.

To intentionally build production with quick-login enabled, set `EXPO_PUBLIC_ENABLE_QUICK_LOGIN=true`, pass the override directly to the mobile helper, and use non-demo quick-login credentials:

```powershell
node apps/mobile/scripts/build-android-apk.mjs --profile production --allow-production-quick-login
```

When quick-login is disabled for production, the build helper also deletes stale `EXPO_PUBLIC_QUICK_LOGIN_*` values from the EAS production environment before building.

## Required Environment

The build machine or EAS environment must provide:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

The helper loads `apps/mobile/.env`, then overlays process environment variables. It syncs the required values to the EAS project before starting the build unless `--no-sync-eas-env` is passed.

## Artifacts

Successful builds are downloaded to `apps/mobile/builds/` with names like:

```text
LABTRACK-v0.1.1-b2-production-YYYYMMDDTHHMMSSZ-<buildid>.apk
```

Each APK has a sibling `.json` metadata file containing the EAS build ID, artifact URL, file size, SHA256 hash, app version, and Android version code. The build output directory is intentionally gitignored.

If the local EAS CLI connection drops after starting a cloud build, the helper checks recent Android builds and downloads only a finished artifact that matches the current profile, app version, Android version code, git commit, and build start time.
