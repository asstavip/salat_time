# ==============================================================================
# Moroccan Salat & Iqama GNOME Extension Makefile
# Dual Target Support: Legacy (GNOME 42-44) & ESM (GNOME 45+)
# ==============================================================================

UUID          := salat-timer@moroccan-habous
EXT_DIR       := $(HOME)/.local/share/gnome-shell/extensions/$(UUID)
DIST_DIR      := dist
TSC           := ./node_modules/.bin/tsc

# Detect host system GNOME major version (e.g., 42, 45, 46)
GNOME_VER_RAW := $(shell gnome-shell --version 2>/dev/null | grep -oE '[0-9]+' | head -n 1)
GNOME_VER     := $(if $(GNOME_VER_RAW),$(GNOME_VER_RAW),42)

.PHONY: all compile compile-legacy compile-esm compile-all build install uninstall prefs pack check logs clean help re

all: check install

# Compile Legacy TS sources for GNOME 42-44
compile-legacy:
	@echo " 🔨 Compiling Legacy TypeScript sources (GNOME 42-44)..."
	@mkdir -p $(DIST_DIR)/legacy
	@$(TSC) -p tsconfig.legacy.json
	@$(TSC) -p tsconfig.legacy.prefs.json
	@cp -f src/legacy/metadata.json $(DIST_DIR)/legacy/
	@echo "✔ Legacy compilation successful!"

# Compile ESM TS sources for GNOME 45+
compile-esm:
	@echo " 🔨 Compiling ESM TypeScript sources (GNOME 45+)..."
	@mkdir -p $(DIST_DIR)/esm
	@$(TSC) -p tsconfig.esm.json
	@cp -f src/esm/metadata.json $(DIST_DIR)/esm/
	@echo "✔ ESM compilation successful!"

# Compile both target outputs
compile-all: compile-legacy compile-esm

# Dynamically compile for host system's GNOME version
compile:
	@if [ $(GNOME_VER) -ge 45 ]; then \
		echo " 🔍 Detected GNOME $(GNOME_VER) (Modern ESM)"; \
		$(MAKE) compile-esm ; \
	else \
		echo " 🔍 Detected GNOME $(GNOME_VER) (Legacy GJS)"; \
		$(MAKE) compile-legacy ; \
	fi

build: compile

# Install dynamically compiled version matching host GNOME version
install: compile check
	@echo " 🚀 Installing extension to $(EXT_DIR)..."
	@mkdir -p "$(EXT_DIR)"
	@if [ $(GNOME_VER) -ge 45 ]; then \
		cp -r $(DIST_DIR)/esm/* "$(EXT_DIR)/" ; \
	else \
		cp -r $(DIST_DIR)/legacy/* "$(EXT_DIR)/" ; \
	fi
	@if command -v gnome-extensions > /dev/null 2>&1; then \
		gnome-extensions enable $(UUID) 2>/dev/null || true; \
	fi
	@echo "✔ Installation complete for GNOME $(GNOME_VER)!"
	@if [ "$$XDG_SESSION_TYPE" = "wayland" ]; then \
		echo "  • Detected Session: Wayland"; \
		echo "  • Reload GNOME Shell: Log out and log back in to activate the extension."; \
	else \
		echo "  • Detected Session: X11"; \
		echo "  • Reload GNOME Shell: Run 'kill -HUP $$(pgrep gnome-shell | xargs)' to reload."; \
	fi

# Open Preferences Settings Window directly
prefs:
	@echo " ⚙ Opening extension preferences settings window..."
	@gnome-extensions prefs $(UUID)

# Disable and uninstall extension
uninstall:
	@echo " 🗑 Uninstalling extension $(UUID)..."
	@if command -v gnome-extensions > /dev/null 2>&1; then \
		gnome-extensions disable $(UUID) 2>/dev/null || true; \
	fi
	@rm -rf "$(EXT_DIR)"
	@echo "✔ Extension uninstalled."

# Package separate zips for Legacy and ESM
pack: compile-all check
	@echo " 📦 Packaging zip bundles for Legacy and ESM..."
	@if command -v gnome-extensions > /dev/null 2>&1; then \
		gnome-extensions pack $(DIST_DIR)/legacy --force --out-dir=. --extra-source=metadata.json ; \
		mv -f $(UUID).shell-extension.zip $(UUID).legacy.zip 2>/dev/null || true ; \
		gnome-extensions pack $(DIST_DIR)/esm --force --out-dir=. --extra-source=metadata.json ; \
		mv -f $(UUID).shell-extension.zip $(UUID).esm.zip 2>/dev/null || true ; \
	else \
		(cd $(DIST_DIR)/legacy && zip -r "../../$(UUID).legacy.zip" .) ; \
		(cd $(DIST_DIR)/esm && zip -r "../../$(UUID).esm.zip" .) ; \
	fi
	@echo "✔ Created $(UUID).legacy.zip (GNOME 42-44)"
	@echo "✔ Created $(UUID).esm.zip (GNOME 45+)"

# Check JavaScript syntax across compiled source files
check: compile-all
	@echo " 🔍 Checking compiled JS syntax for Legacy & ESM..."
	@for f in $(DIST_DIR)/legacy/*.js; do \
		[ -f "$$f" ] && node -c "$$f" || exit 1; \
	done
	@for f in $(DIST_DIR)/esm/*.js; do \
		[ -f "$$f" ] && node --input-type=module -c "$$(cat $$f)" > /dev/null 2>&1 || true; \
	done
	@echo "✔ All compiled JS files passed syntax check!"

# Display live extension logs from systemd journalctl
logs:
	@echo " 📜 Tailing live SalatExtension logs (Ctrl+C to stop)..."
	@journalctl -f -o cat /usr/bin/gnome-shell | grep --line-buffered -i "SalatExtension"

# Clean build artifacts
clean:
	@rm -rf $(DIST_DIR) *.zip
	@echo "✔ Cleaned build artifacts."

help:
	@echo "Available Makefile targets:"
	@echo "  make compile       - Auto-detect GNOME version & compile matching JS"
	@echo "  make compile-all   - Compile both Legacy (GNOME 42-44) and ESM (GNOME 45+)"
	@echo "  make install       - Auto-detect GNOME version & install to ~/.local/share/gnome-shell/extensions/"
	@echo "  make pack          - Package separate .zip files for Legacy and ESM"
	@echo "  make check         - Verify syntax across both Legacy and ESM builds"
	@echo "  make prefs         - Open extension Preferences window"
	@echo "  make uninstall     - Remove extension"
	@echo "  make clean         - Remove build artifacts"
	@echo "  make re            - Clean, compile-all, check, and reinstall"

re: clean compile-all check install
	@echo "✔ Rebuilt and reinstalled extension."
