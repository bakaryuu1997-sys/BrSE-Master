FROM node:22-alpine

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ARG INTERNAL_API_BASE_URL=http://backend:8000
ARG TEST_GATE_PASSWORD=
ARG TEST_GATE_ENABLED=false
ENV INTERNAL_API_BASE_URL=$INTERNAL_API_BASE_URL
ENV TEST_GATE_PASSWORD=$TEST_GATE_PASSWORD
ENV TEST_GATE_ENABLED=$TEST_GATE_ENABLED

COPY package.json package-lock.json* ./
# npm ci requires a lockfile and exact network access; npm install is more resilient
# when transferring to a new machine where registry caches may differ.
RUN npm install --legacy-peer-deps --prefer-offline || npm install --legacy-peer-deps

COPY . .

RUN npm run build && npm prune --omit=dev

EXPOSE 3000

ENV NODE_ENV=production

CMD ["npm", "run", "start", "--", "--hostname", "0.0.0.0", "--port", "3000"]
