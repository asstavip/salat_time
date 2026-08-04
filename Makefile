# ==============================================================================
# Moroccan Salat & Iqama GNOME Extension Makefile
# ==============================================================================

UUID        := salat-timer@moroccan-habous
EXT_DIR     := $(HOME)/.local/share/gnome-shell/extensions/$(UUID)
SRC_DIR     := src
DIST_DIR    := dist
PACK_NAME   := $(UUID).shell-extension.zip
TSC         := ./node_modules/.bin/tsc

.PHONY: all compile build install uninstall prefs pack check logs clean help re

all: check install

# Compile TypeScript source code to JavaScript in dist/
compile:
	@echo " 🔨 Compiling TypeScript sources..."
	@if [ -f "$(TSC)" ]; then \
		$(TSC) ; \
	else \
		npx tsc ; \
	fi
	@cp -f $(SRC_DIR)/metadata.json $(DIST_DIR)/
	@echo "✔ TypeScript compilation successful!"

build: compile

# Install compiled extension files directly to user's GNOME Shell extension directory
install: compile check
	@echo " 🚀 Installing extension to $(EXT_DIR)..."
	@mkdir -p "$(EXT_DIR)"
	@cp -r $(DIST_DIR)/* "$(EXT_DIR)/"
	@if command -v gnome-extensions > /dev/null 2>&1; then \
		gnome-extensions enable $(UUID) 2>/dev/null || true; \
	fi
	@echo "✔ Installation complete!"
	@if [ "$$XDG_SESSION_TYPE" = "wayland" ]; then \
		echo "  • Detected Session: Wayland"; \
		echo "  • Reload GNOME Shell: Log out and log back in to activate the extension."; \
	else \
		echo "  • Detected Session: X11"; \
		echo "  • Reload GNOME Shell: Press Alt+F2, type 'r', and press Enter."; \
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

# Package extension zip using gnome-extensions CLI
pack: compile check
	@echo " 📦 Packaging $(PACK_NAME)..."
	@if command -v gnome-extensions > /dev/null 2>&1; then \
		gnome-extensions pack $(DIST_DIR) --force --out-dir=. ; \
	else \
		cd $(DIST_DIR) && zip -r "../$(PACK_NAME)" . ; \
	fi
	@echo "✔ Package created: $(PACK_NAME)"

# Check JavaScript syntax across all compiled source files using node
check: compile
	@echo " 🔍 Checking compiled JS syntax..."
	@for f in $(DIST_DIR)/*.js; do \
		node -c "$$f" || exit 1; \
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
	@echo "  make compile    - Compile TypeScript source files to dist/"
	@echo "  make install    - Compile & install extension to ~/.local/share/gnome-shell/extensions/"
	@echo "  make prefs      - Open extension Preferences Settings Window directly"
	@echo "  make uninstall  - Disable and remove extension"
	@echo "  make pack       - Package extension into a .zip file from dist/"
	@echo "  make check      - Compile TS & verify compiled JavaScript syntax"
	@echo "  make logs       - Tail live GNOME Shell extension logs"
	@echo "  make clean      - Remove build artifacts"
	@echo "  make re         - Clean, compile, check and reinstall extension"

re: clean compile check install
	@echo "✔ Rebuilt and reinstalled extension."
