#!/bin/bash
cd /home/aspen/workspace/Fiumba
MAX_RETRIES=10
for i in $(seq 1 $MAX_RETRIES); do
    echo "Attempt $i..."
    gh release upload v1.0.0 android/app/build/outputs/apk/release/app-release.apk --clobber
    if [ $? -eq 0 ]; then
        gh release edit v1.0.0 --draft=false
        echo "Success!"
        exit 0
    fi
    sleep 5
done
