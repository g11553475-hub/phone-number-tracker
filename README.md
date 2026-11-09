# LocateMe — Frontend + Backend Location Sharing

A consent-based location sharing website built with plain HTML/CSS/JavaScript and a dependency-free Node.js backend. Users create an account, log in, grant browser GPS permission, and generate a 24-hour share link for an authorized viewer.

## Requirements
- Node.js 18 or newer
- Internet connection for OpenStreetMap map tiles and Leaflet CDN
- GPS permission; browsers require `localhost` or HTTPS

## Run locally
1. Extract this ZIP.
2. Open a terminal in the extracted `phone-location-sharing-website` folder.
3. Run `npm start` (or `node server.js`).
4. Open **http://localhost:3000**.
5. Register with a display name, phone number, and password (8+ characters).
6. Click **Enable location sharing** and allow GPS.
7. Click **Create 24-hour sharing link** and share that URL with the intended viewer.

## Backend endpoints
- `GET /api/health` — health check
- `POST /api/register` — create account
- `POST /api/login` — login
- `GET /api/me` — current account
- `POST /api/logout` — revoke current session
- `POST /api/sharing` — enable/disable sharing
- `POST /api/location` — update authenticated user's GPS position
- `POST /api/invite` — create 24-hour viewer link
- `GET /api/share/:code` — read location only while owner is sharing and link is valid

## Notes / deployment
- This version uses a local JSON store at `data/store.json`, created automatically. Back up that file to retain local accounts. For production, use a managed database, HTTPS, rate limiting, OTP provider, secure secrets, and a privacy policy.
- Passwords are salted and hashed with Node's scrypt; session tokens are stored as HMAC hashes.
- The default secret is generated at startup. Set `LOCATEME_SECRET` to a long random secret for stable sessions and before deployment.
- This is not phone-number lookup. The phone field is an account identifier; no OTP SMS verification is included. Use a real SMS provider to verify ownership before public deployment.
- A share link is a bearer link: anyone possessing it can view the currently shared GPS location until it expires or sharing is stopped. Share it carefully.
- GPS updates are sent to the backend only after login and explicit sharing. Stopping sharing removes the stored current location.
- For deployment, use a Node hosting provider. GitHub Pages cannot run `server.js`. Configure HTTPS, persistent storage, environment secret, and restrict access to the data file.
