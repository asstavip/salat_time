# 🕌 Moroccan Salat & Iqama GNOME Extension

A clean, lightweight, and modular GNOME Shell extension for Moroccan prayer times and Iqama countdowns, written in **TypeScript** and powered officially by the Moroccan Ministry of Awqaf & Islamic Affairs (Habous API).

---

## 🏗 Project Architecture

```
salat-gnome-extension/
├── Makefile             # Build, compile, install, check & package commands
├── install.sh           # Convenience installer script wrapper
├── tsconfig.json        # TypeScript compiler configuration
├── README.md            # Documentation
├── dist/                # Compiled JavaScript output directory (generated on build)
└── src/                 # Extension TypeScript Source Directory
    ├── metadata.json    # Extension metadata
    ├── types.d.ts       # GJS & GNOME Shell ambient TypeScript definitions
    ├── constants.ts     # City list, default delays & icons
    ├── i18n.ts          # Internationalization (EN, AR, FR)
    ├── config.ts        # User config storage & file watching
    ├── api.ts           # Habous API network fetching
    ├── calculator.ts    # Prayer times & countdown calculations
    ├── ui.ts            # Panel text & interactive menu component
    ├── extension.ts     # Extension lifecycle entrypoint (init/enable/disable)
    └── prefs.ts         # GTK4 / Libadwaita Preferences window
```

---

## 🛠 Makefile Commands

| Command | Description |
| :--- | :--- |
| `make compile` | Compile TypeScript (`src/*.ts`) into JavaScript (`dist/*.js`) |
| `make install` | Compile TS, check syntax, and install extension to `~/.local/share/gnome-shell/extensions/` |
| `make check` | Run JavaScript syntax check across all compiled modules |
| `make prefs` | Open extension Preferences Settings window directly |
| `make uninstall` | Disable and remove extension from system |
| `make pack` | Create `.zip` bundle from `dist/` for GNOME Extensions submission |
| `make clean` | Remove `dist/` build artifacts |
| `make re` | Clean, compile, check, and reinstall extension |

---

## 🚀 Installation & Usage

1. **Compile & Install extension**:
   ```bash
   make install
   ```

2. **Reload GNOME Shell**:
   - **X11**: Press `Alt + F2`, type `r`, and hit `Enter`.
   - **Wayland**: Log out and log back in.
