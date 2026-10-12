# FAQ

**Why is the next pass listed as "not visible"?**
The satellite is above your horizon but either in Earth's shadow for the whole
pass or passing in daylight, so you won't see it with your eyes. Passes marked
"sunlit" are green: the satellite is in sunlight while your sky is dark for at
least part of the pass. Whether you can actually see it depends on how big
and bright it is.

**Why does "Space stations" show only two objects?**
There are two crewed stations in orbit: the ISS and China's Tiangong.
CelesTrak's "stations" list also has the ISS modules catalogued separately,
cargo and crew vehicles, and small satellites released from the ISS. Those are
still in the catalog and in search, under their orbit (LEO).

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

**Why didn't I get a pass alert?**
Alerts come from the open app: there is no server that could push them. Keep
the tab (or the installed app) open, allow notifications, and star the
satellite. For something that works with the app closed, use "Add to
calendar" instead.

**Why does only the ISS have a 3D model?**
It's the one with an official, freely available NASA model of a usable size.
Other objects are drawn as points.

**The globe looks simpler on my phone.**
On slower devices OrbitView switches to a lighter profile to stay smooth.
Settings → Battery saver → Off brings the full look back.
