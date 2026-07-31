<#
.SYNOPSIS
  Grava o Google Client ID em todos os arquivos que o consomem.

.DESCRIPTION
  O client ID aparece em QUATRO lugares, cada um lido por um processo diferente.
  Esquecer qualquer um produz uma falha distinta e pouco obvia:

    .env (raiz)                       -> Compose, servico backend-node.
                                         Faltando: o container entra em crash
                                         loop ("GOOGLE_CLIENT_ID ausentes").
    backend-node/.env                 -> `npm run dev` fora do Docker.
    frontend/.../environment.ts       -> `ng serve`.
    frontend/.../environment.prod.ts  -> build de producao (fileReplacements).
                                         Faltando: o botao do Google some no
                                         ambiente Docker e so nele.

  A versao anterior deste script cobria apenas dois desses arquivos - e abortava
  logo no inicio exigindo um backend-node/.env que nao existe no repo (esta no
  .gitignore). Na pratica nao alterava nada. Agora o arquivo e criado a partir
  do .env.example quando ausente.

  Client ID NAO e segredo: ele e publico e vai embutido no bundle do frontend.
  Este fluxo (verificacao de idToken) nao usa client secret em lugar nenhum.

.PARAMETER ClientId
  O ID gerado no Google Cloud Console, terminando em .apps.googleusercontent.com

.EXAMPLE
  pwsh scripts/set-google-client-id.ps1 -ClientId 123-abc.apps.googleusercontent.com
#>
param(
  [Parameter(Mandatory = $true)]
  [string]$ClientId
)

$ErrorActionPreference = 'Stop'

if ($ClientId -notmatch '\.apps\.googleusercontent\.com$') {
  Write-Error "Client ID invalido. Deve terminar com .apps.googleusercontent.com"
  exit 1
}

if ($ClientId -match 'SEU_GOOGLE_CLIENT_ID') {
  Write-Error "Esse e o placeholder, nao um ID real. Gere um no Google Cloud Console."
  exit 1
}

$repoRoot = Split-Path -Parent $PSScriptRoot

# Semeia um arquivo a partir do .example quando ele ainda nao existe. Os .env
# reais estao no .gitignore, entao num clone novo eles simplesmente nao vem.
function Initialize-FromExample {
  param([string]$Path, [string]$ExamplePath)

  if (Test-Path $Path) { return $true }

  if (-not (Test-Path $ExamplePath)) {
    Write-Warning "Ausente e sem modelo: $Path (esperado $ExamplePath)"
    return $false
  }

  Copy-Item -Path $ExamplePath -Destination $Path
  Write-Output "  criado a partir do exemplo: $Path"
  return $true
}

# Substitui via regex e avisa quando o padrao nao casa - o modo de falha que o
# script antigo escondia era exatamente este: gravar o arquivo sem ter trocado
# nada e ainda assim reportar sucesso.
function Set-ClientIdInFile {
  param([string]$Path, [string]$Pattern, [string]$Replacement)

  # -Encoding UTF8 e obrigatorio na LEITURA: o Windows PowerShell 5.1 assume a
  # codepage ANSI para arquivos sem BOM, e os .env/.ts do projeto tem acentos.
  # Sem isso "aplicacao" volta como mojibake e e regravado corrompido.
  $conteudo = Get-Content -Path $Path -Raw -Encoding UTF8
  $novo = [regex]::Replace($conteudo, $Pattern, $Replacement)

  if ($novo -eq $conteudo) {
    if ($conteudo -match [regex]::Escape($ClientId)) {
      Write-Output "  ja atualizado: $Path"
    } else {
      Write-Warning "  padrao nao encontrado em $Path - verifique a mao"
    }
    return
  }

  # Gravacao via .NET, e nao Set-Content: no PowerShell 5.1 "-Encoding utf8"
  # SEMPRE escreve BOM, e um BOM no inicio de um .env faz a primeira chave virar
  # "﻿PORT" para o dotenv. UTF8Encoding($false) grava sem BOM.
  #
  # WriteAllText nao acrescenta quebra de linha, e Get-Content -Raw ja preservou
  # a do arquivo original — sem isso cada execucao adicionaria uma linha vazia.
  [System.IO.File]::WriteAllText($Path, $novo, (New-Object System.Text.UTF8Encoding $false))
  Write-Output "  atualizado: $Path"
}

Write-Output "Gravando Client ID em 4 arquivos..."

# 1. .env da raiz - consumido pelo Compose.
$rootEnv = Join-Path $repoRoot ".env"
if (Initialize-FromExample -Path $rootEnv -ExamplePath (Join-Path $repoRoot ".env.example")) {
  Set-ClientIdInFile -Path $rootEnv -Pattern '(?m)^GOOGLE_CLIENT_ID=.*$' -Replacement "GOOGLE_CLIENT_ID=$ClientId"
}

# 2. backend-node/.env - consumido pelo `npm run dev` standalone.
$nodeEnv = Join-Path $repoRoot "backend-node\.env"
if (Initialize-FromExample -Path $nodeEnv -ExamplePath (Join-Path $repoRoot "backend-node\.env.example")) {
  Set-ClientIdInFile -Path $nodeEnv -Pattern '(?m)^GOOGLE_CLIENT_ID=.*$' -Replacement "GOOGLE_CLIENT_ID=$ClientId"
}

# 3 e 4. Os dois environments do Angular.
foreach ($nome in @("environment.ts", "environment.prod.ts")) {
  $caminho = Join-Path $repoRoot "frontend\src\environments\$nome"
  if (Test-Path $caminho) {
    Set-ClientIdInFile -Path $caminho -Pattern "googleClientId:\s*'[^']*'" -Replacement "googleClientId: '$ClientId'"
  } else {
    Write-Warning "Arquivo nao encontrado: $caminho"
  }
}

Write-Output ""
Write-Output "Pronto. Dois lembretes:"
Write-Output "  - environment.prod.ts e lido em tempo de BUILD:"
Write-Output "      docker compose up --build -d frontend"
Write-Output "  - o side-car so rele o .env ao ser recriado:"
Write-Output "      docker compose up -d backend-node"
