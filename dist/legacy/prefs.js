"use strict";
/// <reference path="./types.d.ts" />
var { Adw, Gtk } = imports.gi;
var ExtensionUtils = imports.misc.extensionUtils;
function _getPrefsModules() {
    const Me = ExtensionUtils.getCurrentExtension();
    return {
        Constants: Me.imports.constants,
        Config: Me.imports.config,
        I18n: Me.imports.i18n
    };
}
function init(metadata) { }
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
                subtitle: `Default: +${p.defaultVal}m`,
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
        }
        else {
            row = new Adw.ActionRow({
                subtitle: `Default: +${p.defaultVal}m`
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
    // Initial translation pass
    updatePrefsText();
    return prefsPage;
}
