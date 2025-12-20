# OrbitView Deployment Guide

This document provides instructions on how to deploy OrbitView to various platforms.

## 🚀 Quick Deploy to Vercel

OrbitView is optimized for Vercel.

1.  **Fork the repository** to your GitHub account.
2.  **Create a new project** in the [Vercel Dashboard](https://vercel.com/dashboard).
3.  **Import your fork**.
4.  **Configure Environment Variables**:
    -   `SPACETRACK_USER`: Your Space-Track.org email (optional)
    -   `SPACETRACK_PASS`: Your Space-Track.org password (optional)
    -   `NEXT_PUBLIC_APP_URL`: `https://orbitview-five.vercel.app`
5.  **Click Deploy**.

## 🐳 Docker Deployment (Self-Hosting)

You can run OrbitView using Docker.

```bash
# Build the image
docker build -t orbitview .

# Run the container
docker run -p 3000:3000 \
  -e SPACETRACK_USER=your_user \
  -e SPACETRACK_PASS=your_pass \
  orbitview
```

## 🔧 Manual Server Deployment

1.  **Clone and Install**:
    ```bash
    git clone https://github.com/SpaceEngineerSS/orbitview.git
    cd orbitview
    npm install
    ```
2.  **Build**:
    ```bash
    npm run build
    ```
3.  **Start**:
    ```bash
    npm start
    ```

---

## 👨‍💻 Developer Support

Developed by **Mehmet Gümüş**.
For custom deployment assistance, visit [spacegumus.com.tr](https://spacegumus.com.tr).

*Last Updated: 2025-12-20*
