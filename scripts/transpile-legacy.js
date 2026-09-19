const fs = require('fs');
const path = require('path');

const esmDir = path.join(__dirname, '..', 'dist', 'esm');
const legacyDir = path.join(__dirname, '..', 'dist', 'legacy');

if (!fs.existsSync(legacyDir)) {
    fs.mkdirSync(legacyDir, { recursive: true });
}

console.log(' 🔄 Transpiling ESM build to Legacy GJS format (GNOME 42-44)...');

// Helper to convert ESM code to Legacy GJS format
function transpileModule(filename, code) {
    let output = code;

    // 1. Remove reference comments if any
    output = output.replace(/\/\/\/ <reference path=.*\/>/g, '');

    // 2. Transpile imports
    output = output.replace(/import\s+(\w+)\s+from\s+['"]gi:\/\/(\w+)(?:\?version=.*)?['"];?/g, 'var $1 = imports.gi.$2;');
    output = output.replace(/import\s+\*\s+as\s+(\w+)\s+from\s+['"]resource:\/\/\/org\/gnome\/shell\/ui\/(\w+)\.js['"];?/g, 'var $1 = imports.ui.$2;');
    output = output.replace(/import\s+\*\s+as\s+(\w+)\s+from\s+['"]resource:\/\/\/org\/gnome\/Shell\/Extensions\/js\/(\w+)\.js['"];?/g, 'var $1 = imports.misc.$2;');

    // Local module imports: import * as Foo from './foo.js';
    output = output.replace(/import\s+\*\s+as\s+(\w+)\s+from\s+['"]\.\/(\w+)\.js['"];?/g, (match, varName, modName) => {
        return `var ${varName} = imports.misc.extensionUtils.getCurrentExtension().imports.${modName};`;
    });

    // 3. Remove standard import of Extension / ExtensionPreferences base classes
    output = output.replace(/import\s+\{\s*(?:Extension|ExtensionPreferences)\s*\}\s+from\s+['"].*['"];?/g, '');

    // 4. Convert exports to top-level declarations
    output = output.replace(/export\s+const\s+/g, 'var ');
    output = output.replace(/export\s+let\s+/g, 'var ');
    output = output.replace(/export\s+function\s+/g, 'function ');
    output = output.replace(/export\s+class\s+/g, 'var ');

    // 5. Special handling for extension.js
    if (filename === 'extension.js') {
        output = transpileExtensionFile(output);
    }

    // 6. Special handling for prefs.js
    if (filename === 'prefs.js') {
        output = transpilePrefsFile(output);
    }

    return output;
}

function transpileExtensionFile(code) {
    // Check if code contains class SalatExtension
    if (code.includes('class SalatExtension')) {
        let legacyCode = `var { St, Clutter, GLib } = imports.gi;
var Main = imports.ui.main;
var PanelMenu = imports.ui.panelMenu;
var ExtensionUtils = imports.misc.extensionUtils;

let indicator = null;
let timeoutId = 0;
let httpSession = null;
let config = null;
let configMonitor = null;
let prayerTimesData = null;

function _getModules() {
    const Me = ExtensionUtils.getCurrentExtension();
    return {
        Constants: Me.imports.constants,
        Config: Me.imports.config,
        Api: Me.imports.api,
        UI: Me.imports.ui
    };
}

function destroyOldStatusAreaRole() {
    try {
        if (Main.panel.statusArea['salat-indicator']) {
            log('[SalatExtension Legacy] Cleaning up pre-existing salat-indicator statusArea entry...');
            Main.panel.statusArea['salat-indicator'].destroy();
        }
    } catch (e) {
        log('[SalatExtension Legacy] Note on statusArea cleanup: ' + e.message);
    }
}

function reloadAndSyncUI() {
    try {
        log('[SalatExtension Legacy] Syncing UI...');
        const { Constants, Config, UI } = _getModules();
        if (!config) return;
        UI.updatePanelText(indicator, prayerTimesData, config.iqamaDelays, config.lang);
        UI.rebuildMenu(indicator, config, prayerTimesData, {
            onSelectCity: (city) => {
                log('[SalatExtension Legacy] City selected: ' + city.name);
                if (config) {
                    config.city = city;
                    Config.saveConfig(config);
                }
                recreatePanelIndicator();
            },
            onSelectLang: (langCode) => {
                log('[SalatExtension Legacy] Language selected: ' + langCode);
                if (config) {
                    config.lang = langCode;
                    Config.saveConfig(config);
                }
                recreatePanelIndicator();
            },
            onSetIqamaDelay: (prayerKey, minutes) => {
                log('[SalatExtension Legacy] Delay set for ' + prayerKey + ': +' + minutes + 'm');
                if (config) {
                    config.iqamaDelays[prayerKey] = minutes;
                    Config.saveConfig(config);
                }
                recreatePanelIndicator();
            },
            onResetIqamaDefaults: () => {
                log('[SalatExtension Legacy] Iqama delays reset to defaults.');
                if (config) {
                    config.iqamaDelays = Object.assign({}, Constants.DEFAULT_IQAMA_DELAYS);
                    Config.saveConfig(config);
                }
                recreatePanelIndicator();
            }
        });
        log('[SalatExtension Legacy] UI sync completed successfully.');
    } catch (e) {
        log('[SalatExtension Legacy] Error in reloadAndSyncUI: ' + e.message + '\\n' + e.stack);
    }
}

function refreshPrayerTimes() {
    const { Api } = _getModules();
    if (!httpSession || !config) {
        log('[SalatExtension Legacy] Cannot refresh prayer times: httpSession or config missing.');
        return;
    }
    log('[SalatExtension Legacy] Refreshing prayer times for city ID ' + config.city.id + ' (' + config.city.name + ')...');
    Api.fetchPrayerTimes(
        httpSession,
        config.city.id,
        (data) => {
            log('[SalatExtension Legacy] Received prayer times data successfully.');
            prayerTimesData = data;
            reloadAndSyncUI();
        },
        (err) => {
            log('[SalatExtension Legacy] Failed to fetch prayer times: ' + err.message);
        }
    );
}

function recreatePanelIndicator() {
    log('[SalatExtension Legacy] Rebuilding panel indicator from scratch...');
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
            log('[SalatExtension Legacy] Added indicator to statusArea with role salat-indicator.');
        } catch (e) {
            log('[SalatExtension Legacy] addToStatusArea salat-indicator exception: ' + e.message + ', using fallback role.');
            let fallbackRole = 'salat-indicator-' + Date.now();
            Main.panel.addToStatusArea(fallbackRole, indicator, 0, 'right');
            log('[SalatExtension Legacy] Added indicator with fallback role: ' + fallbackRole);
        }

        refreshPrayerTimes();
    } catch (e) {
        log('[SalatExtension Legacy] Error recreating panel indicator: ' + e.message);
    }
}

function init(metadata) {
    log('[SalatExtension Legacy] Initializing extension...');
    const { Api } = _getModules();
    httpSession = Api.createSession();
}

function enable() {
    log('[SalatExtension Legacy] Enabling extension...');
    try {
        const { Constants, Config, Api, UI } = _getModules();
        config = Config.loadConfig();
        if (config) {
            log('[SalatExtension Legacy] Loaded config: City=' + config.city.name + ', Lang=' + config.lang);
        }

        configMonitor = Config.setupConfigMonitor(() => {
            log('[SalatExtension Legacy] Config monitor triggered: config changed on disk. Recreating indicator...');
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

        log('[SalatExtension Legacy] Extension enabled successfully!');
    } catch (e) {
        log('[SalatExtension Legacy] FATAL ERROR in enable(): ' + e.message + '\\n' + e.stack);
    }
}

function disable() {
    log('[SalatExtension Legacy] Disabling extension...');
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
        log('[SalatExtension Legacy] Extension disabled cleanly.');
    } catch (e) {
        log('[SalatExtension Legacy] Error during disable(): ' + e.message);
    }
}
`;
        return legacyCode;
    }
    return code;
}

function transpilePrefsFile(code) {
    let legacyCode = `var { Adw, Gtk } = imports.gi;
var ExtensionUtils = imports.misc.extensionUtils;

function _getPrefsModules() {
    const Me = ExtensionUtils.getCurrentExtension();
    return {
        Constants: Me.imports.constants,
        Config: Me.imports.config,
        I18n: Me.imports.i18n
    };
}

function init(metadata) {}

function buildPrefsWidget() {
    const { Constants, Config, I18n } = _getPrefsModules();

    let config = Config.loadConfig();
    let prefsPage = new Adw.PreferencesPage();

    // 1. General Settings Group (City & Language)
    let generalGroup = new Adw.PreferencesGroup();

    let cityRow = new Adw.ComboRow({
        model: Gtk.StringList.new(Constants.CITIES.map((c) => c.name)),
        selected: Math.max(0, Constants.CITIES.findIndex((c) => c.id === config.city.id))
    });
    cityRow.connect('notify::selected', (widget) => {
        let idx = widget.get_selected();
        if (idx >= 0 && idx < Constants.CITIES.length) {
            config.city = Constants.CITIES[idx];
            Config.saveConfig(config);
        }
    });
    generalGroup.add(cityRow);

    let langRow = new Adw.ComboRow({
        model: Gtk.StringList.new(I18n.LANGUAGES.map((l) => l.name)),
        selected: Math.max(0, I18n.LANGUAGES.findIndex((l) => l.code === config.lang))
    });
    generalGroup.add(langRow);

    prefsPage.add(generalGroup);

    // 2. Iqama Delays Group
    let iqamaGroup = new Adw.PreferencesGroup();

    const prayerDefs = [
        { key: 'Fajr', i18nKey: 'fajr', defaultVal: Constants.DEFAULT_IQAMA_DELAYS.Fajr },
        { key: 'Dhuhr', i18nKey: 'dhuhr', defaultVal: Constants.DEFAULT_IQAMA_DELAYS.Dhuhr },
        { key: 'Asr', i18nKey: 'asr', defaultVal: Constants.DEFAULT_IQAMA_DELAYS.Asr },
        { key: 'Maghrib', i18nKey: 'maghrib', defaultVal: Constants.DEFAULT_IQAMA_DELAYS.Maghrib },
        { key: 'Ishae', i18nKey: 'isha', defaultVal: Constants.DEFAULT_IQAMA_DELAYS.Ishae }
    ];

    let prayerRows = [];

    prayerDefs.forEach(p => {
        let currentVal = config.iqamaDelays[p.key] || p.defaultVal;
        let adjustment = new Gtk.Adjustment({
            value: currentVal, lower: 1, upper: 60,
            step_increment: 1, page_increment: 5
        });

        let row;
        if (Adw.SpinRow) {
            row = new Adw.SpinRow({
                subtitle: \`Default: +\${p.defaultVal}m\`,
                adjustment: adjustment,
                value: currentVal
            });
            row.connect('notify::value', (widget) => {
                let v = widget.get_value();
                if (v > 0) {
                    config.iqamaDelays[p.key] = v;
                    Config.saveConfig(config);
                }
            });
        } else {
            row = new Adw.ActionRow({
                subtitle: \`Default: +\${p.defaultVal}m\`
            });
            let spin = Gtk.SpinButton.new(adjustment, 1, 0);
            spin.valign = Gtk.Align.CENTER;
            spin.set_value(currentVal);
            spin.connect('value-changed', (widget) => {
                let v = widget.get_value_as_int();
                if (v > 0) {
                    config.iqamaDelays[p.key] = v;
                    Config.saveConfig(config);
                }
            });
            row.add_suffix(spin);
            row.activatable_widget = spin;
        }

        iqamaGroup.add(row);
        prayerRows.push({ def: p, row: row });
    });

    prefsPage.add(iqamaGroup);

    // 3. Save & Apply Actions Group
    let actionsGroup = new Adw.PreferencesGroup();
    let actionRow = new Adw.ActionRow();
    let saveButton = new Gtk.Button({
        valign: Gtk.Align.CENTER
    });
    let statusLabel = new Gtk.Label({
        label: '',
        valign: Gtk.Align.CENTER,
        margin_end: 10
    });

    saveButton.connect('clicked', () => {
        log('[SalatExtension Prefs] Manual Save & Apply clicked.');
        Config.saveConfig(config);
        statusLabel.set_text(I18n.t('prefs_saved_success', config.lang));
    });

    actionRow.add_suffix(statusLabel);
    actionRow.add_suffix(saveButton);
    actionsGroup.add(actionRow);
    prefsPage.add(actionsGroup);

    // Dynamic UI Text Refresh Helper
    const updatePrefsText = () => {
        let lang = config.lang || 'auto';
        generalGroup.set_title(I18n.t('prefs_general_title', lang));
        generalGroup.set_description(I18n.t('prefs_general_desc', lang));
        cityRow.set_title(I18n.t('prefs_city_title', lang));
        langRow.set_title(I18n.t('prefs_lang_title', lang));

        iqamaGroup.set_title(I18n.t('prefs_iqama_title', lang));
        iqamaGroup.set_description(I18n.t('prefs_iqama_desc', lang));

        prayerRows.forEach(item => {
            item.row.set_title(I18n.t(item.def.i18nKey, lang));
        });

        actionsGroup.set_title(I18n.t('prefs_actions_title', lang));
        actionRow.set_title(I18n.t('prefs_actions_title', lang));
        saveButton.set_label(I18n.t('prefs_save_button', lang));
        if (statusLabel.get_text() !== '') {
            statusLabel.set_text(I18n.t('prefs_saved_success', lang));
        }
    };

    langRow.connect('notify::selected', (widget) => {
        let idx = widget.get_selected();
        if (idx >= 0 && idx < I18n.LANGUAGES.length) {
            config.lang = I18n.LANGUAGES[idx].code;
            Config.saveConfig(config);
            updatePrefsText();
        }
    });

    updatePrefsText();
    return prefsPage;
}
`;
    return legacyCode;
}

// Process files
fs.readdirSync(esmDir).forEach((file) => {
    const srcPath = path.join(esmDir, file);
    const destPath = path.join(legacyDir, file);

    if (file.endsWith('.js')) {
        const content = fs.readFileSync(srcPath, 'utf8');
        const transpiled = transpileModule(file, content);
        fs.writeFileSync(destPath, transpiled, 'utf8');
        console.log(`  ✔ Transpiled ${file} -> dist/legacy/${file}`);
    } else {
        fs.copyFileSync(srcPath, destPath);
        console.log(`  ✔ Copied ${file} -> dist/legacy/${file}`);
    }
});

console.log('✔ Legacy transpilation complete!');
