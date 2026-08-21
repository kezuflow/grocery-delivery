[CmdletBinding()]
param(
  [ValidateSet("staging", "production")]
  [string]$Environment = "staging"
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$tempFiles = @()

function New-RandomSecret {
  $bytes = New-Object byte[] 48
  $generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try {
    $generator.GetBytes($bytes)
    return [Convert]::ToBase64String($bytes)
  }
  finally {
    $generator.Dispose()
  }
}

function Set-WorkerSecretFromFile {
  param(
    [Parameter(Mandatory = $true)][string]$Worker,
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$File
  )

  Write-Host "Setting $Name on $Worker ($Environment)..."
  Get-Content -LiteralPath $File -Raw | & pnpm --filter $Worker exec wrangler secret put $Name --env $Environment
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to set $Name on $Worker."
  }
}

try {
  Set-Location -LiteralPath $repoRoot

  $betterAuthFile = Join-Path $env:TEMP "carbon-better-auth-secret-$([guid]::NewGuid()).txt"
  $eventProcessorFile = Join-Path $env:TEMP "carbon-event-processor-token-$([guid]::NewGuid()).txt"
  $mediaSigningFile = Join-Path $env:TEMP "carbon-media-signing-secret-$([guid]::NewGuid()).txt"
  $tempFiles += $betterAuthFile, $eventProcessorFile, $mediaSigningFile

  [IO.File]::WriteAllText($betterAuthFile, (New-RandomSecret))
  [IO.File]::WriteAllText($eventProcessorFile, (New-RandomSecret))
  [IO.File]::WriteAllText($mediaSigningFile, (New-RandomSecret))

  Set-WorkerSecretFromFile -Worker "@carbon/api" -Name "BETTER_AUTH_SECRET" -File $betterAuthFile
  Set-WorkerSecretFromFile -Worker "@carbon/api" -Name "EVENT_PROCESSOR_TOKEN" -File $eventProcessorFile
  Set-WorkerSecretFromFile -Worker "@carbon/jobs" -Name "EVENT_PROCESSOR_TOKEN" -File $eventProcessorFile
  Set-WorkerSecretFromFile -Worker "@carbon/api" -Name "MEDIA_SIGNING_SECRET" -File $mediaSigningFile

  Write-Host ""
  Write-Host "Worker secrets configured for $Environment." -ForegroundColor Green
  Write-Host "The generated values were removed from the local temporary directory."
  Write-Host "No account-level Secrets Store values were created or changed."
}
catch {
  Write-Host ""
  Write-Host "Secret setup failed: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}
finally {
  foreach ($file in $tempFiles) {
    Remove-Item -LiteralPath $file -Force -ErrorAction SilentlyContinue
  }
}
