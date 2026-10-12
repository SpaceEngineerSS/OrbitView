# Installation

## Requirements

- Node.js 20 or newer (I develop on 22)
- npm 10
- A browser with WebGL 2 for the globe

## Steps

```bash
git clone https://github.com/SpaceEngineerSS/OrbitView.git
cd OrbitView
npm install
npm run dev
```

`npm install` runs `scripts/copy-cesium.mjs`, which copies Cesium's web
workers, shaders and textures from `node_modules/cesium/Build/Cesium` into
`public/cesium`. That folder isn't committed; if it's ever missing (for
example after `npm ci --ignore-scripts`), run the script by hand:

```bash
node scripts/copy-cesium.mjs
```

Open http://localhost:3000. The first load downloads the catalog (a few MB);
after that it comes from the browser's IndexedDB and is refreshed in the
background.

## Optional: Space-Track

Without credentials the app uses CelesTrak (about 16,000 active objects).
With a free [Space-Track](https://www.space-track.org) account you get the
whole catalog, debris included (over 30,000 objects):

```bash
cp .env.example .env.local
# then fill in SPACETRACK_USER and SPACETRACK_PASS
```

See [CONFIGURATION.md](CONFIGURATION.md) for every variable.

## Checks

```bash
npm run check     # TypeScript, ESLint, Jest
npm run build     # production build
```

## Troubleshooting

**The globe is black or shows an error card.** The browser or GPU doesn't
provide WebGL. Turn on hardware acceleration, or try a current Chrome,
Firefox or Safari.

**Only about 20 objects, "showing older data".** CelesTrak refused the
download, usually because the same group was fetched from your address
recently. Wait an hour or two, or add Space-Track credentials.

**Fonts or modules fail to resolve in dev.** `next.config.ts` pins
`turbopack.root` to the project folder for this reason; if you moved the
project inside another one that has its own `package-lock.json`, keep that
setting.
