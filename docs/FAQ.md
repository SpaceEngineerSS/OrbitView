# OrbitView FAQ (Frequently Asked Questions)

## 📡 General Questions

### What is OrbitView?
OrbitView is a professional-grade satellite tracking and orbital analysis platform designed for space enthusiasts, researchers, and satellite operators.

### Where does the data come from?
Data is primary sourced from **Space-Track.org** (via Joint Space Operations Center), **CelesTrak**, and **NASA Horizons**.

### How accurate are the satellite positions?
Satellite positions are calculated using the SGP4/SDP4 propagation model based on current TLE data. Accuracy is typically within 1-5 km. For more details, see [THEORY.md](../THEORY.md).

## 🛰️ Using OrbitView

### How do I track a specific satellite?
Use the search bar in the sidebar or append `?sat=NORAD_ID` to the URL.

### What is "Analyst Mode"?
Analyst Mode unlocks advanced scientific dashboards, including Doppler shift analysis, orbital decay prediction, and conjunction analysis.

### Can I use OrbitView on my phone?
Yes! OrbitView is a Progressive Web App (PWA) and is fully responsive. You can even use the **AR Compass Mode** on mobile devices to point your phone at the sky and see satellite positions.

## 🛠️ Technical Troubleshooting

### The satellites are not loading.
Ensure you have a stable internet connection. If the official Space-Track API is down, OrbitView automatically falls back to CelesTrak and AMSAT mirrors.

### AR Compass mode is not working.
Ensure your device has a magnetometer and gyroscope, and that you have granted permission for "Motion & Orientation" access in your browser.

### How can I contribute?
Check our [Contributing Guide](../CONTRIBUTING.md) on GitHub.

---

## 👨‍💻 Developer

**Mehmet Gümüş**  
🌐 [spacegumus.com.tr](https://spacegumus.com.tr)  
🐙 [@SpaceEngineerSS](https://github.com/SpaceEngineerSS)

*Last Updated: 2025-12-20*
