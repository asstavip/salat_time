const GLib = imports.gi.GLib;

var LANGUAGES = [
    { code: 'auto', name: 'Auto (System Language)' },
    { code: 'en', name: 'English' },
    { code: 'ar', name: 'العربية (Arabic)' },
    { code: 'fr', name: 'Français (French)' }
];

var TRANSLATIONS = {
    en: {
        loading: "🕌 Loading Salat...",
        adhan_in: "🕌 {prayer} in {time}",
        iqama_in: "📢 Iqama ({prayer}) in {time}",
        fajr: "Fajr", dhuhr: "Dhuhr", asr: "Asr", maghrib: "Maghrib", isha: "Isha",
        adhan: "Adhan", iqama: "Iqama",
        select_city: "🏙 Select City",
        custom_iqama: "⚙ Custom Iqama Delays",
        reset_defaults: "🔄 Reset All Delays to Default",
        minutes_after: "{min} minutes after Adhan",
        select_lang: "🌐 Language / اللغة",
        official_header: "📍 {city} (Habous Official)",
        prefs_general_title: "General Settings",
        prefs_general_desc: "Select your city and language preference.",
        prefs_city_title: "City",
        prefs_lang_title: "Language",
        prefs_iqama_title: "Iqama Delays",
        prefs_iqama_desc: "Set the delay (in minutes) after Adhan for each prayer.",
        prefs_actions_title: "Save & Apply",
        prefs_save_button: "💾 Save & Apply Settings",
        prefs_saved_success: "✔ Saved & Applied Successfully!"
    },
    ar: {
        loading: "🕌 جاري تحميل مواقيت الصلاة...",
        adhan_in: "🕌 {prayer} بعد {time}",
        iqama_in: "📢 إقامة ({prayer}) بعد {time}",
        fajr: "الفجر", dhuhr: "الظهر", asr: "العصر", maghrib: "المغرب", isha: "العشاء",
        adhan: "الأذان", iqama: "الإقامة",
        select_city: "🏙 اختر المدينة",
        custom_iqama: "⚙ أوقات الإقامة",
        reset_defaults: "🔄 إعادة ضبط الأوقات الافتراضية",
        minutes_after: "{min} دقيقة بعد الأذان",
        select_lang: "🌐 اللغة / Language",
        official_header: "📍 {city} (مواقيت الأوقاف الرسمية)",
        prefs_general_title: "الإعدادات العامة",
        prefs_general_desc: "اختر مدينتك ولغتك المفضلة.",
        prefs_city_title: "المدينة",
        prefs_lang_title: "اللغة",
        prefs_iqama_title: "أوقات الإقامة",
        prefs_iqama_desc: "حدد مدة الإقامة (بالدقائق) بعد الأذان لكل صلاة.",
        prefs_actions_title: "حفظ وتطبيق الإعدادات",
        prefs_save_button: "💾 حفظ وتطبيق الآن",
        prefs_saved_success: "✔ تم الحفظ والتطبيق بنجاح!"
    },
    fr: {
        loading: "🕌 Chargement des prières...",
        adhan_in: "🕌 {prayer} dans {time}",
        iqama_in: "📢 Iqama ({prayer}) dans {time}",
        fajr: "Fajr", dhuhr: "Dhuhr", asr: "Asr", maghrib: "Maghrib", isha: "Isha",
        adhan: "Adhan", iqama: "Iqama",
        select_city: "🏙 Choisir la ville",
        custom_iqama: "⚙ Délais d'Iqama",
        reset_defaults: "🔄 Réinitialiser les délais",
        minutes_after: "{min} minutes après l'Adhan",
        select_lang: "🌐 Langue / Language",
        official_header: "📍 {city} (Officiel Habous)",
        prefs_general_title: "Paramètres généraux",
        prefs_general_desc: "Sélectionnez votre ville et votre langue.",
        prefs_city_title: "Ville",
        prefs_lang_title: "Langue",
        prefs_iqama_title: "Délais d'Iqama",
        prefs_iqama_desc: "Définissez le délai (en minutes) après l'Adhan pour chaque prière.",
        prefs_actions_title: "Enregistrer & Appliquer",
        prefs_save_button: "💾 Enregistrer & Appliquer",
        prefs_saved_success: "✔ Enregistré et appliqué !"
    }
};

function getSystemLang() {
    try {
        let locales = GLib.get_language_names();
        for (let loc of locales) {
            if (loc.startsWith('ar')) return 'ar';
            if (loc.startsWith('fr')) return 'fr';
            if (loc.startsWith('en')) return 'en';
        }
    } catch (e) {}
    return 'en';
}

function resolveLang(langCode) {
    if (!langCode || langCode === 'auto') return getSystemLang();
    return TRANSLATIONS[langCode] ? langCode : 'en';
}

function t(key, langCode = 'auto', params = {}) {
    let dict = TRANSLATIONS[resolveLang(langCode)] || TRANSLATIONS['en'];
    let str = dict[key] || TRANSLATIONS['en'][key] || key;
    for (let p in params) {
        str = str.replace(new RegExp(`\\{${p}\\}`, 'g'), params[p]);
    }
    return str;
}
