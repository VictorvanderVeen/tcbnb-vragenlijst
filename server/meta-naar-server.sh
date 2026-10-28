#!/bin/bash
# Zet de Meta Conversions API-hook voor de quiz op de server.
#
#   ./meta-naar-server.sh        hook installeren + token invoeren (schakelaar blijft op 'nee')
#   ./meta-naar-server.sh aan    leads echt naar Meta sturen (pas na akkoord Takecarebnb op de privacytekst)
#   ./meta-naar-server.sh uit    weer stoppen
#
# De token typ je verborgen in; hij gaat via ssh rechtstreeks naar /opt/pocketbase/tcbnb_meta.env
# en wordt nergens op deze Mac bewaard.
set -euo pipefail
cd "$(dirname "$0")"
SERVER=victorvanderveen@85.10.151.75
ENV=/opt/pocketbase/tcbnb_meta.env

if [ "${1:-}" = "aan" ] || [ "${1:-}" = "uit" ]; then
  WAARDE=$([ "$1" = "aan" ] && echo ja || echo nee)
  ssh "$SERVER" "sudo sed -i 's/^META_CAPI_AAN=.*/META_CAPI_AAN=$WAARDE/' $ENV && sudo systemctl restart pocketbase && grep META_CAPI_AAN $ENV | sed 's/^/KLAAR: /'"
  exit 0
fi

read -rsp "Plak de Conversions API-token uit Events Manager (je ziet niets verschijnen) en druk Enter: " TOKEN; echo
[ -n "$TOKEN" ] || { echo "Geen token ingevoerd, gestopt."; exit 1; }

{
  echo "set -e"
  for f in tcbnb_meta.pb.js tcbnb_meta_lib.js; do
    echo "base64 -d <<'EINDE' | sudo tee /opt/pocketbase/pb_hooks/$f > /dev/null"
    base64 < "$f" | fold -w 76
    echo "EINDE"
  done
  echo "sudo tee $ENV > /dev/null <<'EINDE'"
  echo "META_PIXEL_ID=2226309004976149"
  echo "META_CAPI_TOKEN=$TOKEN"
  echo "META_CAPI_AAN=nee"
  echo "META_TEST_CODE="
  echo "EINDE"
  echo "sudo chown pocketbase:pocketbase /opt/pocketbase/pb_hooks/tcbnb_meta*.js $ENV"
  echo "sudo chmod 600 $ENV"
  echo "sudo systemctl restart pocketbase"
  echo "sleep 2"
  echo "systemctl is-active pocketbase > /dev/null && echo 'KLAAR: hook staat erop, schakelaar op nee' || { echo 'PocketBase start niet:'; sudo journalctl -u pocketbase -n 20 --no-pager; }"
} | ssh "$SERVER" 'bash -s'
