const { GLib, Clutter } = imports.gi;
const PopupMenu = imports.ui.popupMenu;
const ExtensionUtils = imports.misc.extensionUtils;

function _getModules() {
    const Me = ExtensionUtils.getCurrentExtension();
    return {
        Constants: Me.imports.constants,
        I18n: Me.imports.i18n,
        Calculator: Me.imports.calculator
    };
}

function updatePanelText(indicator, prayerTimesData, iqamaDelays, currentLang) {
    if (!prayerTimesData || !indicator) return;
    const { I18n, Calculator } = _getModules();

    const now = new Date();
    const prayers = Calculator.getPrayerEntries(prayerTimesData, iqamaDelays, currentLang, now);
    const active = Calculator.findActivePrayer(prayers, iqamaDelays, now);
    if (!active) return;

    if (active.phase === 'IQAMA') {
        const diff = active.prayer.iqamaDate - now;
        indicator.buttonText.set_text(I18n.t('iqama_in', currentLang, {
            prayer: active.prayer.name,
            time: Calculator.formatDiff(diff)
        }));
    } else {
        const diff = active.prayer.adhanDate - now;
        indicator.buttonText.set_text(I18n.t('adhan_in', currentLang, {
            prayer: active.prayer.name,
            time: Calculator.formatDiff(diff)
        }));
    }
}

function rebuildMenu(indicator, config, prayerTimesData, callbacks) {
    if (!prayerTimesData || !indicator) return;
    const { Constants, I18n, Calculator } = _getModules();

    const now = new Date();
    const prayers = Calculator.getPrayerEntries(prayerTimesData, config.iqamaDelays, config.lang, now);
    const active = Calculator.findActivePrayer(prayers, config.iqamaDelays, now);

    indicator.menu.removeAll();

    // 1. Header
    indicator.menu.addMenuItem(new PopupMenu.PopupMenuItem(
        I18n.t('official_header', config.lang, { city: config.city.name }), { reactive: false }
    ));
    indicator.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

    // 2. Prayer times list
    let adhanWord = I18n.t('adhan', config.lang);
    let iqamaWord = I18n.t('iqama', config.lang);

    for (let p of prayers) {
        let isActive = active && active.prayer.key === p.key;
        let prefix = '   ';
        if (isActive && active.phase === 'IQAMA') prefix = '📢 ';
        else if (isActive && active.phase === 'NEXT_ADHAN') prefix = '▶ ';

        const iqamaH = String(p.iqamaDate.getHours()).padStart(2, '0');
        const iqamaM = String(p.iqamaDate.getMinutes()).padStart(2, '0');
        let itemText = `${prefix}${p.name.padEnd(8, ' ')} ${adhanWord}: ${p.time}   ${iqamaWord}: ${iqamaH}:${iqamaM} (+${p.delay}m)`;
        indicator.menu.addMenuItem(new PopupMenu.PopupMenuItem(itemText));
    }

    indicator.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

    // 3. City selector
    let citySubMenu = new PopupMenu.PopupSubMenuMenuItem(I18n.t('select_city', config.lang));
    for (let city of Constants.CITIES) {
        let cityItem = new PopupMenu.PopupMenuItem((city.id === config.city.id ? '✔ ' : '   ') + city.name);
        cityItem.connect('activate', () => callbacks.onSelectCity(city));
        citySubMenu.menu.addMenuItem(cityItem);
    }
    indicator.menu.addMenuItem(citySubMenu);

    // 4. Custom Iqama Delays Submenu (with Clutter event trapping so clicking never collapses menu)
    let iqamaSubMenu = new PopupMenu.PopupSubMenuMenuItem(I18n.t('custom_iqama', config.lang));

    const presetOptions = {
        Fajr: [10, 15, 20, 25, 30],
        Dhuhr: [5, 10, 15, 20, 25],
        Asr: [5, 10, 15, 20, 25],
        Maghrib: [5, 10, 15, 20],
        Ishae: [5, 10, 15, 20, 25]
    };

    for (let p of prayers) {
        let currentDelay = config.iqamaDelays[p.key] || Constants.DEFAULT_IQAMA_DELAYS[p.key] || 15;
        let prayerSubMenu = new PopupMenu.PopupSubMenuMenuItem(`${Constants.PRAYER_EMOJIS[p.key]} ${p.name} (+${currentDelay}m)`);

        prayerSubMenu.connect('button-press-event', () => {
            prayerSubMenu.menu.toggle();
            return Clutter.EVENT_STOP;
        });
        prayerSubMenu.connect('button-release-event', () => Clutter.EVENT_STOP);
        prayerSubMenu.connect('touch-event', () => {
            prayerSubMenu.menu.toggle();
            return Clutter.EVENT_STOP;
        });

        let incItem = new PopupMenu.PopupMenuItem(`   ➕ +1 min  ➔  (+${Math.min(60, currentDelay + 1)}m)`);
        incItem.connect('button-press-event', () => {
            callbacks.onSetIqamaDelay(p.key, Math.min(60, currentDelay + 1));
            return Clutter.EVENT_STOP;
        });
        incItem.connect('button-release-event', () => Clutter.EVENT_STOP);
        prayerSubMenu.menu.addMenuItem(incItem);

        let decItem = new PopupMenu.PopupMenuItem(`   ➖ -1 min  ➔  (+${Math.max(1, currentDelay - 1)}m)`);
        decItem.connect('button-press-event', () => {
            callbacks.onSetIqamaDelay(p.key, Math.max(1, currentDelay - 1));
            return Clutter.EVENT_STOP;
        });
        decItem.connect('button-release-event', () => Clutter.EVENT_STOP);
        prayerSubMenu.menu.addMenuItem(decItem);
        prayerSubMenu.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        let options = presetOptions[p.key] || [5, 10, 15, 20, 25, 30];
        if (!options.includes(currentDelay)) {
            options = [...options, currentDelay].sort((a, b) => a - b);
        }

        for (let minutes of options) {
            let isSelected = minutes === currentDelay;
            let optItem = new PopupMenu.PopupMenuItem((isSelected ? '✔ ' : '   ') + I18n.t('minutes_after', config.lang, { min: minutes }));
            optItem.connect('button-press-event', () => {
                callbacks.onSetIqamaDelay(p.key, minutes);
                return Clutter.EVENT_STOP;
            });
            optItem.connect('button-release-event', () => Clutter.EVENT_STOP);
            prayerSubMenu.menu.addMenuItem(optItem);
        }

        iqamaSubMenu.menu.addMenuItem(prayerSubMenu);
    }

    iqamaSubMenu.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
    let resetItem = new PopupMenu.PopupMenuItem(I18n.t('reset_defaults', config.lang));
    resetItem.connect('button-press-event', () => {
        callbacks.onResetIqamaDefaults();
        return Clutter.EVENT_STOP;
    });
    resetItem.connect('button-release-event', () => Clutter.EVENT_STOP);
    iqamaSubMenu.menu.addMenuItem(resetItem);

    indicator.menu.addMenuItem(iqamaSubMenu);

    // 5. Language selector
    let langSubMenu = new PopupMenu.PopupSubMenuMenuItem(I18n.t('select_lang', config.lang));
    for (let langObj of I18n.LANGUAGES) {
        let langItem = new PopupMenu.PopupMenuItem((langObj.code === config.lang ? '✔ ' : '   ') + langObj.name);
        langItem.connect('activate', () => callbacks.onSelectLang(langObj.code));
        langSubMenu.menu.addMenuItem(langItem);
    }
    indicator.menu.addMenuItem(langSubMenu);

    // 6. Settings window launcher
    indicator.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
    let openPrefsItem = new PopupMenu.PopupMenuItem('⚙ Open Settings / فتح الإعدادات');
    openPrefsItem.connect('activate', () => {
        try {
            GLib.spawn_command_line_async('gnome-extensions prefs salat-timer@moroccan-habous');
        } catch (e) {
            log('[SalatExtension UI] Failed to open prefs: ' + e.message);
        }
    });
    indicator.menu.addMenuItem(openPrefsItem);
}
