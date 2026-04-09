$ErrorActionPreference = 'Stop'

$hostName = '127.0.0.1'
$port = 3306
$serviceCandidates = @('wampmysqld64', 'mysql', 'MySQL', 'MySQL80', 'mariadb')

function Test-MySqlPort {
    param(
        [string]$HostName,
        [int]$Port
    )

    try {
        return Test-NetConnection -ComputerName $HostName -Port $Port -InformationLevel Quiet
    } catch {
        return $false
    }
}

$portOpen = Test-MySqlPort -HostName $hostName -Port $port
if ($portOpen) {
    Write-Output "MySQL của WampServer đang chạy tại $hostName`:$port"
    exit 0
}

foreach ($serviceName in $serviceCandidates) {
    $service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
    if (-not $service) {
        continue
    }

    if ($service.Status -ne 'Running') {
        Write-Output "Đang khởi động service $serviceName..."
        try {
            Start-Service -Name $serviceName
        } catch {
            Write-Output "Không thể tự khởi động service $serviceName. Hãy mở WampServer hoặc chạy terminal bằng quyền Administrator."
            continue
        }
        Start-Sleep -Seconds 5
    }

    $portOpen = Test-MySqlPort -HostName $hostName -Port $port
    if ($portOpen) {
        Write-Output "MySQL của WampServer đã sẵn sàng tại $hostName`:$port"
        exit 0
    }
}

throw "Không thể kết nối MySQL tại $hostName`:$port. Hãy mở WampServer và bảo đảm dịch vụ MySQL đang chạy."
