<#
.SYNOPSIS
    Deploys AlphaAnalyzerMCP (Python FastMCP) to Azure App Service.

.DESCRIPTION
    Provisions an Azure resource group, App Service plan, and Web App,
    then deploys the Python MCP server and outputs the SSE endpoint URL
    for use in Copilot Studio.  The Finnhub API key is stored as a secure
    Azure App Setting (FINNHUB_API_KEY) so it is never exposed to callers.

.PARAMETER ResourceGroup
    Azure resource group name. Default: rg-alphaanalyzer-mcp

.PARAMETER AppName
    Azure Web App name (must be globally unique). Default: alphaanalyzer-mcp

.PARAMETER Location
    Azure region. Default: westeurope

.PARAMETER SkuName
    App Service plan SKU. Default: B1

.PARAMETER FinnhubApiKey
    Finnhub API key to store as a secure App Setting.  If omitted the
    existing FINNHUB_API_KEY setting is preserved.

.EXAMPLE
    .\Deploy-AlphaAnalyzerMCP.ps1
    .\Deploy-AlphaAnalyzerMCP.ps1 -AppName "my-mcp-server" -Location "westeurope"
    .\Deploy-AlphaAnalyzerMCP.ps1 -FinnhubApiKey "your_key_here"
#>

param(
    [string]$ResourceGroup = "rg-alphaanalyzer-mcp",
    [string]$AppName = "alphaanalyzer-mcp",
    [string]$Location = "westeurope",
    [string]$SkuName = "B1",
    [string]$FinnhubApiKey = ""
)

$ErrorActionPreference = "Stop"
$rootDir = $PSScriptRoot
$zipPath = Join-Path $rootDir "publish.zip"
$planName = "$AppName-plan"

Write-Host ""
Write-Host "=== AlphaAnalyzerMCP (Python) - Azure Deployment ===" -ForegroundColor Cyan
Write-Host "  Resource Group : $ResourceGroup"
Write-Host "  App Name       : $AppName"
Write-Host "  Location       : $Location"
Write-Host "  SKU            : $SkuName"
Write-Host ""

# Step 1: Verify Azure CLI login
Write-Host "[1/6] Verifying Azure CLI login..." -ForegroundColor Yellow
$account = az account show 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  Not logged in. Launching browser login..." -ForegroundColor Gray
    az login --allow-no-subscriptions
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ERROR: Azure login failed." -ForegroundColor Red
        exit 1
    }
}
$accountInfo = az account show --output json | ConvertFrom-Json
Write-Host "  Logged in as: $($accountInfo.user.name)" -ForegroundColor Green
Write-Host "  Subscription: $($accountInfo.name)" -ForegroundColor Green

# Step 2: Create zip package for deployment
Write-Host "[2/6] Creating deployment package..." -ForegroundColor Yellow
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

# Stage files into a temp directory so the zip preserves the correct
# relative paths (server.py at root, ui/portfolio-dashboard/dist/ nested).
$stageDir = Join-Path $env:TEMP "alphaanalyzer-stage"
if (Test-Path $stageDir) { Remove-Item $stageDir -Recurse -Force }
New-Item -ItemType Directory -Path $stageDir | Out-Null

Copy-Item (Join-Path $rootDir "server.py")        -Destination $stageDir
Copy-Item (Join-Path $rootDir "requirements.txt")  -Destination $stageDir

$distDest = Join-Path $stageDir "ui\portfolio-dashboard\dist"
New-Item -ItemType Directory -Path $distDest -Force | Out-Null
Copy-Item (Join-Path $rootDir "ui\portfolio-dashboard\dist\*") -Destination $distDest -Recurse

Compress-Archive -Path (Join-Path $stageDir "*") -DestinationPath $zipPath -Force
Remove-Item $stageDir -Recurse -Force

$zipSize = [math]::Round((Get-Item $zipPath).Length / 1MB, 2)
Write-Host "  Package: publish.zip ($zipSize MB)" -ForegroundColor Green

# Step 3: Provision Azure resources
Write-Host "[3/6] Provisioning Azure resources..." -ForegroundColor Yellow

# Resource group
$rgExists = az group exists --name $ResourceGroup 2>&1
if ($rgExists -eq "false") {
    Write-Host "  Creating resource group: $ResourceGroup..." -ForegroundColor Gray
    az group create --name $ResourceGroup --location $Location --output none
    Write-Host "  Resource group created." -ForegroundColor Green
} else {
    Write-Host "  Resource group already exists." -ForegroundColor Green
}

# App Service plan
$planExists = az appservice plan show --name $planName --resource-group $ResourceGroup 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  Creating App Service plan: $planName ($SkuName)..." -ForegroundColor Gray
    az appservice plan create --name $planName --resource-group $ResourceGroup --location $Location --sku $SkuName --is-linux --output none
    Write-Host "  App Service plan created." -ForegroundColor Green
} else {
    Write-Host "  App Service plan already exists." -ForegroundColor Green
}

# Web App
$appExists = az webapp show --name $AppName --resource-group $ResourceGroup 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  Creating Web App: $AppName..." -ForegroundColor Gray
    az webapp create --name $AppName --resource-group $ResourceGroup --plan $planName --runtime "PYTHON:3.13" --output none
    Write-Host "  Web App created." -ForegroundColor Green
} else {
    Write-Host "  Web App already exists." -ForegroundColor Green
}

# Step 4: Configure the Web App
Write-Host "[4/6] Configuring Web App..." -ForegroundColor Yellow

# Enable WebSockets (required for SSE transport)
az webapp config set --name $AppName --resource-group $ResourceGroup --web-sockets-enabled true --output none

# Set always-on to keep MCP server responsive
az webapp config set --name $AppName --resource-group $ResourceGroup --always-on true --output none

# Set the startup command for the Python FastMCP server
az webapp config set --name $AppName --resource-group $ResourceGroup --startup-file "python server.py" --output none

# Store the Finnhub API key as a secure App Setting (if provided)
if ($FinnhubApiKey -ne "") {
    Write-Host "  Setting FINNHUB_API_KEY app setting..." -ForegroundColor Gray
    az webapp config appsettings set --name $AppName --resource-group $ResourceGroup --settings "FINNHUB_API_KEY=$FinnhubApiKey" --output none
    Write-Host "  FINNHUB_API_KEY stored securely." -ForegroundColor Green
} else {
    Write-Host "  FINNHUB_API_KEY not provided; existing setting preserved." -ForegroundColor Gray
}

Write-Host "  WebSockets enabled, Always On enabled, startup command set." -ForegroundColor Green

# Step 5: Deploy the package
Write-Host "[5/6] Deploying to Azure..." -ForegroundColor Yellow
az webapp deploy --name $AppName --resource-group $ResourceGroup --src-path $zipPath --type zip --output none
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERROR: Deployment failed." -ForegroundColor Red
    Write-Host "  The package is available at: $zipPath" -ForegroundColor Yellow
    exit 1
}
Write-Host "  Deployment successful." -ForegroundColor Green

# Clean up
Remove-Item $zipPath -Force

# Step 6: Post-deployment verification
Write-Host "[6/6] Verifying deployment..." -ForegroundColor Yellow

# Output results
$appUrl = "https://$AppName.azurewebsites.net"
$sseUrl = "$appUrl/sse"

Write-Host ""
Write-Host "=== Deployment Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Web App URL  : $appUrl" -ForegroundColor White
Write-Host "  MCP SSE URL  : $sseUrl" -ForegroundColor White
Write-Host ""
Write-Host "  Copilot Studio Configuration:" -ForegroundColor Yellow
Write-Host "  1. Open Copilot Studio (https://copilotstudio.microsoft.com)" -ForegroundColor White
Write-Host "  2. Go to Actions > Add an action > MCP Server" -ForegroundColor White
Write-Host "  3. Enter the SSE URL: $sseUrl" -ForegroundColor White
Write-Host "  4. No api_key input needed - the key is stored as an App Setting" -ForegroundColor White
Write-Host ""
