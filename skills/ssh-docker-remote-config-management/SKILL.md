---
name: ssh-docker-remote-config-management
description: Reliable pattern for editing JSON config files in Docker containers on a remote VPS via SSH — avoids the triple-nested-quoting nightmare (SSH → docker exec → jq) using a pipe-and-copy approach. Includes hot-reload tricks (SIGUSR1) and gotchas around `docker cp` direction and `restart` vs `down/up`.
---

# SSH + Docker Remote Config Management

**Context:** Managing Docker container configs on a remote VPS via SSH, especially when dealing with JSON config files and nested quoting

## Problem

Editing JSON config files inside Docker containers on remote VPS via SSH involves triple-nested quoting (SSH → Docker exec → jq/shell) that frequently breaks. Direct `docker exec ... jq` commands via SSH produce quoting nightmares.

## Solution: Pipe-and-Copy Pattern

Instead of fighting nested quoting, use this reliable pattern:

### Read config (safe):
```bash
ssh user@host "docker exec <container> cat /path/config.json | jq '.some.field'"
```

### Write config (safe — avoids nested quoting):
```bash
# 1. Pull config to host
ssh user@host "docker exec <container> cat /path/config.json > /tmp/config.json"

# 2. Modify on host with jq (single level of quoting)
ssh user@host "cat /tmp/config.json | jq '.field = \"value\"' > /tmp/config-new.json"

# 3. Copy back into container
ssh user@host "docker cp /tmp/config-new.json <container>:/path/config.json"

# 4. Hot reload (no restart needed)
ssh user@host "docker exec <container> kill -USR1 1"
```

### For volume-mounted configs (even simpler):
```bash
# Edit directly on host — it's the same file the container sees
ssh user@host "cat /root/.appdir/config.json | jq '.field = \"value\"' > /tmp/new.json && mv /tmp/new.json /root/.appdir/config.json"

# Hot reload
ssh user@host "docker exec <container> kill -USR1 1"
```

## Key Gotchas

1. **`docker compose restart` vs `down/up`:**
   - `restart` = same container, reloads process. Env vars already in container work.
   - `down && up` = destroys and recreates container. Needed for NEW env vars from `.env` file.

2. **SIGUSR1 hot reload:**
   - Many Node.js apps (MyApp, PM2, etc.) support `kill -USR1` for config reload
   - Avoids the 5+ minute npm install cycle on full restart
   - Send to PID 1 or the actual gateway process

3. **`docker cp` direction matters:**
   - `docker cp container:/path/. /host/path/` — note the `.` to copy CONTENTS not nested dir
   - Without the `.`: `/host/path/` gets `/host/path/path/` (nested!)

4. **Finding where config actually lives:**
   ```bash
   # Recursive search for a field name
   docker exec <container> cat /path/config.json | jq '.. | objects | select(has("fieldName"))'
   ```

## When to Use

- Managing Docker containers on remote VPS via SSH
- Editing JSON configs inside containers
- Avoiding quoting issues with SSH + Docker + jq
- Hot-reloading config without full container restart
