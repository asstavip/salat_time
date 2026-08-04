# 🕌 Moroccan Salat & Iqama GNOME Extension

A clean, lightweight, and modular GNOME Shell extension for Moroccan prayer times and Iqama countdowns, powered officially by the Moroccan Ministry of Awqaf & Islamic Affairs (Habous API).

---

## 🏗 Project Architecture

```
salat-gnome-extension/
├── Makefile             # Build, install, check & package commands
├── install.sh           # Convenience installer script wrapper
├── README.md            # Documentation
└── src/                 # Extension Source Directory
    ├── metadata.json    # Extension metadata
    ├── constants.js     # City list, default delays & icons
    ├── i18n.js          # Internationalization (EN, AR, FR)
    ├── config.js        # User config storage & file watching
    ├── api.js           # Habous API network fetching
    ├── calculator.js    # Prayer times & countdown calculations
    ├── ui.js            # Panel text & interactive menu component
    ├── extension.js     # Extension lifecycle entrypoint (init/enable/disable)
    └── prefs.js         # GTK4 / Libadwaita Preferences window
```

---

## 🛠 Makefile Commands

| Command | Description |
| :--- | :--- |
| `make install` | Check syntax and install extension to `~/.local/share/gnome-shell/extensions/` |
| `make uninstall` | Disable and remove extension from system |
| `make pack` | Create `.zip` bundle for GNOME Extensions submission |
| `make check` | Run JavaScript syntax check across all source modules |
| `make clean` | Remove `.zip` build artifacts |

---

## 🚀 Installation & Usage

1. **Install extension**:
   ```bash
   make install
   ```

2. **Reload GNOME Shell**:
   - **X11**: Press `Alt + F2`, type `r`, and hit `Enter`.
   - **Wayland**: Log out and log back in.
