#!/bin/bash
# Zet de mailmelding voor het campagneformulier (tcbnb_info_melding.pb.js) op de server.
# Gebruikt de bestaande /opt/pocketbase/mail.env (TransIP-relay), dus geen geheimen in dit script.
set -euo pipefail
cd "$(dirname "$0")"
SERVER=victorvanderveen@85.10.151.75
F=tcbnb_info_melding.pb.js
{
  echo "set -e"
  echo "test -f /opt/pocketbase/mail.env || { echo 'mail.env ontbreekt op de server'; exit 1; }"
  echo "base64 -d <<'EINDE' | sudo tee /opt/pocketbase/pb_hooks/$F > /dev/null"
  base64 < "$F" | fold -w 76
  echo "EINDE"
  echo "sudo chown pocketbase:pocketbase /opt/pocketbase/pb_hooks/$F"
  echo "sudo systemctl restart pocketbase"
  echo "sleep 2"
  echo "systemctl is-active pocketbase > /dev/null && echo 'KLAAR: mailmelding staat erop' || { echo 'PocketBase start niet:'; sudo journalctl -u pocketbase -n 20 --no-pager; }"
} | ssh "$SERVER" 'bash -s'
