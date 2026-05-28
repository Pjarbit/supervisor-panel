# Supervisor Panel
A replacement for the Home Assistant Supervisor Panel that was deprecated in HA 2026.5.

![Supervisor Panel](media/screenshot.jpg)

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

> **Cloudflare users:** You may also need to purge the cache from your Cloudflare dashboard under **Caching → Configuration → Purge Everything** after updating.

### Blank screen — multiple installs conflict

You cannot have both a manual install and a HACS install active at the same time. If you do, expect blank screens and errors. Pick one install method and stick with it. If switching from manual to HACS, delete the files from `/config/www/supervisor-panel/` and update your `module_url` to the HACS path. If switching from HACS to manual, uninstall via HACS first.

### Disk Not Showing

If your disk usage still shows dashes or 0.0% after installing, your system may use different entity names for disk data. You can manually set the correct entity IDs in the JS file.

**Step 1 — Find your disk entity IDs**

1. In Home Assistant go to **Settings → Developer Tools**
2. Click the **States** tab
3. In the search box type `disk`
4. Look for entities with units of `%`, `GB`, or `GiB`
5. The entity ID is the text on the left, for example `sensor.disk_use_percent` or `sensor.system_monitor_disk_usage`
6. You need three entity IDs — one for disk percentage, one for disk free, and one for disk used.  
   Example:  
   `sensor.dans_disk_use_percent`  
   `sensor.dans_disk_free`  
   `sensor.dans_disk_used`

**Step 2 — Edit the JS file**

Using File Editor or VS Code, open:
- HACS install: `/config/www/community/supervisor-panel/supervisor-panel.js`
- Manual install: `/config/www/supervisor-panel/supervisor-panel.js`

Make these three changes using the part of your entity ID after `sensor.` — for example if your disk % entity is `sensor.disk_use_percent` you would use `disk_use_percent`.

Using the entity IDs you found in Step 1, replace the contents of the brackets with your entity names.

For example, if your entities are `sensor.dans_disk_free_percent`, `sensor.dans_disk_free`, and `sensor.dans_disk_used`:

**Change 1 — Disk percentage:**

Find:
```
['disk_usage', 'disk_use_percent']
```
Change to:
```
['disk_usage', 'dans_disk_free_percent']
```

**Change 2 — Disk free:**

Find:
```
['disk_free']
```
Change to:
```
['dans_disk_free']
```

**Change 3 — Disk used:**

Find:
```
['disk_use']
```
Change to:
```
['dans_disk_used']
```

**Step 3 — Reload**

Save the file, then unregister the service worker (F12 → Application → Service Workers → Unregister), close the browser completely and reopen.

> ⚠️ **Important:** This change is made to the downloaded file, not the source. If you update the panel via HACS, the file will be overwritten and you will need to make this change again after every update.

## A Note from the Developer
This integration is free and will always be free. If you find it useful, skip the coffee and give $5 to someone who deserves it.

## License
MIT
