param(
    [string]$EnvPath = ".env",
    [switch]$SkipTmdb,
    [switch]$SkipAnidb,
    [switch]$SkipTvdb
)

$ErrorActionPreference = "Stop"

function Read-DotEnv {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Env file not found: $Path"
    }

    $vars = @{}
    Get-Content -LiteralPath $Path | ForEach-Object {
        if ($_ -match '^\s*#' -or $_ -notmatch '=') { return }
        $parts = $_ -split '=', 2
        $key = $parts[0].Trim()
        $value = $parts[1]
        if ($key) { $vars[$key] = $value }
    }
    return $vars
}

function Update-DotEnvValue {
    param(
        [string]$Path,
        [hashtable]$Values
    )

    $lines = @(Get-Content -LiteralPath $Path)
    $seen = @{}
    $newLines = foreach ($line in $lines) {
        if ($line -match '^([^#=]+)=') {
            $key = $matches[1].Trim()
            if ($Values.ContainsKey($key)) {
                $seen[$key] = $true
                "$key=$($Values[$key])"
            } else {
                $line
            }
        } else {
            $line
        }
    }

    foreach ($key in $Values.Keys) {
        if (-not $seen.ContainsKey($key)) {
            $newLines += "$key=$($Values[$key])"
        }
    }

    Set-Content -LiteralPath $Path -Value $newLines -Encoding utf8
}

$vars = Read-DotEnv -Path $EnvPath

if (-not $SkipTmdb) {
    if (-not $vars["TMDB_READ_ACCESS_TOKEN"]) {
        Write-Output "tmdb=skipped missing TMDB_READ_ACCESS_TOKEN"
    } else {
        $headers = @{
            Authorization = "Bearer $($vars["TMDB_READ_ACCESS_TOKEN"])"
            Accept = "application/json"
        }
        $tmdb = Invoke-RestMethod -Uri "https://api.themoviedb.org/3/configuration" -Headers $headers -Method Get
        Write-Output "tmdb=ok image_base=$($tmdb.images.secure_base_url)"
    }
}

if (-not $SkipAnidb) {
    $client = $vars["ANIDB_CLIENT"]
    $clientver = $vars["ANIDB_CLIENT_VERSION"]
    $protover = $vars["ANIDB_PROTO_VERSION"]
    if (-not $client -or -not $clientver -or -not $protover) {
        Write-Output "anidb=skipped missing ANIDB_CLIENT/ANIDB_CLIENT_VERSION/ANIDB_PROTO_VERSION"
    } else {
        $uri = "http://api.anidb.net:9001/httpapi?client=$client&clientver=$clientver&protover=$protover&request=anime&aid=1"
        $anidb = Invoke-WebRequest -Uri $uri -UseBasicParsing
        if ($anidb.StatusCode -eq 200 -and $anidb.Content -match '<anime id="1"') {
            Write-Output "anidb=ok aid=1"
        } else {
            throw "AniDB test returned an unexpected response"
        }
    }
}

if (-not $SkipTvdb) {
    if (-not $vars["TVDB_API_KEY"]) {
        Write-Output "tvdb=skipped missing TVDB_API_KEY"
    } else {
        $token = $vars["TVDB_TOKEN"]
        $expiresRaw = $vars["TVDB_TOKEN_EXPIRES_AT"]
        $needsLogin = $true

        if ($token -and $expiresRaw) {
            try {
                $expires = [datetime]::Parse($expiresRaw).ToUniversalTime()
                $needsLogin = $expires -lt (Get-Date).ToUniversalTime().AddDays(1)
            } catch {
                $needsLogin = $true
            }
        }

        if ($needsLogin) {
            $bodyMap = @{ apikey = $vars["TVDB_API_KEY"] }
            if ($vars["TVDB_PIN"]) { $bodyMap["pin"] = $vars["TVDB_PIN"] }
            $body = $bodyMap | ConvertTo-Json -Compress
            $login = Invoke-RestMethod -Uri "https://api4.thetvdb.com/v4/login" -Method Post -ContentType "application/json" -Body $body
            if ($login.status -ne "success" -or -not $login.data.token) {
                throw "TVDB login did not return a token"
            }
            $token = $login.data.token
            $expiresRaw = (Get-Date).ToUniversalTime().AddDays(30).ToString("yyyy-MM-ddTHH:mm:ssZ")
            Update-DotEnvValue -Path $EnvPath -Values @{
                TVDB_TOKEN = $token
                TVDB_TOKEN_EXPIRES_AT = $expiresRaw
            }
        }

        $headers = @{
            Authorization = "Bearer $token"
            Accept = "application/json"
        }
        $tvdb = Invoke-RestMethod -Uri "https://api4.thetvdb.com/v4/search?query=Frieren&type=series" -Headers $headers -Method Get
        if ($tvdb.status -ne "success") {
            throw "TVDB search test failed"
        }
        Write-Output "tvdb=ok token_saved=true expires_at=$expiresRaw results=$($tvdb.data.Count)"
    }
}
