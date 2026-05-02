# Chandra app — one-command build + commit + push helper.
# Usage:  .\push-changes.ps1 "your commit message"
# If no message given, you'll be prompted.

param(
    [string]$Message
)

$ErrorActionPreference = "Stop"

# Move to the script's directory so it works no matter where you call it from.
Set-Location -Path $PSScriptRoot

Write-Host ""
Write-Host "==> Chandra push helper" -ForegroundColor Cyan
Write-Host ""

# 1. Show what's changed before doing anything.
Write-Host "Changed files:" -ForegroundColor Yellow
git status --short
Write-Host ""

$changes = git status --porcelain
if (-not $changes) {
    Write-Host "Nothing to commit. Working tree clean." -ForegroundColor Green
    exit 0
}

# 2. Get commit message if not provided.
if (-not $Message) {
    $Message = Read-Host "Commit message"
    if (-not $Message) {
        Write-Host "Aborted: empty commit message." -ForegroundColor Red
        exit 1
    }
}

# 3. Run the build. Abort on failure so we never push broken code.
Write-Host ""
Write-Host "==> Running npm run build..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Build failed. Nothing was committed or pushed." -ForegroundColor Red
    exit 1
}

# 4. Stage + commit + push.
Write-Host ""
Write-Host "==> Committing and pushing..." -ForegroundColor Cyan
git add -A
git commit -m $Message
if ($LASTEXITCODE -ne 0) {
    Write-Host "Commit failed." -ForegroundColor Red
    exit 1
}

git push
if ($LASTEXITCODE -ne 0) {
    Write-Host "Push failed." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "==> Done. Vercel will redeploy in ~60-90s." -ForegroundColor Green
Write-Host "    Watch at: https://vercel.com/dashboard" -ForegroundColor Gray
Write-Host ""
