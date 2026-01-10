#!/bin/bash

API_URL="https://api.folkloregarden.cz/api/payment/notify"
MERCHANT="493226"
TRANS_ID="KPVH-5HFA-UU70"
REF_ID="71"
PRICE="10000"
CURR="CZK"
TEST="true"
DIGEST="1a2b3c4d5e6f7g8h9i0j"

# Test status: PAID
curl -X POST "$API_URL" \
-H 'Content-Type: application/x-www-form-urlencoded' \
-d "merchant=$MERCHANT&transId=$TRANS_ID&refId=$REF_ID&status=PAID&price=$PRICE&curr=$CURR&test=$TEST&digest=$DIGEST"

echo -e "\nPAID test done."

# Test status: CANCELLED
curl -X POST "$API_URL" \
-H 'Content-Type: application/x-www-form-urlencoded' \
-d "merchant=$MERCHANT&transId=$TRANS_ID&refId=$REF_ID&status=CANCELLED&price=$PRICE&curr=$CURR&test=$TEST&digest=$DIGEST"

echo -e "\nCANCELLED test done."

# Test status: AUTHORIZED
curl -X POST "$API_URL" \
-H 'Content-Type: application/x-www-form-urlencoded' \
-d "merchant=$MERCHANT&transId=$TRANS_ID&refId=$REF_ID&status=AUTHORIZED&price=$PRICE&curr=$CURR&test=$TEST&digest=$DIGEST"

echo -e "\nAUTHORIZED test done."