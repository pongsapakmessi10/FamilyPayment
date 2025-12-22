@echo off
echo.
echo !!! IMPORTANT: RUN AS ADMINISTRATOR !!!
echo.
echo Attempting to Open Port 8081 for ALL Networks...
netsh advfirewall firewall delete rule name="Allow Expo 8081" >nul
netsh advfirewall firewall add rule name="Allow Expo 8081" dir=in action=allow protocol=TCP localport=8081 profile=any remoteip=any
echo.
echo Done. If you see "Ok.", it succeeded.
echo.
echo If it still fails, please Open Windows Start Menu -> "Firewall & Network Protection" -> Turn OFF Public and Private Firewalls temporarily.
pause
