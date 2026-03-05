# Run this AFTER completing: gh auth login (open https://github.com/login/device, enter code, authorize)
# Then run: .\scripts\setup-github-and-vercel.ps1

Set-Location $PSScriptRoot\..

Write-Host "`n=== Creating GitHub repo and pushing ===" -ForegroundColor Cyan
gh repo create iamhimanshu26/MyJapaneseJourney --public --source=. --remote=origin --push

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n=== Connecting Vercel to GitHub ===" -ForegroundColor Cyan
    echo y | vercel git connect https://github.com/iamhimanshu26/MyJapaneseJourney
    Write-Host "`nDone! My Japanese Journey is on GitHub and connected to Vercel." -ForegroundColor Green
} else {
    Write-Host "`nGitHub repo create failed. Make sure you've completed: gh auth login" -ForegroundColor Yellow
}
