@echo off
set REACT_NATIVE_PACKAGER_HOSTNAME=
echo Cleared Hostname Variable.
echo Starting Tunnel...
npx expo start --dev-client --tunnel
