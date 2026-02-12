# Contributing to OrbitView 🛰️

First off, thank you for considering contributing to OrbitView! It's people like you that make OrbitView such a great tool for the space community.

## 🤝 Code of Conduct

By participating in this project, you are expected to uphold our [Code of Conduct](CODE_OF_CONDUCT.md). Please report unacceptable behavior to [contact@spacegumus.com.tr](mailto:contact@spacegumus.com.tr).

## 🧪 Scientific Verification Standard

**CRITICAL:** OrbitView is a scientific instrument, not just a visualization toy. Any changes to physics models, orbital propagation, or numerical methods **MUST** be accompanied by:

1.  **Reference Citation:** Link to the paper, textbook, or standard (e.g., Vallado, Celestrak).
2.  **Validation Data:** Comparison against a known ground truth (e.g., NASA Horizons, GMAT, or official TLEs).
3.  **Unit Tests:** New physics logic must have coverage in `__tests__`.

## 🛠️ Development Workflow

### Prerequisites
- Node.js 18+
- npm or yarn

### Setup
1.  **Fork and Clone**
    ```bash
    git clone https://github.com/YOUR_USERNAME/OrbitView.git
    cd OrbitView
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Environment Setup**
    Copy `.env.example` to `.env.local` and add your Cesium Ion Token.
    ```bash
    NEXT_PUBLIC_CESIUM_ACCESS_TOKEN=your_token_here
    ```

4.  **Start Dev Server**
    ```bash
    npm run dev
    ```

### Documentation Automation
We use automated scripts to generate documentation assets. If you change the UI:
```bash
npm run docs:snap  # Generates new screenshots in public/screenshots/
```

## 📐 Coding Standards

- **TypeScript:** Strict mode is enabled. No `any`.
- **Styling:** Tailwind CSS with our `Orbital Glass` design system (see `globals.css`).
- **State Management:** Zustand for global state. Avoid Prop Drilling.
- **Performance:**
    - Use `useMemo` for heavy math.
    - Offload heavy tracking to Web Workers (`workers/satellite-worker.ts`).

## 📥 Submitting a Pull Request (PR)

1.  Create a branch: `git checkout -b feat/my-new-feature`
2.  Commit changes: `git commit -m 'feat: add exciting feature'`
    - Use [Conventional Commits](https://www.conventionalcommits.org/) format.
3.  Run tests: `npm test`
4.  Push to branch: `git push origin feat/my-new-feature`
5.  Open a Pull Request.

## 🐛 Bug Reports

Please include:
- **Version:** (e.g., v2.3.0)
- **Browser:** (e.g., Chrome 120)
- **Detailed Steps:** How to reproduce the erro.
- **Screenshots:** Visual proof of the bug.

---
*Happy Coding, Space Cowboy!* 🤠🚀


Thank you for your interest in contributing to OrbitView! 🛰️

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/OrbitView.git`
3. Create a feature branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Submit a Pull Request

## Development Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Type checking
npm run type-check
```

## Before Submitting a Pull Request

> ⚠️ **Important:** Please ensure ALL tests pass before opening a PR.

```bash
# Run the full test suite
npm test

# Verify type safety
npm run type-check

# Build check
npm run build
```

## Code Style Guidelines

- Use TypeScript for all new code
- Follow existing code patterns and naming conventions
- Add JSDoc comments for public functions
- Keep components focused and reusable

## Commit Messages

Use clear, descriptive commit messages:

- `feat: add doppler shift visualization`
- `fix: correct orbit path rendering for GEO satellites`
- `docs: update README with new features`
- `refactor: optimize worker batch processing`

## Reporting Issues

When reporting bugs, please include:

1. Browser and version
2. Steps to reproduce
3. Expected behavior
4. Actual behavior
5. Console errors (if any)

## Questions?

Feel free to open an issue for any questions or suggestions!

---

Thank you for helping make OrbitView better! 🚀
