# ==============================================================================
# Moroccan Salat & Iqama GNOME Extension Makefile
# ==============================================================================

UUID        := salat-timer@moroccan-habous
EXT_DIR     := $(HOME)/.local/share/gnome-shell/extensions/$(UUID)
SRC_DIR     := src
PACK_NAME   := $(UUID).shell-extension.zip

.PHONY: all build install uninstall prefs pack check logs clean help

all: check install

# Install extension files directly to user's GNOME Shell extension directory
install: check
	@echo " Installing extension to $(EXT_DIR)..."
	@mkdir -p "$(EXT_DIR)"
	@cp -r $(SRC_DIR)/* "$(EXT_DIR)/"
	@if command -v gnome-extensions > /dev/null 2>&1; then \
		gnome-extensions enable $(UUID) 2>/dev/null || true; \
	fi
	@echo "✔ Installation complete!"
	@echo "  • On X11: Press Alt+F2, type 'r', and hit Enter."
	@echo "  • On Wayland: Log out and log back in."

# Open Preferences Settings Window directly
prefs:
	@echo " Opening extension preferences settings window..."
	@gnome-extensions prefs $(UUID)

# Disable and uninstall extension
uninstall:
	@echo " Uninstalling extension $(UUID)..."
	@if command -v gnome-extensions > /dev/null 2>&1; then \
		gnome-extensions disable $(UUID) 2>/dev/null || true; \
	fi
	@rm -rf "$(EXT_DIR)"
	@echo "✔ Extension uninstalled."

# Package extension zip using gnome-extensions CLI
pack: check
	@echo " Packaging $(PACK_NAME)..."
	@if command -v gnome-extensions > /dev/null 2>&1; then \
		gnome-extensions pack $(SRC_DIR) --force --out-dir=. ; \
	else \
		cd $(SRC_DIR) && zip -r "../$(PACK_NAME)" . ; \
	fi
	@echo "✔ Package created: $(PACK_NAME)"

# Check JavaScript syntax across all source files using node
check:
	@echo " Checking JS syntax..."
	@node -c $(SRC_DIR)/constants.js
	@node -c $(SRC_DIR)/i18n.js
	@node -c $(SRC_DIR)/config.js
	@node -c $(SRC_DIR)/api.js
	@node -c $(SRC_DIR)/calculator.js
	@node -c $(SRC_DIR)/ui.js
	@node -c $(SRC_DIR)/extension.js
	@node -c $(SRC_DIR)/prefs.js
	@echo "✔ All JS files passed syntax check!"

# Display live extension logs from systemd journalctl
logs:
	@echo " Tailing live SalatExtension logs (Ctrl+C to stop)..."
	@journalctl -f -o cat /usr/bin/gnome-shell | grep --line-buffered -i "SalatExtension"

# Clean build artifacts
clean:
	@rm -f *.zip
	@echo "✔ Cleaned build artifacts."

help:
	@echo "Available Makefile targets:"
	@echo "  make install    - Install extension to ~/.local/share/gnome-shell/extensions/"
	@echo "  make prefs      - Open extension Preferences Settings Window directly"
	@echo "  make uninstall  - Disable and remove extension"
	@echo "  make pack       - Package extension into a .zip file"
	@echo "  make check      - Verify JavaScript syntax"
	@echo "  make logs       - Tail live GNOME Shell extension logs"
	@echo "  make clean      - Remove build artifacts"
	@echo "  make re        - Rebuild the extension"
re:
	@echo "  make re        - Rebuild the extension"
	@make clean
	@make check
	@make install
	@echo "✔ Rebuilt extension."
