param(
  [string]$OutputPath = ""
)

$ErrorActionPreference = "Stop"
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$submissionRoot = Join-Path $projectRoot "competition_submission"
$defaultOutput = Join-Path $submissionRoot "submission-package.zip"
if ([string]::IsNullOrWhiteSpace($OutputPath)) { $OutputPath = $defaultOutput }
$resolvedOutput = [System.IO.Path]::GetFullPath($OutputPath)
$stageRoot = Join-Path $projectRoot "_tmp_submission_package"
$packageRoot = Join-Path $stageRoot "smart-mine-submission"

if ($resolvedOutput -ne [System.IO.Path]::GetFullPath($defaultOutput)) {
  throw "Output path must be: $defaultOutput"
}
if ([System.IO.Path]::GetFullPath($stageRoot) -notlike "$projectRoot*") {
  throw "Temporary directory is outside the project"
}

& node (Join-Path $PSScriptRoot "submission-preflight.mjs") --offline
if ($LASTEXITCODE -ne 0) { throw "Preflight failed; packaging stopped" }

if (Test-Path -LiteralPath $stageRoot) { Remove-Item -LiteralPath $stageRoot -Recurse -Force }
New-Item -ItemType Directory -Path $packageRoot | Out-Null

Get-ChildItem -LiteralPath $submissionRoot | Where-Object { $_.Extension -ne ".zip" } | ForEach-Object {
  Copy-Item -LiteralPath $_.FullName -Destination $packageRoot -Recurse
}

$sourceRoot = Join-Path $packageRoot "06-source"
New-Item -ItemType Directory -Path $sourceRoot | Out-Null
$sourceItems = @("css", "data", "images", "js", "server", "supabase", "tests", "admin.html", "index.html", "login.html", "server.js", "package.json", "package-lock.json", "render.yaml", "vercel.json", "README.md", "ASSET_LICENSES.md")
foreach ($item in $sourceItems) {
  Copy-Item -LiteralPath (Join-Path $projectRoot $item) -Destination $sourceRoot -Recurse
}

$assetRoot = Join-Path $sourceRoot "assets"
New-Item -ItemType Directory -Path $assetRoot | Out-Null
Copy-Item -LiteralPath (Join-Path $projectRoot "assets\textures") -Destination $assetRoot -Recurse
New-Item -ItemType Directory -Path (Join-Path $assetRoot "hdri") | Out-Null
Copy-Item -LiteralPath (Join-Path $projectRoot "assets\hdri\quarry_02_4k.hdr") -Destination (Join-Path $assetRoot "hdri")
$modelRoot = Join-Path $assetRoot "models"
New-Item -ItemType Directory -Path $modelRoot | Out-Null
Copy-Item -LiteralPath (Join-Path $projectRoot "assets\models\ATTRIBUTIONS.md") -Destination $modelRoot
Get-ChildItem -LiteralPath (Join-Path $projectRoot "assets\models") -Directory | ForEach-Object {
  $target = Join-Path $modelRoot $_.Name
  New-Item -ItemType Directory -Path $target | Out-Null
  Copy-Item -LiteralPath (Join-Path $_.FullName "scene.optimized.glb") -Destination $target
  Copy-Item -LiteralPath (Join-Path $_.FullName "license.txt") -Destination $target
}

$apiRoot = Join-Path $packageRoot "07-api-docs"
New-Item -ItemType Directory -Path $apiRoot | Out-Null
Copy-Item -LiteralPath (Join-Path $projectRoot "docs\api\roof-risk-api-v1.md") -Destination $apiRoot

if (Test-Path -LiteralPath $resolvedOutput) { Remove-Item -LiteralPath $resolvedOutput -Force }
Compress-Archive -LiteralPath $packageRoot -DestinationPath $resolvedOutput -CompressionLevel Optimal
Remove-Item -LiteralPath $stageRoot -Recurse -Force
Write-Output "Submission package created: $resolvedOutput"
