# FAQ

**Why is the next pass listed as "radio only"?**
The satellite is above your horizon but either in Earth's shadow or passing
in daylight, so you won't see it with your eyes. You can still hear it if it
transmits. Visible passes are green.

**The pass time is a few seconds off from another site.**
Small differences come from different element sets (they're updated several
times a day), a different elevation mask, or refraction, which OrbitView
doesn't model. Check that both use the same TLE epoch — it's in the Orbit card.

**Why does the lifetime estimate say 8 years for the ISS?**
Because the estimate assumes no reboosts. The ISS and Starlink satellites
manoeuvre, so their real lifetime has nothing to do with drag alone. The
number is meaningful for passive objects: debris, rocket bodies, dead
satellites.

**Is the close-approach list a collision warning?**
No. It's a screen using TLEs, which are uncertain by a kilometre or more and
come without covariance. Treat a small miss distance as "interesting", not
"dangerous".

**Where does my location go?**
Nowhere. It is stored in your browser and used for calculations in your
browser. The server only ever sees requests for TLE data.

**Does it work offline?**
Partly. If you've opened it before, the service worker serves the cached
pages and scripts, and the last catalog is in IndexedDB, so it usually opens
and propagates without a connection. Map tiles you haven't seen before won't load,
and the catalog gets older until you're back online — the age is always shown.

**Why do my numbers use commas?**
In Turkish, numbers are written with a decimal comma (7,66 km/s). Switch the
language in Settings if you prefer the other style.

**Can I use the data in my own project?**
The code is MIT-licensed. The orbital data comes from CelesTrak and
Space-Track; check their terms if you redistribute it.
