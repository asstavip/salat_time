// Ambient Types & GJS Declarations for Moroccan Salat GNOME Extension

declare function log(message: string): void;

declare var imports: {
    gi: {
        GLib: any;
        Gio: any;
        Soup: any;
        St: any;
        Clutter: any;
        Adw: any;
        Gtk: any;
    };
    ui: {
        main: any;
        panelMenu: any;
        popupMenu: any;
    };
    misc: {
        extensionUtils: any;
    };
    [key: string]: any;
};

interface City {
    id: number;
    name: string;
}

interface IqamaDelays {
    Fajr: number;
    Dhuhr: number;
    Asr: number;
    Maghrib: number;
    Ishae: number;
    [key: string]: number;
}

interface PrayerEntry {
    key: string;
    name: string;
    time: string;
    delay: number;
    adhanDate: Date;
    iqamaDate: Date;
}

interface ActivePrayer {
    phase: 'IQAMA' | 'NEXT_ADHAN';
    prayer: PrayerEntry;
}

interface UserConfig {
    city: City;
    lang: string;
    iqamaDelays: IqamaDelays;
}

interface PrayerTimesData {
    Fajr: string;
    Dhuhr: string;
    Asr: string;
    Maghrib: string;
    Ishae: string;
    [key: string]: any;
}

interface LanguageOption {
    code: string;
    name: string;
}

interface TranslationDict {
    [key: string]: string;
}

interface TranslationsMap {
    [lang: string]: TranslationDict;
}
