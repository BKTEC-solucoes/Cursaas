param(
  [Parameter(Mandatory = $true)]
  [string]$ClientId
)

if ($ClientId -notmatch '\.apps\.googleusercontent\.com$') {
  Write-Error "Client ID invalido. Deve terminar com .apps.googleusercontent.com"
  exit 1
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$frontendEnvPath = Join-Path $repoRoot "frontend\src\environments\environment.ts"
$backendEnvPath = Join-Path $repoRoot "backend-node\.env"

if (-not (Test-Path $frontendEnvPath)) {
  Write-Error "Arquivo nao encontrado: $frontendEnvPath"
  exit 1
}

if (-not (Test-Path $backendEnvPath)) {
  Write-Error "Arquivo nao encontrado: $backendEnvPath"
  exit 1
}

$frontendContent = Get-Content -Path $frontendEnvPath -Raw
$frontendContent = [regex]::Replace(
  $frontendContent,
  "googleClientId:\s*'[^']*'",
  "googleClientId: '$ClientId'"
)
Set-Content -Path $frontendEnvPath -Value $frontendContent

$backendContent = Get-Content -Path $backendEnvPath -Raw
$backendContent = [regex]::Replace(
  $backendContent,
  "GOOGLE_CLIENT_ID=.*",
  "GOOGLE_CLIENT_ID=$ClientId"
)
Set-Content -Path $backendEnvPath -Value $backendContent

Write-Output "Google Client ID atualizado no frontend e backend."
