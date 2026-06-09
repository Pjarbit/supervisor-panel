# Supervisor Panel

A replacement for the Home Assistant Supervisor Panel that was deprecated in HA 2026.5.

[![Supervisor Panel](https://github.com/Pjarbit/supervisor-panel/raw/main/media/screenshot.jpg)](https://github.com/Pjarbit/supervisor-panel/blob/main/media/screenshot.jpg)

## About

HA 2026.5 removed the `hassio-main` panel registration. The Supervisor Panel sidebar entry stopped working and the restart buttons (Restart Core, Restart Supervisor, Reboot Host, Shutdown Host) were removed from the UI. This custom panel brings that functionality back using the HA WebSocket API and native System Monitor entities.

## Features

- Core and Supervisor version with update badge when available
- CPU load and RAM usage with color-coded progress bars
- Host last boot, disk usage and free space
- Live logs (Supervisor / Core / Host) with filter, pause/resume, and auto-scroll
- Restart Core, Restart Supervisor, Reboot Host, Shutdown Host buttons

## Requirements

- Home Assistant with Supervisor (HAOS or supervised install only)
- [System Monitor Integration](https://www.home-assistant.io/integrations/systemmonitor/) must be installed and enabled

> **Note:** The System Monitor integration provides the CPU, RAM, and disk statistics. Without it the stats will show dashes but the panel will still function.

## Installation

> ⚠️ **Important:** The `module_url` in `configuration.yaml` is different depending on whether you install via HACS or manually. Use the correct block for your install method or the panel will not load.

### HACS

1. In HACS go to **Frontend** → **Custom Repositories**
2. Add `https://github.com/Pjarbit/supervisor-panel` as category **Frontend**
3. Install **Supervisor Panel**
4. Add the following to your `configuration.yaml`:

```yaml
panel_custom:
  - name: supervisor-panel
    sidebar_title: Supervisor Panel
    sidebar_icon: mdi:home-assistant
    url_path: supervisor-panel
    module_url: /local/community/supervisor-panel/supervisor-panel.js
    require_admin: true
```

5. Full HA restart required

### Manual Install

1. Download `supervisor-panel.js` from this repo
2. Place it in your `/config/www/` folder
3. Add the following to your `configuration.yaml`:

```yaml
panel_custom:
  - name: supervisor-panel
    sidebar_title: Supervisor Panel
    sidebar_icon: mdi:home-assistant
    url_path: supervisor-panel
    module_url: /local/supervisor-panel.js
    require_admin: true
```

4. Full HA restart required

## After Updating

After installing or updating via HACS, do a full HA restart then open your browser.

## Removal

1. Delete `supervisor-panel.js` from `/config/www/` (manual) or uninstall via HACS
2. Remove the `panel_custom` entry from `configuration.yaml`
3. Full HA restart required

## Support

If the stats cards show dashes, make sure the System Monitor integration is installed:  
**Settings → Devices & Services → Add Integration → System Monitor**

## Troubleshooting

### Panel not loading or showing blank screen after update

1. Press **F12** to open DevTools
2. Go to **Application → Service Workers**
3. Click **Unregister** next to your Home Assistant URL
4. **Close the browser completely**
5. Reopen the browser and navigate to Home Assistant

> **Note:** Unregistering the service worker and closing the browser completely is the only method confirmed to work consistently. Simply hitting refresh or Shift+Ctrl+R will not work.
>
> **Cloudflare users:** You may also need to purge the cache from your Cloudflare dashboard under **Caching → Configuration → Purge Everything** after updating.

### Blank screen — multiple installs conflict

You cannot have both a manual install and a HACS install active at the same time. If you do, expect blank screens and errors. Pick one install method and stick with it. If switching from manual to HACS, delete the files from `/config/www/supervisor-panel/` and update your `module_url` to the HACS path. If switching from HACS to manual, uninstall via HACS first.

### Entities Not Populating

For the vast majority of installs the panel will find your System Monitor sensors automatically. For those where values show as dashes, the fix is simple. We match on roughly 90% of installs but can't account for every entity name HA may use now or in the future. If yours isn't populating, if you move to a new server, or if HA makes a breaking change — map your sensor names to ours with a template (below), restart HA and it's working. Finding the right sensor entities can be done by searching in System / Developer tools / States / Search

**Keywords the panel searches for:**

| Sensor | Keywords | Units |
|--------|----------|-------|
| CPU Load | `load_1_min`, `load_1m`, `processor_load`, `load1` | any |
| RAM Usage % | `memory_usage`, `memory_use_percent`, `virtual_memory` | `%` |
| RAM Used | `memory_use` | `MiB`, `MB`, `GB`, `GiB` |
| RAM Free | `memory_free` | `MiB`, `MB`, `GB`, `GiB` |
| Disk Usage % | `disk_usage`, `disk_use_percent` | `%` |
| Disk Used | `disk_use` | `GiB`, `GB` |
| Disk Free | `disk_free` | `GiB`, `GB` |

Only add the sensors that are not populating. Combine them under a single `template:` block in `configuration.yaml`:

```yaml
template:
  - sensor:
      - name: "Processor Load"          # CPU — remove if not needed
        unit_of_measurement: "%"
        state: "{{ states('sensor.your_cpu_entity') }}"
      - name: "Memory Use Percent"      # RAM % — remove if not needed
        unit_of_measurement: "%"
        state: "{{ states('sensor.your_ram_pct_entity') }}"
      - name: "Memory Use"              # RAM Used — remove if not needed
        unit_of_measurement: "MiB"
        state: "{{ states('sensor.your_ram_used_entity') }}"
      - name: "Memory Free"             # RAM Free — remove if not needed
        unit_of_measurement: "MiB"
        state: "{{ states('sensor.your_ram_free_entity') }}"
      - name: "disk_usage"              # Disk % — remove if not needed
        unit_of_measurement: "%"
        state: "{{ states('sensor.your_disk_pct_entity') }}"
      - name: "disk_use"                # Disk Used — remove if not needed
        unit_of_measurement: "GB"
        state: "{{ states('sensor.your_disk_used_entity') }}"
      - name: "disk_free"               # Disk Free — remove if not needed
        unit_of_measurement: "GB"
        state: "{{ states('sensor.your_disk_free_entity') }}"
```

Restart HA after saving. No JS editing required and this survives future HACS updates.

## A Note from the Developer

This integration is free and will always be free. If you find it useful, skip the coffee and give $5 to someone who deserves it.

## License

MIT
