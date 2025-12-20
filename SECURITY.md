# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Reporting a Vulnerability

We take the security of OrbitView seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### How to Report

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to:

📧 **security@spacegumus.com.tr**

Or you can contact the developer directly:

🌐 **Website:** [spacegumus.com.tr](https://spacegumus.com.tr)  
🐙 **GitHub:** [OrbitVieW](https://github.com/SpaceEngineerSS/OrbitVieW)

### What to Include

Please include the following information in your report:

- Type of vulnerability (e.g., XSS, CSRF, data exposure)
- Full paths of source file(s) related to the vulnerability
- Location of the affected source code (tag/branch/commit or direct URL)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

### Response Timeline

- **Initial Response:** Within 48 hours
- **Status Update:** Within 7 days
- **Resolution Target:** Within 30 days (depending on complexity)

### Safe Harbor

We consider security research conducted in accordance with this policy to be:

- Authorized in accordance with the Computer Fraud and Abuse Act (CFAA)
- Exempt from DMCA restrictions
- Lawful, helpful, and performed in good faith

We will not pursue civil action or initiate a complaint to law enforcement for accidental, good faith violations of this policy.

## Security Best Practices for Users

### API Credentials

If you're using Space-Track.org credentials:

1. **Never commit credentials** to version control
2. Store credentials in environment variables
3. Use `.env.local` for local development
4. Rotate credentials if exposed

### Self-Hosting

If deploying OrbitView yourself:

1. Always use HTTPS in production
2. Keep dependencies updated
3. Configure proper CORS headers
4. Enable rate limiting for API routes

---

*This security policy was last updated on 2025-12-20.*
