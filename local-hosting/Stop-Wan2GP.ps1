param()
$conn = Get-NetTCPConnection -LocalPort 42003 -State Listen -ErrorAction SilentlyContinue
if ($conn) {
    Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
    Write-Host "Wan2GP background engine stopped."
} else {
    Write-Host "Wan2GP is not running."
}
