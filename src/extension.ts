/// <reference path="./types.d.ts" />

const { St, Clutter, GLib } = imports.gi;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const ExtensionUtils = imports.misc.extensionUtils;

let Constants: any, Config: any, Api: any, UI: any;
let indicator: any = null;
let timeoutId: number = 0;
let httpSession: any = null;
let config: UserConfig | null = null;
let configMonitor: any = null;
let prayerTimesData: PrayerTimesData | null = null;

function _getModules(): any {
    const Me = ExtensionUtils.getCurrentExtension();
    return {
        Constants: Me.imports.constants,
        Config: Me.imports.config,
        Api: Me.imports.api,
        UI: Me.imports.ui
    };
}

function destroyOldStatusAreaRole(): void {
    try {
        if (Main.panel.statusArea['salat-indicator']) {
            log('[SalatExtension] Cleaning up pre-existing salat-indicator statusArea entry...');
            Main.panel.statusArea['salat-indicator'].destroy();
        }
    } catch (e: any) {
        log('[SalatExtension] Note on statusArea cleanup: ' + e.message);
    }
}

function reloadAndSyncUI(): void {
    try {
        log('[SalatExtension] Syncing UI...');
        if (!config) return;
        UI.updatePanelText(indicator, prayerTimesData, config.iqamaDelays, config.lang);
        UI.rebuildMenu(indicator, config, prayerTimesData, {
            onSelectCity: (city: City) => {
                log('[SalatExtension] City selected: ' + city.name);
                if (config) {
                    config.city = city;
                    Config.saveConfig(config);
                }
                recreatePanelIndicator();
            },
            onSelectLang: (langCode: string) => {
                log('[SalatExtension] Language selected: ' + langCode);
                if (config) {
                    config.lang = langCode;
                    Config.saveConfig(config);
                }
                recreatePanelIndicator();
            },
            onSetIqamaDelay: (prayerKey: string, minutes: number) => {
                log(`[SalatExtension] Delay set for ${prayerKey}: +${minutes}m`);
                if (config) {
                    config.iqamaDelays[prayerKey] = minutes;
                    Config.saveConfig(config);
                }
                recreatePanelIndicator();
            },
            onResetIqamaDefaults: () => {
                log('[SalatExtension] Iqama delays reset to defaults.');
                if (config) {
                    config.iqamaDelays = Object.assign({}, Constants.DEFAULT_IQAMA_DELAYS);
                    Config.saveConfig(config);
                }
                recreatePanelIndicator();
            }
        });
        log('[SalatExtension] UI sync completed successfully.');
    } catch (e: any) {
        log('[SalatExtension] Error in reloadAndSyncUI: ' + e.message + '\n' + e.stack);
    }
}

function refreshPrayerTimes(): void {
    if (!httpSession || !config) {
        log('[SalatExtension] Cannot refresh prayer times: httpSession or config missing.');
        return;
    }
    log(`[SalatExtension] Refreshing prayer times for city ID ${config.city.id} (${config.city.name})...`);
    Api.fetchPrayerTimes(
        httpSession,
        config.city.id,
        (data: PrayerTimesData) => {
            log('[SalatExtension] Received prayer times data successfully.');
            prayerTimesData = data;
            reloadAndSyncUI();
        },
        (err: Error) => {
            log('[SalatExtension] Failed to fetch prayer times: ' + err.message);
        }
    );
}

function recreatePanelIndicator(): void {
    log('[SalatExtension] Rebuilding panel indicator from scratch...');
    try {
        if (indicator) {
            indicator.destroy();
            indicator = null;
        }
        destroyOldStatusAreaRole();

        indicator = new PanelMenu.Button(0.0, "Salat & Iqama Indicator", false);
        indicator.buttonText = new St.Label({
            text: "🕌 Loading Salat...",
            y_align: Clutter.ActorAlign.CENTER
        });
        indicator.add_child(indicator.buttonText);

        try {
            Main.panel.addToStatusArea('salat-indicator', indicator, 0, 'right');
            log('[SalatExtension] Added indicator to statusArea with role salat-indicator.');
        } catch (e: any) {
            log('[SalatExtension] addToStatusArea salat-indicator exception: ' + e.message + ', using fallback role.');
            let fallbackRole = 'salat-indicator-' + Date.now();
            Main.panel.addToStatusArea(fallbackRole, indicator, 0, 'right');
            log('[SalatExtension] Added indicator with fallback role: ' + fallbackRole);
        }

        refreshPrayerTimes();
    } catch (e: any) {
        log('[SalatExtension] Error recreating panel indicator: ' + e.message);
    }
}

function init(): void {
    log('[SalatExtension] Initializing extension...');
    const { Api: ApiMod } = _getModules();
    httpSession = ApiMod.createSession();
}

function enable(): void {
    log('[SalatExtension] Enabling extension...');
    try {
        const { Constants: ConstMod, Config: ConfigMod, Api: ApiMod, UI: UIMod } = _getModules();
        Constants = ConstMod;
        Config = ConfigMod;
        Api = ApiMod;
        UI = UIMod;

        config = Config.loadConfig();
        if (config) {
            log(`[SalatExtension] Loaded config: City=${config.city.name}, Lang=${config.lang}`);
        }

        configMonitor = Config.setupConfigMonitor(() => {
            log('[SalatExtension] Config monitor triggered: config changed on disk. Recreating indicator...');
            config = Config.loadConfig();
            recreatePanelIndicator();
        });

        recreatePanelIndicator();

        if (timeoutId) {
            GLib.source_remove(timeoutId);
        }
        timeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 1, () => {
            const now = new Date();
            if (!prayerTimesData || (now.getHours() === 0 && now.getMinutes() === 0 && now.getSeconds() === 0)) {
                refreshPrayerTimes();
            } else if (config) {
                UI.updatePanelText(indicator, prayerTimesData, config.iqamaDelays, config.lang);
            }
            return GLib.SOURCE_CONTINUE;
        });

        log('[SalatExtension] Extension enabled successfully!');
    } catch (e: any) {
        log('[SalatExtension] FATAL ERROR in enable(): ' + e.message + '\n' + e.stack);
    }
}

function disable(): void {
    log('[SalatExtension] Disabling extension...');
    try {
        if (configMonitor) {
            configMonitor.cancel();
            configMonitor = null;
        }
        if (timeoutId) {
            GLib.source_remove(timeoutId);
            timeoutId = 0;
        }
        if (indicator) {
            indicator.destroy();
            indicator = null;
        }
        destroyOldStatusAreaRole();
        log('[SalatExtension] Extension disabled cleanly.');
    } catch (e: any) {
        log('[SalatExtension] Error during disable(): ' + e.message);
    }
}

export {};
