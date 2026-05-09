---
name: docker-config-qa-regression
description: Systematic verification checklist after modifying Docker container config (volumes, env vars, compose edits). Use after any docker-compose change to catch cascading failures (auth loss, ephemeral volumes, missing credentials) before they reach production. Originally derived from a real session debugging post-config-change auth failures.
---

# Docker Config Change QA & Regression Pattern

**Context:** After modifying Docker container config, volume mounts, or environment variables — systematic verification to catch cascading failures

## Problem

Docker config changes (volume mounts, env vars, compose edits) can cause cascading failures that aren't immediately obvious. A config fix can break auth, lose credentials, or disconnect services. Without systematic QA, you discover these in production.

## Solution — QA Regression Checklist

Run this systematic check after ANY docker-compose.yml or config change:

### Phase 1: Container Health
```bash
# Container running?
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | grep <name>

# Clean startup? (no errors)
docker logs --tail 30 <container> 2>&1

# Errors since latest start only (filter by timestamp)
START_TIME=$(docker inspect <container> --format '{{.State.StartedAt}}' | cut -c1-19)
docker logs <container> 2>&1 | awk -v ts="$START_TIME" '$0 >= ts' | grep -iE 'error|fail|crash' || echo 'CLEAN'
```

### Phase 2: Volume Mounts
```bash
# All mounts present?
docker inspect <container> --format '{{range .Mounts}}{{.Source}} -> {{.Destination}} ({{.Type}})
{{end}}'

# Host and container in sync?
diff <(md5sum /host/path/config.json) <(docker exec <container> md5sum /container/path/config.json)
```

### Phase 3: Credentials & Auth
```bash
# Auth profiles exist?
docker exec <container> find / -name 'auth-profiles*' -o -name 'credentials*' 2>/dev/null

# API keys loaded?
docker exec <container> env | grep -E 'API|KEY|TOKEN|SECRET' | sort
```

### Phase 4: Config Integrity
```bash
# Critical config values unchanged?
docker exec <container> cat /path/config.json | jq '{
  key_setting_1: .path.to.setting1,
  key_setting_2: .path.to.setting2
}'
```

### Phase 5: Service Connectivity
```bash
# Dashboard/web UI accessible?
curl -s -o /dev/null -w 'HTTP %{http_code}' http://localhost:<port>/

# External services connected? (check logs for provider startup)
docker logs <container> 2>&1 | grep -i 'starting provider\|connected\|ready'
```

### Phase 6: Persistence Test
```bash
# Save current state
docker exec <container> cat /path/config.json | jq '.critical.field' > /tmp/before.txt

# Full destroy/recreate cycle
docker compose down && docker compose up -d
# Wait for startup...

# Compare
docker exec <container> cat /path/config.json | jq '.critical.field' > /tmp/after.txt
diff /tmp/before.txt /tmp/after.txt && echo "PERSISTED" || echo "REGRESSION!"
```

## Key Lesson: Auth Files Are Often Missed

When adding new volume mounts, the most commonly missed files are:
- **Auth profiles / API key stores** (nested in agent/service subdirectories)
- **Session tokens / offset files** (e.g., Telegram update offsets)
- **Cron job state** (scheduled task tracking)

Always run `find` on the old config path and compare with the new one.

## When to Use

- After modifying `docker-compose.yml` (volumes, ports, env)
- After editing config files that affect container behavior
- After any `docker compose down && up` cycle
- Before declaring a Docker infrastructure change "done"
