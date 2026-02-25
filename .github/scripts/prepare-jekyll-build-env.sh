#!/usr/bin/env bash
set -euo pipefail

sudo apt-get update
sudo apt-get install -y imagemagick

python3 -m pip install --upgrade pip
pip3 install --upgrade jupyter nbconvert
