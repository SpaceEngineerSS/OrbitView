# Contributing to OrbitView 💻

First of all, thank you for considering contributing to OrbitView! We are an open-source project dedicated to making space data accessible to everyone.

## 🛠️ Setup Local Development

1. **Clone the Repo:**
   ```bash
   git clone https://github.com/SpaceEngineerSS/OrbitVieW.git
   cd OrbitVieW
   ```
2. **Install Dependencies:**
   ```bash
   npm install
   ```
3. **Environment Setup:**
   Copy `.env.production.example` to `.env.local` and add your settings.
4. **Run Dev Server:**
   ```bash
   npm run dev
   ```

## 🧪 Testing Policy
We use **Jest** for unit testing. All new features (especially mathematical calculations) must include tests.
```bash
npm test          # Run all tests
npm run lint      # Check code style
```

## 📜 Pull Request Guidelines
- **Branches:** Create a feature branch from `main` (e.g., `feature/add-moon-phase`).
- **Commits:** Use [Conventional Commits](https://www.conventionalcommits.org/) (e.g., `feat:`, `fix:`, `docs:`).
- **Approval:** All PRs require a passing CI pipeline and at least one review.

## 🚀 Deployment
If you wish to deploy your own instance, follow the [Deployment Guide](https://github.com/SpaceEngineerSS/OrbitVieW/blob/main/docs/DEPLOYMENT.md).

---

Questions? Open an **Issue** or contact the developer at [spacegumus.com.tr](https://spacegumus.com.tr).
