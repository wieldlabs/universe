#!/bin/bash
# Backup MongoDB
# Make sure you have mongodb-database-tools installed
# $ brew tap mongodb/brew
# $ brew install mongodb-database-tools
mkdir -p ~/.backup
mongodump --uri=$1 --gzip --archive > ~/.backup/database_name_$(date +%Y%m%d).gz
echo "Backup completed to ~/.backup/database_name_$(date +%Y%m%d).gz"