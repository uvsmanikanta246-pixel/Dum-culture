$env:PATH = "$env:LOCALAPPDATA\Programs\Git\cmd;$env:PATH"

# Remove any temporary helper scripts before committing
Remove-Item -Path "git_commit.ps1", "setup_git.ps1" -Force -ErrorAction SilentlyContinue

git init
git branch -M main

$user = git config user.name
if (-not $user) {
    git config user.name "uvsmanikanta246-pixel"
    git config user.email "uvsmanikanta246@gmail.com"
}

# Set remote origin
git remote remove origin 2>$null
git remote add origin "https://github.com/uvsmanikanta246-pixel/Dum-culture.git"

git add .
git commit -m "Initial commit: DUM CULTURE WhatsApp Food Ordering Web App with Lightfall background and interactive story"

Write-Host "Pushing to https://github.com/uvsmanikanta246-pixel/Dum-culture.git..."
git push -u origin main
