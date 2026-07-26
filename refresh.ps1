$ErrorActionPreference = "Stop"
$env:PATH = "C:\Program Files\Git\cmd;C:\Program Files\GitHub CLI;$env:PATH"
$GH = "C:\Program Files\GitHub CLI\gh.exe"
$USERNAME = "marceli1404"

$repos = @(
  @{ owner = "marceli1404"; name = "swr"; fork = $null; type = "vercel" },
  @{ owner = "marceli1404"; name = "satori"; fork = $null; type = "vercel" },
  @{ owner = "marceli1404"; name = "ai-sdk-workspace"; fork = $null; type = "vercel" },
  @{ owner = "vercel"; name = "swr"; fork = "marceli1404/swr"; type = $null },
  @{ owner = "vercel"; name = "satori"; fork = "marceli1404/satori"; type = $null },
  @{ owner = "vercel"; name = "ai"; fork = "marceli1404/ai-sdk-workspace"; type = $null },
  @{ owner = "marceli1404"; name = "live-windows-control"; fork = $null; type = "community" },
  @{ owner = "marceli1404"; name = "OpenClaw-Puppet"; fork = $null; type = "community" },
  @{ owner = "PV-Bhat"; name = "vibe-check-mcp-server"; fork = "marceli1404/vibe-check-mcp-server"; type = $null },
  @{ owner = "jonesphillip"; name = "weft"; fork = "marceli1404/weft"; type = $null },
  @{ owner = "srikanth235"; name = "privy"; fork = "marceli1404/privy"; type = $null },
  @{ owner = "JKHeadley"; name = "instar"; fork = "marceli1404/instar"; type = $null },
  @{ owner = "akemmanuel"; name = "OpenGUI"; fork = "marceli1404/OpenGUI"; type = $null },
  @{ owner = "Metabuilder-Labs"; name = "tokenjam"; fork = "marceli1404/tokenjam"; type = $null },
  @{ owner = "Frappucc1no"; name = "recall-loom"; fork = "marceli1404/recall-loom"; type = $null },
  @{ owner = "marceli1404"; name = "kana-dojo"; fork = $null; type = "collaborator" },
  @{ owner = "marceli1404"; name = "learnhouse"; fork = $null; type = "collaborator" },
  @{ owner = "marceli1404"; name = "aider-desk"; fork = $null; type = "collaborator" },
  @{ owner = "marceli1404"; name = "OmniRoute"; fork = $null; type = "collaborator" },
  @{ owner = "lingdojo"; name = "kana-dojo"; fork = "marceli1404/kana-dojo"; type = $null },
  @{ owner = "learnhouse"; name = "learnhouse"; fork = "marceli1404/learnhouse"; type = $null },
  @{ owner = "hotovo"; name = "aider-desk"; fork = "marceli1404/aider-desk"; type = $null },
  @{ owner = "diegosouzapw"; name = "OmniRoute"; fork = "marceli1404/OmniRoute"; type = $null },
  @{ owner = "marceli1404"; name = "trigger.dev"; fork = $null; type = "community" },
  @{ owner = "triggerdotdev"; name = "trigger.dev"; fork = "marceli1404/trigger.dev"; type = $null },
  @{ owner = "marceli1404"; name = "gitify"; fork = $null; type = "community" },
  @{ owner = "gitify-app"; name = "gitify"; fork = "marceli1404/gitify"; type = $null }
)

$allPRs = @()
$generatedAt = (Get-Date).ToUniversalTime().ToString("o")

foreach ($repo in $repos) {
  $repoSlug = "$($repo.owner)/$($repo.name)"
  Write-Host "Fetching: $repoSlug" -ForegroundColor Cyan
  try {
    $page = 1
    $repoPRs = @()
    do {
      $json = & $GH api "search/issues?q=repo:$repoSlug+author:$USERNAME+type:pr&per_page=100&page=$page"
      if ($LASTEXITCODE -ne 0) { break }
      $result = $json | ConvertFrom-Json
      $repoPRs += $result.items
      $page++
    } while ($result.items.Count -eq 100 -and $page -le 3)

    foreach ($pr in $repoPRs) {
      # Normalize search API results to match pulls API format
      if ($pr.pull_request.merged_at) { $pr | Add-Member -NotePropertyName "merged_at" -NotePropertyValue $pr.pull_request.merged_at }
      if (!$pr.pull_request.merged_at -and $pr.state -eq "closed") { $pr | Add-Member -NotePropertyName "merged_at" -NotePropertyValue $null }

      $allPRs += @{
        pr = $pr
        upstreamRepo = if ($repo.fork) { $repo.fork } else { $repoSlug }
        type = $repo.type
      }
    }
    Write-Host "  Found $($repoPRs.Count) PR(s)" -ForegroundColor DarkGray
  } catch {
    Write-Host "  Error: $_" -ForegroundColor Red
  }
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$outPath = Join-Path $scriptDir "prs.json"
@{
  generated_at = $generatedAt
  prs = $allPRs
} | ConvertTo-Json -Depth 10 | Set-Content -Path $outPath -Encoding UTF8
Write-Host "`nDone! $($allPRs.Count) PRs saved to prs.json" -ForegroundColor Green
