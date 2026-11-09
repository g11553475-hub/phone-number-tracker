# LocateMe — GitHub Pages edition

A static, consent-based location snapshot sharing page. It is designed to run on GitHub Pages without a Node.js server, API keys, Vercel, or account backend.

## Open the website
After GitHub Pages finishes publishing, visit:

https://g11553475-hub.github.io/phone-number-tracker/

If the page is not live yet, open the repository's **Settings → Pages** and set the source to **Deploy from a branch**, branch **main**, folder **/(root)**, then save. Wait for GitHub Pages to publish.

## Use it
1. Open the site over HTTPS.
2. Enter your display name and age (18+).
3. Optionally enter your mobile number. The number is not used to identify or locate a device.
4. Tick the consent checkbox and save your profile.
5. Choose **Get my current GPS location** and allow the browser's location permission.
6. Choose **Create share link**, then **Copy share link** and send it only to the intended person.
7. Use **Stop / clear my saved data** to clear the profile and local page data.

## Important limitations of GitHub Pages
GitHub Pages serves static files only. This version stores the profile in the current browser and puts the GPS snapshot into a share URL only after the owner explicitly creates it. The link is a one-time snapshot; it does not update live.

It cannot search a phone number to discover a person's name, age, or location, and it cannot track another phone in the background. Cross-device phone-number lookup and live location sharing require a secure backend/database and explicit consent from the device owner.

## Technical notes
- Plain HTML, CSS and JavaScript.
- Leaflet and OpenStreetMap for map display.
- Browser Geolocation API for the owner's current position.
- GPS requires HTTPS (GitHub Pages provides HTTPS) and browser permission.
- Profile data saved by this page remains in the browser's local storage until cleared.
