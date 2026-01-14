# Contributing to OrbitView

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
