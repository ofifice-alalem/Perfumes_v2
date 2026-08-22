$ports = @(
    @{ Port = 8085; Service = 'Apache (HTTP Redirect)' },
    @{ Port = 8443; Service = 'Apache (HTTPS / SSL)' },
    @{ Port = 3306; Service = 'MySQL / MariaDB' },
    @{ Port = 6379; Service = 'Redis (Cache)' },
    @{ Port = 9123; Service = 'Thermal Printer Engine (Node.js)' },
    @{ Port = 5173; Service = 'Vite Dev Server' }
)

$results = foreach ($item in $ports) {
    $p = $item.Port
    $conn = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue
    $isOpen = ($null -ne $conn)
    $procName = "-"
    $pidVal = "-"
    
    if ($isOpen) {
        $owningPids = $conn | Select-Object -ExpandProperty OwningProcess -Unique
        $pidVal = ($owningPids -join ", ")
        $names = @()
        foreach ($curPid in $owningPids) {
            $pObj = Get-Process -Id $curPid -ErrorAction SilentlyContinue
            if ($pObj) { $names += $pObj.ProcessName }
        }
        $procName = ($names | Select-Object -Unique) -join ", "
    }

    [PSCustomObject]@{
        Port = $p
        Service = $item.Service
        Status = if ($isOpen) { "نشط (Listening)" } else { "متوقف (Closed)" }
        Process = $procName
        PID = $pidVal
    }
}

$results | Format-Table -AutoSize
