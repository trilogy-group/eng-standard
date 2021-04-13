#!/bin/bash
cat products.tsv | while IFS=$'\t' read INPUT_PRODUCT_NAME INPUT_REPOSITORY; do
	export INPUT_PRODUCT_NAME INPUT_REPOSITORY
	echo $INPUT_PRODUCT_NAME
	ts-node src/main.ts
done
