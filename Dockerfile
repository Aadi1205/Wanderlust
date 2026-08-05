# syntax=docker/dockerfile:1

# ---------- Stage 1: install dependencies ----------
# Isolated in its own stage so the (usually slowest) npm install layer is
# cached independently of app source changes, and so npm's install-time
# cache/metadata never ends up in the final runtime image.
FROM node:22-alpine AS deps

WORKDIR /app

# Copy only the manifest + lockfile first. As long as these two files don't
# change, Docker reuses this layer on every rebuild instead of re-running npm.
COPY package.json package-lock.json ./

# npm ci installs exactly what package-lock.json specifies (unlike
# `npm install`, it never re-resolves versions), and --omit=dev skips
# devDependencies - this app has none, but it's the correct default for a
# production image regardless.
RUN npm ci --omit=dev

# ---------- Stage 2: runtime image ----------
FROM node:22-alpine

WORKDIR /app

# Bring in the already-resolved node_modules from the deps stage instead of
# reinstalling. --chown matches the non-root user below so it can read them.
COPY --from=deps --chown=node:node /app/node_modules ./node_modules

# Copy the application source. .dockerignore keeps node_modules, .git, .env,
# and other local-only files out of this layer.
COPY --chown=node:node . .

# The app's listen port (app.js: app.listen(8080)) - left as-is since we're
# not changing application logic. docker-compose maps host 3000 -> this.
EXPOSE 8080

# Official node images ship a non-root "node" user (uid 1000) - run as that
# instead of root. Safe here since all uploads go straight to Cloudinary;
# nothing in this app writes to the local filesystem at runtime.
USER node

# No env vars are set or baked in here (see .env / docker-compose.yml) -
# the container expects its full configuration (ATLAS_DB_URL, SESSION_SECRET,
# Cloudinary/Razorpay keys, NODE_ENV, etc.) to be supplied externally.
CMD ["npm", "start"]
