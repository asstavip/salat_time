/// <reference path="./types.d.ts" />

var { GLib, Gio } = imports.gi;
var ExtensionUtils = imports.misc.extensionUtils;

function _getConfigConstantsModule(): any {
    const Me = ExtensionUtils.getCurrentExtension();
    return Me.imports.constants;
}

function loadConfig(): UserConfig {
    const Constants = _getConfigConstantsModule();
    let config: UserConfig = {
        city: Constants.CITIES[0],
        lang: 'auto',
        iqamaDelays: Object.assign({}, Constants.DEFAULT_IQAMA_DELAYS)
    };
    try {
        if (!GLib.file_test(Constants.CONFIG_FILE, GLib.FileTest.EXISTS)) return config;
        let [ok, contents] = GLib.file_get_contents(Constants.CONFIG_FILE);
        if (!ok) return config;

        let parsed = JSON.parse(new TextDecoder('utf-8').decode(contents));
        if (!parsed) return config;

        if (parsed.cityId) {
            let found = Constants.CITIES.find((c: City) => c.id === parsed.cityId);
            config.city = found || { id: parsed.cityId, name: parsed.cityName || 'Unknown' };
        }
        if (parsed.lang) config.lang = parsed.lang;
        if (parsed.iqamaDelays && typeof parsed.iqamaDelays === 'object') {
            for (let k in Constants.DEFAULT_IQAMA_DELAYS) {
                let val = Number(parsed.iqamaDelays[k]);
                config.iqamaDelays[k] = (!isNaN(val) && val > 0) ? val : Constants.DEFAULT_IQAMA_DELAYS[k];
            }
        }
    } catch (e: any) {
        log('[SalatExtension Config] Load error: ' + e.message);
    }
    return config;
}

function saveConfig(config: UserConfig): void {
    const Constants = _getConfigConstantsModule();
    try {
        if (!GLib.file_test(Constants.CONFIG_DIR, GLib.FileTest.EXISTS)) {
            GLib.mkdir_with_parents(Constants.CONFIG_DIR, 0o755);
        }
        let data = JSON.stringify({
            cityId: config.city.id,
            cityName: config.city.name,
            lang: config.lang,
            iqamaDelays: config.iqamaDelays
        }, null, 2);
        GLib.file_set_contents(Constants.CONFIG_FILE, new TextEncoder().encode(data));
        log('[SalatExtension Config] Saved config successfully to ' + Constants.CONFIG_FILE);
    } catch (e: any) {
        log('[SalatExtension Config] Save error: ' + e.message);
    }
}

function setupConfigMonitor(onConfigChanged: () => void): any {
    const Constants = _getConfigConstantsModule();
    try {
        if (!GLib.file_test(Constants.CONFIG_DIR, GLib.FileTest.EXISTS)) {
            GLib.mkdir_with_parents(Constants.CONFIG_DIR, 0o755);
        }
        let dir = Gio.File.new_for_path(Constants.CONFIG_DIR);
        let monitor = dir.monitor_directory(Gio.FileMonitorFlags.NONE, null);
        monitor.connect('changed', (_mon: any, file: any, otherFile: any, eventType: any) => {
            let fName = file ? file.get_basename() : '';
            let oName = otherFile ? otherFile.get_basename() : '';
            log(`[SalatExtension Config] Directory monitor event: file=${fName}, otherFile=${oName}, event=${eventType}`);
            if (fName.includes('config') || oName.includes('config') || eventType === Gio.FileMonitorEvent.CHANGES_DONE_HINT || eventType === Gio.FileMonitorEvent.CREATED) {
                onConfigChanged();
            }
        });
        return monitor;
    } catch (e: any) {
        log('[SalatExtension Config] Monitor error: ' + e.message);
        return null;
    }
}
