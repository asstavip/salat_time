# 🕌 Moroccan Salat & Iqama GNOME Extension

A clean, lightweight, and modular GNOME Shell extension for Moroccan prayer times and Iqama countdowns, executed natively in **JavaScript** (with TypeScript source files included for development) and powered officially by the Moroccan Ministry of Awqaf & Islamic Affairs (Habous API).

---

## 🏗 Project Architecture

```
salat-gnome-extension/
├── Makefile             # Build, compile, install, check & package commands
├── tsconfig.json        # TypeScript compiler configuration
├── README.md            # Documentation
├── dist/                # Pre-compiled JavaScript extension files (installed directly by GNOME)
└── src/                 # Extension TypeScript Source Directory (for development)
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
| `make install` | Install pre-compiled JavaScript extension directly to `~/.local/share/gnome-shell/extensions/` (no TypeScript required) |
| `make compile` | Compile TypeScript (`src/*.ts`) into JavaScript (`dist/*.js`) if modifying source code |
| `make check` | Run JavaScript syntax check across all compiled modules |
| `make prefs` | Open extension Preferences Settings window directly |
| `make uninstall` | Disable and remove extension from system |
| `make pack` | Create `.zip` bundle from `dist/` for GNOME Extensions submission |
| `make clean` | Remove `dist/` build artifacts |
| `make re` | Clean, compile, check, and reinstall extension |

---

## 🚀 Installation & Usage

1. **Install extension**:
   ```bash
   make install
   ```

2. **Reload GNOME Shell**:
   - **X11**: Press `Alt + F2`, type `r`, and hit `Enter` (or run `kill -HUP $(pgrep gnome-shell | xargs)`).
   - **Wayland**: Log out and log back in.

3. **Enable the extension explicitly**:
   ```bash
   gnome-extensions enable salat-timer@moroccan-habous
   ```

4. **Verify that it is running**:
   ```bash
   gnome-extensions info salat-timer@moroccan-habous
   ```

   The output should contain:
   ```text
   State: ENABLED
   ```

The prayer timer appears in the **top-right GNOME panel**. It does not create an icon on the desktop.

---

## 🔧 Troubleshooting: Installed but Not Visible

If reloading GNOME Shell does not make the timer appear, check whether it is enabled:

```bash
gsettings get org.gnome.shell enabled-extensions
```

The returned list must contain:

```text
salat-timer@moroccan-habous
```

If `gnome-extensions info` reports `State: INITIALIZED`, GNOME recognizes the extension but has not enabled it. Run:

```bash
gnome-extensions enable salat-timer@moroccan-habous
```
