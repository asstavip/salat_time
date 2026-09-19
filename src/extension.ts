/// <reference path="./types.d.ts" />
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';

import * as Constants from './constants.js';
import * as Config from './config.js';
import * as Api from './api.js';
import * as UI from './ui.js';

export default class SalatExtension extends Extension {
    private indicator: any = null;
    private timeoutId: number = 0;
    private httpSession: any = null;
    private config: UserConfig | null = null;
    private configMonitor: any = null;
    private prayerTimesData: PrayerTimesData | null = null;

    enable() {
        log('[SalatExtension ESM] Enabling extension...');
        try {
            this.httpSession = Api.createSession();
            this.config = Config.loadConfig();
            if (this.config) {
                log(`[SalatExtension ESM] Loaded config: City=${this.config.city.name}, Lang=${this.config.lang}`);
            }

            this.configMonitor = Config.setupConfigMonitor(() => {
                log('[SalatExtension ESM] Config monitor triggered: config changed on disk. Recreating indicator...');
                this.config = Config.loadConfig();
                this.recreatePanelIndicator();
            });

            this.recreatePanelIndicator();

            if (this.timeoutId) {
                GLib.source_remove(this.timeoutId);
            }
            this.timeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 1, () => {
                const now = new Date();
                if (!this.prayerTimesData || (now.getHours() === 0 && now.getMinutes() === 0 && now.getSeconds() === 0)) {
                    this.refreshPrayerTimes();
                } else if (this.config) {
                    UI.updatePanelText(this.indicator, this.prayerTimesData, this.config.iqamaDelays, this.config.lang);
                }
                return GLib.SOURCE_CONTINUE;
            });

            log('[SalatExtension ESM] Extension enabled successfully!');
        } catch (e: any) {
            log('[SalatExtension ESM] FATAL ERROR in enable(): ' + e.message + '\n' + e.stack);
        }
    }

    disable() {
        log('[SalatExtension ESM] Disabling extension...');
        try {
            if (this.configMonitor) {
                this.configMonitor.cancel();
                this.configMonitor = null;
            }
            if (this.timeoutId) {
                GLib.source_remove(this.timeoutId);
                this.timeoutId = 0;
            }
            if (this.indicator) {
                this.indicator.destroy();
                this.indicator = null;
            }
            this.destroyOldStatusAreaRole();
            log('[SalatExtension ESM] Extension disabled cleanly.');
        } catch (e: any) {
            log('[SalatExtension ESM] Error during disable(): ' + e.message);
        }
    }

    private destroyOldStatusAreaRole(): void {
        try {
            if (Main.panel.statusArea['salat-indicator']) {
                log('[SalatExtension ESM] Cleaning up pre-existing salat-indicator statusArea entry...');
                Main.panel.statusArea['salat-indicator'].destroy();
            }
        } catch (e: any) {
            log('[SalatExtension ESM] Note on statusArea cleanup: ' + e.message);
        }
    }

    private reloadAndSyncUI(): void {
        try {
            log('[SalatExtension ESM] Syncing UI...');
            if (!this.config) return;
            UI.updatePanelText(this.indicator, this.prayerTimesData, this.config.iqamaDelays, this.config.lang);
            UI.rebuildMenu(this.indicator, this.config, this.prayerTimesData, {
                onSelectCity: (city: City) => {
                    log('[SalatExtension ESM] City selected: ' + city.name);
                    if (this.config) {
                        this.config.city = city;
                        Config.saveConfig(this.config);
                    }
                    this.recreatePanelIndicator();
                },
                onSelectLang: (langCode: string) => {
                    log('[SalatExtension ESM] Language selected: ' + langCode);
                    if (this.config) {
                        this.config.lang = langCode;
                        Config.saveConfig(this.config);
                    }
                    this.recreatePanelIndicator();
                },
                onSetIqamaDelay: (prayerKey: string, minutes: number) => {
                    log(`[SalatExtension ESM] Delay set for ${prayerKey}: +${minutes}m`);
                    if (this.config) {
                        this.config.iqamaDelays[prayerKey] = minutes;
                        Config.saveConfig(this.config);
                    }
                    this.recreatePanelIndicator();
                },
                onResetIqamaDefaults: () => {
                    log('[SalatExtension ESM] Iqama delays reset to defaults.');
                    if (this.config) {
                        this.config.iqamaDelays = Object.assign({}, Constants.DEFAULT_IQAMA_DELAYS);
                        Config.saveConfig(this.config);
                    }
                    this.recreatePanelIndicator();
                }
            });
            log('[SalatExtension ESM] UI sync completed successfully.');
        } catch (e: any) {
            log('[SalatExtension ESM] Error in reloadAndSyncUI: ' + e.message + '\n' + e.stack);
        }
    }

    private refreshPrayerTimes(): void {
        if (!this.httpSession || !this.config) {
            log('[SalatExtension ESM] Cannot refresh prayer times: httpSession or config missing.');
            return;
        }
        log(`[SalatExtension ESM] Refreshing prayer times for city ID ${this.config.city.id} (${this.config.city.name})...`);
        Api.fetchPrayerTimes(
            this.httpSession,
            this.config.city.id,
            (data: PrayerTimesData) => {
                log('[SalatExtension ESM] Received prayer times data successfully.');
                this.prayerTimesData = data;
                this.reloadAndSyncUI();
            },
            (err: Error) => {
                log('[SalatExtension ESM] Failed to fetch prayer times: ' + err.message);
            }
        );
    }

    private recreatePanelIndicator(): void {
        log('[SalatExtension ESM] Rebuilding panel indicator from scratch...');
        try {
            if (this.indicator) {
                this.indicator.destroy();
                this.indicator = null;
            }
            this.destroyOldStatusAreaRole();

            this.indicator = new PanelMenu.Button(0.0, "Salat & Iqama Indicator", false);
            this.indicator.buttonText = new St.Label({
                text: "🕌 Loading Salat...",
                y_align: Clutter.ActorAlign.CENTER
            });
            this.indicator.add_child(this.indicator.buttonText);

            try {
                Main.panel.addToStatusArea('salat-indicator', this.indicator, 0, 'right');
                log('[SalatExtension ESM] Added indicator to statusArea with role salat-indicator.');
            } catch (e: any) {
                log('[SalatExtension ESM] addToStatusArea salat-indicator exception: ' + e.message + ', using fallback role.');
                let fallbackRole = 'salat-indicator-' + Date.now();
                Main.panel.addToStatusArea(fallbackRole, this.indicator, 0, 'right');
                log('[SalatExtension ESM] Added indicator with fallback role: ' + fallbackRole);
            }

            this.refreshPrayerTimes();
        } catch (e: any) {
            log('[SalatExtension ESM] Error recreating panel indicator: ' + e.message);
        }
    }
}
