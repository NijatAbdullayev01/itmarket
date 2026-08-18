#!/usr/bin/env bash
# Verify public DNS for the live it-market.org hostnames.
set -uo pipefail

EXPECTED_IP="${EXPECTED_IP:-77.42.42.63}"
RESOLVER="${RESOLVER:-8.8.8.8}"
HOSTS=(it-market.org www.it-market.org admin.it-market.org api.it-market.org)
failed=0

echo "Checking A records via ${RESOLVER} (expect ${EXPECTED_IP})"
for host in "${HOSTS[@]}"; do
  answers="$(dig @"${RESOLVER}" +time=3 +tries=2 +short "${host}" A 2>/dev/null | rg -v '\.$' || true)"
  if [ -z "${answers}" ]; then
    echo "FAIL  ${host}: NXDOMAIN / empty"
    failed=1
    continue
  fi
  if printf '%s\n' "${answers}" | rg -qx "${EXPECTED_IP}"; then
    echo "OK    ${host}: ${answers}"
  else
    echo "FAIL  ${host}: got '${answers}', want ${EXPECTED_IP}"
    failed=1
  fi
done

if [ "${failed}" -ne 0 ]; then
  cat <<EOF

Required DNS A records at nameservers ns1/ns2.digitalrepublic.az:

  admin.it-market.org.   A   ${EXPECTED_IP}
  api.it-market.org.     A   ${EXPECTED_IP}

Apex/www already resolve; admin/api were dropped (zone SOA serial 2026081800).
Until admin DNS is restored, use emergency URL if configured:
  https://mail.it-market.org
EOF
  exit 1
fi

echo "All public DNS records OK"
exit 0
