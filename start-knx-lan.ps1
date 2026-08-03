param(
	[int]$Port = 8002
)

$ErrorActionPreference = 'Stop'
$webRoot = Join-Path $PSScriptRoot 'src\main\webapp'
$python = (Get-Command python).Source
$addresses = Get-NetIPAddress -AddressFamily IPv4 |
	Where-Object {
		$_.IPAddress -notlike '127.*' -and
		$_.IPAddress -notlike '169.254*' -and
		$_.InterfaceAlias -notlike 'vEthernet*'
	} |
	Select-Object -ExpandProperty IPAddress

Write-Host "KNX topology server"
Write-Host "Local: http://127.0.0.1:$Port/?v=20260803-15"

foreach ($address in $addresses)
{
	Write-Host "LAN:   http://${address}:$Port/?v=20260803-15"
}

Write-Host "Press Ctrl+C to stop."
& $python -m http.server $Port --bind 0.0.0.0 --directory $webRoot
