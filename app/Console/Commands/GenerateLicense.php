<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\LicenseService;

class GenerateLicense extends Command
{
    protected $signature = 'license:generate {device_id}';
    protected $description = 'Generate a license key for a specific Device ID';

    public function handle(LicenseService $licenseService)
    {
        $deviceId = $this->argument('device_id');
        $key = $licenseService->generateLicenseKey($deviceId);
        
        $this->info("====================================");
        $this->info("Device ID: " . $deviceId);
        $this->info("License Key: " . $key);
        $this->info("====================================");
        
        return 0;
    }
}
