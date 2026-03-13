@description('Azure region for all resources')
param location string = resourceGroup().location

@description('Web App name (must be globally unique)')
param appName string

@description('App Service plan SKU')
param skuName string = 'B1'

@description('Finnhub API key (stored as app setting)')
@secure()
param finnhubApiKey string = ''

var planName = '${appName}-plan'

resource appServicePlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: planName
  location: location
  kind: 'linux'
  sku: {
    name: skuName
  }
  properties: {
    reserved: true
  }
}

resource webApp 'Microsoft.Web/sites@2023-12-01' = {
  name: appName
  location: location
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'PYTHON|3.13'
      alwaysOn: true
      webSocketsEnabled: true
      appCommandLine: 'python server.py'
      appSettings: concat(
        [
          {
            name: 'SCM_DO_BUILD_DURING_DEPLOYMENT'
            value: 'true'
          }
        ],
        finnhubApiKey != ''
          ? [
              {
                name: 'FINNHUB_API_KEY'
                value: finnhubApiKey
              }
            ]
          : []
      )
    }
  }
}

output appUrl string = 'https://${webApp.properties.defaultHostName}'
output mcpEndpoint string = 'https://${webApp.properties.defaultHostName}/mcp'
output sseEndpoint string = 'https://${webApp.properties.defaultHostName}/sse'
