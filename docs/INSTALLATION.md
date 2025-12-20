# Installation Guide

Follow these steps to set up OrbitView on your local development environment.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: version 18.17.0 or higher.
- **npm**: version 9.x or higher (or Yarn/pnpm).
- **Git**: For cloning the repository.
- **Cesium Ion Token**: (Optional but recommended for high-res terrain) Get one at [cesium.com/ion](https://cesium.com/ion/).

## 🛠️ Step-by-Step Setup

### 1. Clone the Repository
```bash
git clone https://github.com/SpaceEngineerSS/orbitview.git
cd orbitview
```

### 2. Install Dependencies
We recommend using `npm` for consistency:
```bash
npm install
```

### 3. Environment Configuration
Copy the example environment file and customize it:
```bash
cp .env.example .env.local
```
Edit `.env.local` to include your Space-Track credentials if you have them. See [CONFIGURATION.md](./CONFIGURATION.md) for details on available variables.

### 4. Run Development Server
```bash
npm run dev
```
The application will be accessible at [http://localhost:3000](http://localhost:3000).

## 🏗️ Production Build

To build the application for production use:
```bash
npm run build
npm start
```

## 🐋 Docker Installation

If you prefer using Docker:

1. **Build the image**:
   ```bash
   docker build -t orbitview .
   ```

2. **Run the container**:
   ```bash
   docker run -p 3000:3000 --env-file .env orbitview
   ```

---

## 👨‍💻 Developer Support

Developed by **Mehmet Gümüş**.
For installation issues, contact [contact@spacegumus.com.tr](mailto:contact@spacegumus.com.tr) or visit [spacegumus.com.tr](https://spacegumus.com.tr).

*Last Updated: 2025-12-20*
