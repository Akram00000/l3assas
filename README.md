# myapp (Expo)

## Start (recommended)

Use the cache-safe command below to avoid stale UI bundles on mobile:

```bash
npm start
```

`npm start` runs Expo with cache clearing (`-c`) by default.

## Other start modes

Fast start without cleaning cache:

```bash
npm run start:fast
```

Explicit clean start:

```bash
npm run start:clean
```

## If the phone still shows an old version

1. Stop Expo server.
2. Run `npm run start:clean`.
3. In Expo Go, close and reopen the project.
4. In app Settings, verify `Dev Session` changed.

If `Dev Session` does not change, the phone is still connected to an old Metro instance.
