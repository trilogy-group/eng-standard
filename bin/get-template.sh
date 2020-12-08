#!/bin/bash

if [ ! -d template/ ]; then
	# clone the repo
	git clone git@github.com:trilogy-group/eng-template.git template/
else
	# update the repo
	(
	cd template
	git pull --ff-only
	)
fi
