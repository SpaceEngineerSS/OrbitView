# Contributing

Thanks for taking the time. Bug reports, corrections to the maths and small
focused pull requests are the most useful things you can send.

## Getting set up

```bash
git clone https://github.com/<you>/OrbitView.git
cd OrbitView
npm install          # also copies Cesium's static files
npm run dev
```

Space-Track credentials are optional; see [docs/CONFIGURATION.md](docs/CONFIGURATION.md).

Before opening a pull request:

```bash
npm run check        # tsc, eslint, jest — all must pass with no warnings
npm run build
```

## Changes to the physics

This is the part I'm strict about. If you change anything in `src/lib` that
produces a number shown to users:

1. Say where the method comes from (book, paper, standard) in the file's
   header comment.
2. Add a test that compares against something independent — a numerical
   derivative, a brute-force search, a published value — not just "it returns
   a number". `src/lib/__tests__/science-regressions.test.ts` has examples.
3. Update [THEORY.md](THEORY.md) and [docs/validation.md](docs/validation.md)
   if the method or a tolerance changes.

## Code style

- TypeScript strict. No `any`; if a library type is wrong, narrow it locally
  and say why.
- Components read stores with selectors (`useAppStore(s => s.x)`), never the
  whole store. The simulation clock changes several times a second.
- Cesium objects are created and destroyed in effects, never in render.
- Every visible string goes through `t()` and exists in both
  `messages/en.json` and `messages/tr.json`.
- Missing data is shown as "—". Don't put placeholder numbers on screen.
- Comments explain *why*. Match the density of the file you're editing.

## Interface changes

If you change the UI, retake the screenshots:

```bash
npm run dev            # in one terminal
npm run docs:snap      # in another; writes docs/img/*.png
npm run brand          # if the social preview should change too
```

## Pull requests

- One topic per pull request.
- [Conventional Commits](https://www.conventionalcommits.org/) for messages:
  `fix(science): …`, `feat(ui): …`, `docs: …`.
- Describe what you tested and how.

## Reporting bugs

Include the version (Settings → About), the browser, what you did, what you
expected and what happened. A `?sat=…&t=…` link (Data card → Copy link)
reproduces the exact object and moment, which helps a lot.

Security issues: see [SECURITY.md](SECURITY.md) instead of opening an issue.
