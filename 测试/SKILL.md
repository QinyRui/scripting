---
name: surge-http-api
description: Surge HTTP API skill for curl-based control and querying.
metadata:
  display_name: "Surge HTTP API"
  intent_patterns: "surge, surge api, proxy control, policy switch, surge requests, surge modules"
  required_tools: "run_shell_command"
---

## Safety Rules

- Read-only requests can be executed directly when the user clearly asks for query/list/status information.
- Confirm before any state-changing request unless the user has already given an explicit target and action.
- Always confirm before operations such as feature toggles, outbound mode changes, global policy changes, select-group switching, request kill, profile reload/switch/check, DNS flush, module enable/disable, script evaluate, device property changes, log level change, or engine stop.

## Instructions

1. First decide whether the request is read-only or state-changing.
2. Use `curl` to call the Surge HTTP API.
3. Put `x-key` in the request URL, using a variable placeholder such as `http://127.0.0.1:6171/v1/traffic?x-key={x-key}`. Treat `{x-key}` as a variable placeholder to be filled in by the caller.
4. Use the HTTP method required by the endpoint. For `POST` requests, send JSON when the endpoint requires a body.
5. Summarize the API result for the user. See `reference.md` for routes and payloads.
