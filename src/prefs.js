const { Adw, Gtk } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const Constants = Me.imports.constants;
const Config = Me.imports.config;
const I18n = Me.imports.i18n;

function init() {}

function buildPrefsWidget() {
    let config = Config.loadConfig();
    let currentLang = config.lang || 'auto';
    let prefsPage = new Adw.PreferencesPage();

    // 1. General Settings Group (City & Language)
    let generalGroup = new Adw.PreferencesGroup({
        title: I18n.t('prefs_general_title', currentLang),
        description: I18n.t('prefs_general_desc', currentLang)
    });

    let cityRow = new Adw.ComboRow({
        title: I18n.t('prefs_city_title', currentLang),
        model: Gtk.StringList.new(Constants.CITIES.map(c => c.name)),
        selected: Math.max(0, Constants.CITIES.findIndex(c => c.id === config.city.id))
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
        title: I18n.t('prefs_lang_title', currentLang),
        model: Gtk.StringList.new(I18n.LANGUAGES.map(l => l.name)),
        selected: Math.max(0, I18n.LANGUAGES.findIndex(l => l.code === config.lang))
    });
    langRow.connect('notify::selected', (widget) => {
        let idx = widget.get_selected();
        if (idx >= 0 && idx < I18n.LANGUAGES.length) {
            config.lang = I18n.LANGUAGES[idx].code;
            Config.saveConfig(config);
        }
    });
    generalGroup.add(langRow);

    prefsPage.add(generalGroup);

    // 2. Iqama Delays Group
    let iqamaGroup = new Adw.PreferencesGroup({
        title: I18n.t('prefs_iqama_title', currentLang),
        description: I18n.t('prefs_iqama_desc', currentLang)
    });

    const prayers = [
        { key: 'Fajr', name: I18n.t('fajr', currentLang), defaultVal: Constants.DEFAULT_IQAMA_DELAYS.Fajr },
        { key: 'Dhuhr', name: I18n.t('dhuhr', currentLang), defaultVal: Constants.DEFAULT_IQAMA_DELAYS.Dhuhr },
        { key: 'Asr', name: I18n.t('asr', currentLang), defaultVal: Constants.DEFAULT_IQAMA_DELAYS.Asr },
        { key: 'Maghrib', name: I18n.t('maghrib', currentLang), defaultVal: Constants.DEFAULT_IQAMA_DELAYS.Maghrib },
        { key: 'Ishae', name: I18n.t('isha', currentLang), defaultVal: Constants.DEFAULT_IQAMA_DELAYS.Ishae }
    ];

    prayers.forEach(p => {
        let currentVal = config.iqamaDelays[p.key] || p.defaultVal;
        let adjustment = new Gtk.Adjustment({
            value: currentVal, lower: 1, upper: 60,
            step_increment: 1, page_increment: 5
        });

        let row;
        if (Adw.SpinRow) {
            row = new Adw.SpinRow({
                title: p.name,
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
        } else {
            row = new Adw.ActionRow({
                title: p.name,
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
    });

    prefsPage.add(iqamaGroup);

    // 3. Save & Apply Actions Group
    let actionsGroup = new Adw.PreferencesGroup({
        title: I18n.t('prefs_actions_title', currentLang)
    });

    let actionRow = new Adw.ActionRow({
        title: I18n.t('prefs_actions_title', currentLang)
    });

    let saveButton = new Gtk.Button({
        label: I18n.t('prefs_save_button', currentLang),
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
        statusLabel.set_text(I18n.t('prefs_saved_success', currentLang));
    });

    actionRow.add_suffix(statusLabel);
    actionRow.add_suffix(saveButton);
    actionsGroup.add(actionRow);

    prefsPage.add(actionsGroup);

    return prefsPage;
}
