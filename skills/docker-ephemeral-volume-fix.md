---
name: docker-ephemeral-volume-fix
description: Diagnose and fix the "settings randomly reset" pattern in Docker containers — when an app migration writes active config to a new path that isn't volume-mounted, dashboard/UI changes silently disappear on `docker compose down/up`. Includes diagnostic checklist and the copy-out-then-mount fix.
---

# Docker Ephemeral Directory Config Loss

**Context:** Docker containers with app migration/rebrand that writes active config to a NEW path not covered by existing volume mounts

## Problem

When a containerized app rebrands (e.g., `legacy-app` → `myapp`), the migration creates a new config directory (`.myapp/`) alongside the old one (`.legacy-app/`). If `docker-compose.yml` only mounts the OLD directory, the new one is ephemeral — any changes made via dashboard/UI/API are lost on `docker compose down && up`.

**Symptoms:**
- Config changes (made via dashboard or API) revert after container recreation
- Settings "randomly" reset (actually on every `down/up` or `recreate`)
- Migration tool logs "copying config" on every startup
- Works fine after `docker compose restart` (no recreation) but breaks after `down/up`

## Root Cause Analysis

```
docker-compose.yml:
  volumes:
    - /root/.legacy-app:/root/.legacy-app    # ← Mounted (persists)
    # /root/.myapp NOT mounted          # ← Ephemeral!

Startup flow:
1. Container created → .myapp/ is empty (ephemeral)
2. "Doctor" migration copies .legacy-app/ → .myapp/
3. App runs, dashboard writes to .myapp/ (active config)
4. docker compose down → container destroyed, .myapp/ GONE
5. docker compose up → back to step 1, dashboard changes lost
```

## Solution

1. **Copy live config from running container to host BEFORE destroying it:**
   ```bash
   mkdir -p /root/.myapp
   docker cp <container>:/root/.myapp/. /root/.myapp/
   ```

2. **Add volume mount to docker-compose.yml:**
   ```yaml
   volumes:
     - /root/.legacy-app:/root/.legacy-app
     - /root/.myapp:/root/.myapp    # NEW
   ```

3. **Also copy nested auth/credential files** that may live under subdirectories:
   ```bash
   # Check for auth files in old path that may not have been migrated
   find /root/.legacy-app -name 'auth-profiles*' -o -name '*.key' -o -name 'credentials*'
   # Copy any missing ones to the new path
   cp /root/.legacy-app/agents/main/agent/auth-profiles.json \
      /root/.myapp/agents/main/agent/auth-profiles.json
   ```

4. **Recreate container:** `docker compose down && docker compose up -d`

5. **Verify migration skips:** Look for log like "State dir migration skipped: target already exists"

## Diagnostic Checklist

```bash
# 1. Check what's mounted
docker inspect <container> --format '{{range .Mounts}}{{.Source}} -> {{.Destination}} ({{.Type}})
{{end}}'

# 2. Check if app writes to an unmounted path
docker exec <container> find /root -name '*.json' -newer /proc/1/status -type f

# 3. Compare host vs container config
diff <(cat /host/path/config.json | jq -S .) \
     <(docker exec <container> cat /container/path/config.json | jq -S .)
```

## When to Use

- Container app config keeps reverting after restarts
- Dashboard/UI changes don't persist
- App went through a rebrand/migration with new config paths
- `docker compose restart` works but `down/up` doesn't
