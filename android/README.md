# Chandra Android Wrapper

This folder contains the Bubblewrap Trusted Web Activity wrapper for Chandra.

## App Identity

- Package name: `app.chandrapanchang.chandra`
- Host: `chandrapanchang.app`
- Start URL: `/`
- Version name: `1.0.0`
- Version code: `1`
- Target SDK: `35`

## Build Checks

Generate/update Android project files from `twa-manifest.json`:

```bash
npx @bubblewrap/cli update --skipVersionUpgrade
```

Build unsigned APK/AAB artifacts for verification:

```bash
npx @bubblewrap/cli build --skipSigning
```

Unsigned build output:

```text
app/build/outputs/bundle/release/app-release.aab
app/build/outputs/apk/release/app-release-unsigned.apk
```

## Signing

Do not commit upload keystores or passwords.

For Play upload, create an upload key outside source control, then build a signed bundle with Bubblewrap using:

```bash
npx @bubblewrap/cli build --signingKeyPath ./chandra-upload-key.keystore --signingKeyAlias chandra-upload
```

After signing, generate the Digital Asset Links fingerprint and publish `assetlinks.json` at:

```text
https://chandrapanchang.app/.well-known/assetlinks.json
```

The `assetlinks.json` fingerprint must match the signing certificate used for the Play-distributed app.

## Current Digital Asset Links State

- Live URL: `https://chandrapanchang.app/.well-known/assetlinks.json`
- Package name: `app.chandrapanchang.chandra`
- Play App Signing SHA-256:

```text
6F:A6:66:FB:48:A7:C4:B0:BF:88:51:2E:9E:9E:22:4A:9C:C1:71:3D:F7:24:82:C0:78:6B:82:E5:B8:89:D8:78
```

This was added in git `832d343` and verified live after Vercel deployment. Keep `public/.well-known/assetlinks.template.json` for future key rotations.
