# Surge HTTP API Reference

Source: https://manual.nssurge.com/others/http-api.html

---

## 1) Feature Toggles

- `GET /v1/features/mitm`
- `POST /v1/features/mitm` body: `{"enabled": true}`
- `GET /v1/features/capture`
- `POST /v1/features/capture` body: `{"enabled": true}`
- `GET /v1/features/rewrite`
- `POST /v1/features/rewrite` body: `{"enabled": true}`
- `GET /v1/features/scripting`
- `POST /v1/features/scripting` body: `{"enabled": true}`
- `GET /v1/features/system_proxy` *(Surge Mac only)*
- `POST /v1/features/system_proxy` body: `{"enabled": true}` *(Surge Mac only)*
- `GET /v1/features/enhanced_mode` *(Surge Mac only)*
- `POST /v1/features/enhanced_mode` body: `{"enabled": true}` *(Surge Mac only)*

---

## 2) Outbound Mode

- `GET /v1/outbound`
- `POST /v1/outbound` body: `{"mode": "rule"}`
- `GET /v1/outbound/global`
- `POST /v1/outbound/global` body: `{"policy": "ProxyB"}`

`mode` values: `direct`, `proxy`, `rule`

---

## 3) Proxy Policies

- `GET /v1/policies`
- `GET /v1/policies/detail?policy_name=ProxyNameHere`
- `POST /v1/policies/test` body:

```json
{
  "policy_names": ["ProxyA", "ProxyB"],
  "url": "http://bing.com"
}
```

---

## 4) Policy Groups

- `GET /v1/policy_groups`
- `GET /v1/policy_groups/test_results`
- `GET /v1/policy_groups/select?group_name=GroupNameHere`
- `POST /v1/policy_groups/select` body: `{"group_name": "GroupA", "policy": "ProxyA"}`
- `POST /v1/policy_groups/test` body: `{"group_name": "GroupA"}`

---

## 5) Requests

- `GET /v1/requests/recent`
- `GET /v1/requests/active`
- `POST /v1/requests/kill` body: `{"id": 100}`

---

## 6) Profiles

- `GET /v1/profiles/current?sensitive=0`
- `POST /v1/profiles/reload`
- `GET /v1/profiles` *(Mac only 4.0.6+)*
- `POST /v1/profiles/switch` body: `{"name": "Profile2"}` *(Surge Mac only)*
- `POST /v1/profiles/check` body: `{"name": "Profile2"}` *(Mac only 4.0.6+)*

说明：`sensitive=0` 时密码等敏感字段会被遮罩。

---

## 7) DNS

- `POST /v1/dns/flush`
- `GET /v1/dns`
- `POST /v1/test/dns_delay`

---

## 8) Modules

- `GET /v1/modules`
- `POST /v1/modules` body:

```json
{
  "router.com": false,
  "Google Home Devices": true
}
```

---

## 9) Scripting

- `GET /v1/scripting`
- `POST /v1/scripting/evaluate` body:

```json
{
  "script_text": "The content of JS script",
  "mock_type": "cron",
  "timeout": 5
}
```

- `POST /v1/scripting/cron/evaluate` body: `{"script_name": "script1"}`

---

## 10) Device Management *(Mac only 4.0.6+)*

- `GET /v1/devices`
- `GET /v1/devices/icon?id={iconID}`
- `POST /v1/devices` body:

```json
{
  "physicalAddress": "F0:9F:C2:00:00:00",
  "name": "Computer",
  "address": "192.168.1.200",
  "shouldHandledBySurge": true
}
```

说明：`physicalAddress` 必填；`iconID` 可来自 `device.dhcpDevice.icon`。

---

## 11) Misc

- `POST /v1/stop`
- `GET /v1/events`
- `GET /v1/rules`
- `GET /v1/traffic`
- `POST /v1/log/level` body: `{"level": "verbose"}`
- `GET /v1/mitm/ca`

