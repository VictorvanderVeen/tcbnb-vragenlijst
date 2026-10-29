#!/bin/bash
# Zet de Zoho Campaigns-hook voor de quiz op de server.
#
#   ./zoho-naar-server.sh    hook + tcbnb_zoho.env installeren (env maak je eerst met zoho-setup.mjs)
#
# tcbnb_zoho.env staat niet in git; na installatie staat hij alleen nog op de server nodig.
set -euo pipefail
cd "$(dirname "$0")"
SERVER=victorvanderveen@85.10.151.75
ENV=/opt/pocketbase/tcbnb_zoho.env

[ -f tcbnb_zoho.env ] || { echo "tcbnb_zoho.env ontbreekt: draai eerst zoho-setup.mjs."; exit 1; }
grep -q '^ZOHO_LISTKEY=.' tcbnb_zoho.env || { echo "ZOHO_LISTKEY is nog leeg in tcbnb_zoho.env."; exit 1; }

{
  echo "set -e"
  for f in tcbnb_zoho.pb.js tcbnb_zoho_lib.js; do
    echo "base64 -d <<'EINDE' | sudo tee /opt/pocketbase/pb_hooks/$f > /dev/null"
    base64 < "$f" | fold -w 76
    echo "EINDE"
  done
  echo "base64 -d <<'EINDE' | sudo tee $ENV > /dev/null"
  base64 < tcbnb_zoho.env | fold -w 76
  echo "EINDE"
  echo "sudo chown pocketbase:pocketbase /opt/pocketbase/pb_hooks/tcbnb_zoho*.js $ENV"
  echo "sudo chmod 600 $ENV"
  echo "sudo systemctl restart pocketbase"
  echo "sleep 2"
  echo "systemctl is-active pocketbase > /dev/null && echo 'KLAAR: Zoho-hook staat erop' || { echo 'PocketBase start niet:'; sudo journalctl -u pocketbase -n 20 --no-pager; }"
} | ssh "$SERVER" 'bash -s'
