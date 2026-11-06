# Hosting Level on Railway

Two Railway services from this one repo: `api` (the server, with a volume for everyone's data) and
`web` (the app, with the public address). The web service passes `/api` to the api over Railway's
private network, so the api never gets a public address of its own.

## 1. The api service

1. railway.com → **New Project** → **Deploy from GitHub repo** → pick this repo.
2. Open the service it made → **Settings**:
   - **Service name**: `api` (the web service finds it by this name).
   - **Source → Root Directory**: `/api`.
3. **Variables** (Raw editor):

   ```
   PORT=3000
   RP_NAME=Level
   FIRST_USER_ADMIN=1
   ```

4. Right-click the service on the canvas → **Attach volume** → mount path `/data`. Every profile,
   workout and the server's secret live there.
5. Do not generate a domain for it.

## 2. The web service

1. On the project canvas: **Create** → **GitHub Repo** → the same repo.
2. **Settings → Service name**: `web`. Leave Root Directory empty.
3. **Variables**:

   ```
   RAILWAY_DOCKERFILE_PATH=web/Dockerfile
   NGINX_PORT=8080
   BACKEND=api.railway.internal
   PORT=3000
   RESOLVER=[fd12::10]
   RESOLVER_IPV6=on
   ```

4. **Settings → Networking → Generate Domain**, port `8080`. Note the address, for example
   `level-production.up.railway.app`.

## 3. Tie them together

Back on **api → Variables**, add the web address (no trailing slash):

```
RP_ID=level-production.up.railway.app
ORIGIN=https://level-production.up.railway.app
```

Deploy. Passkeys are bound to that exact address: pick the final one (or a custom domain) before
anyone signs up, because moving later means everyone adds a new passkey.

## 4. First account, then lock the door

1. Open the address and create your own profile. With `FIRST_USER_ADMIN=1` it becomes the admin.
2. On **api → Variables** add, then deploy:

   ```
   INVITE_ONLY=1
   ALLOW_GUEST=0
   ```

3. Invite friends: **Settings → Account → Admin dashboard → Invites**. Each friend gets the app's
   address and their invite code.

## Backups

Everything is in the api volume. Turn on Railway's volume backups (**api → volume → Backups**), and
now and then export a backup from the app (**Settings → Data & backup**).
