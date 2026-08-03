#!/usr/bin/env bash

set -euo pipefail

PORT="${1:-8002}"
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
WEB_ROOT="${SCRIPT_DIR}/src/main/webapp"

if [[ ! "${PORT}" =~ ^[0-9]+$ ]] || (( PORT < 1 || PORT > 65535 )); then
	printf 'Invalid port: %s (expected 1-65535)\n' "${PORT}" >&2
	exit 2
fi

if ! command -v python3 >/dev/null 2>&1; then
	printf 'python3 is required but was not found in PATH.\n' >&2
	exit 1
fi

if [[ ! -f "${WEB_ROOT}/index.html" ]]; then
	printf 'draw.io web root not found: %s\n' "${WEB_ROOT}" >&2
	exit 1
fi

printf 'KNX topology server\n'
printf 'Local: http://127.0.0.1:%s/?v=20260804-39\n' "${PORT}"

if command -v hostname >/dev/null 2>&1; then
	for address in $(hostname -I 2>/dev/null); do
		[[ "${address}" != *.* || "${address}" == 127.* || "${address}" == 169.254.* ]] && continue
		printf 'LAN:   http://%s:%s/?v=20260804-39\n' "${address}" "${PORT}"
	done
fi

printf 'Press Ctrl+C to stop.\n'
exec python3 -m http.server "${PORT}" --bind 0.0.0.0 --directory "${WEB_ROOT}"
