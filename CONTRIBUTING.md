# Contributing to OrbitView

Thank you for your interest in contributing to OrbitView! 🛰️

## Getting Started

1. **Fork the repository** ([OrbitVieW](https://github.com/SpaceEngineerSS/OrbitVieW)) and clone it locally
2. **Install dependencies**: `npm install`
3. **Start development server**: `npm run dev`
4. **Create a branch**: `git checkout -b feature/your-feature-name`

## Development Guidelines

### Code Style

- Use TypeScript for all new code
- Follow the existing code patterns
- Use meaningful variable and function names
- Add JSDoc comments for complex functions

### Commit Messages

Follow conventional commits format:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

Example: `feat: add observer location selector`

### Pull Request Process

1. Ensure your code passes linting: `npm run lint`
2. Update documentation if needed
3. Add tests for new features
4. Create a clear PR description explaining the changes
5. Link any related issues

## Project Structure

```
src/
├── app/            # Next.js pages
├── components/     # React components
│   ├── HUD/       # User interface panels
│   └── Scientific/ # Analysis tools
├── lib/           # Core calculations
├── hooks/         # Custom React hooks
└── types/         # TypeScript definitions
```

## Reporting Bugs

When reporting bugs, please include:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Browser/OS information
- Screenshots if applicable

## Feature Requests

We welcome feature suggestions! Please open an issue with:
- Clear description of the feature
- Use case / why it would be useful
- Any implementation ideas

## Questions?

Feel free to open a discussion or issue if you have questions.

Thank you for contributing! 🚀
