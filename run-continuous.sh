#!/bin/bash
npm run prebuild
while true; do
	./run-all-products.sh
	sleep 900
done
