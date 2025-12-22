@echo off
set REACT_NATIVE_PACKAGER_HOSTNAME=10.207.234.108
echo Setting Hostname to %REACT_NATIVE_PACKAGER_HOSTNAME%...
npx expo start --dev-client --host lan
