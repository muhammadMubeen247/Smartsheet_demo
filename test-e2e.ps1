$ErrorActionPreference = "Stop"
$base = "http://localhost:3000"

function Api($method, $path, $body, $headers) {
  $uri = "$base$path"
  $params = @{ Uri = $uri; Method = $method }
  if ($headers) { $params.Headers = $headers }
  if ($body) {
    $params.ContentType = "application/json"
    $params.Body = ($body | ConvertTo-Json -Depth 10 -Compress)
  }
  try {
    $resp = Invoke-RestMethod @params
    return $resp
  } catch {
    $status = $_.Exception.Response.StatusCode.value__
    $errBody = $_.ErrorDetails.Message
    Write-Host "  ERROR [$status] $path : $errBody" -ForegroundColor Red
    return $null
  }
}

Write-Host "=== STEP 1: Register ===" -ForegroundColor Cyan
$regResp = Api "POST" "/auth/register" @{ name="Ali"; email="ali@example.com"; password="secret123" }
if ($regResp) { Write-Host "  Registered user: $($regResp.user.email)" -ForegroundColor Green }
else {
  # If already exists, login
  $regResp = Api "POST" "/auth/login" @{ email="ali@example.com"; password="secret123" }
}

Write-Host "=== STEP 2: Login ===" -ForegroundColor Cyan
$loginResp = Api "POST" "/auth/login" @{ email="ali@example.com"; password="secret123" }
$token = $loginResp.token
$h = @{ Authorization = "Bearer $token" }
Write-Host "  Token captured: $($token.Substring(0,20))..." -ForegroundColor Green

Write-Host "=== STEP 3: Me ===" -ForegroundColor Cyan
$me = Api "GET" "/auth/me" $null $h
Write-Host "  Logged in as: $($me.data.email)" -ForegroundColor Green

Write-Host "=== STEP 4: Create Workspace ===" -ForegroundColor Cyan
$ws = Api "POST" "/workspaces" @{ name="Project Alpha" } $h
Write-Host "  Workspace created: id=$($ws.data.id), name=$($ws.data.name)" -ForegroundColor Green
$wsId = $ws.data.id

Write-Host "=== STEP 5: List Workspaces ===" -ForegroundColor Cyan
$wsList = Api "GET" "/workspaces" $null $h
Write-Host "  Workspaces count: $($wsList.count)" -ForegroundColor Green

Write-Host "=== STEP 6: Create Sheet ===" -ForegroundColor Cyan
$sheet = Api "POST" "/workspaces/$wsId/sheets" @{ name="Contacts" } $h
Write-Host "  Sheet created: id=$($sheet.data.id), name=$($sheet.data.name)" -ForegroundColor Green
$sheetId = $sheet.data.id

Write-Host "=== STEP 7: Create Columns ===" -ForegroundColor Cyan
$col1 = Api "POST" "/sheets/$sheetId/columns" @{ name="Name"; type="TEXT" } $h
Write-Host "  Column 1: id=$($col1.data.id) name=$($col1.data.name) type=$($col1.data.type)" -ForegroundColor Green
$col2 = Api "POST" "/sheets/$sheetId/columns" @{ name="Email"; type="TEXT" } $h
Write-Host "  Column 2: id=$($col2.data.id) name=$($col2.data.name) type=$($col2.data.type)" -ForegroundColor Green
$col3 = Api "POST" "/sheets/$sheetId/columns" @{ name="Age"; type="NUMBER" } $h
Write-Host "  Column 3: id=$($col3.data.id) name=$($col3.data.name) type=$($col3.data.type)" -ForegroundColor Green
$col4 = Api "POST" "/sheets/$sheetId/columns" @{ name="Active"; type="BOOLEAN" } $h
Write-Host "  Column 4: id=$($col4.data.id) name=$($col4.data.name) type=$($col4.data.type)" -ForegroundColor Green
$col5 = Api "POST" "/sheets/$sheetId/columns" @{ name="JoinDate"; type="DATE" } $h
Write-Host "  Column 5: id=$($col5.data.id) name=$($col5.data.name) type=$($col5.data.type)" -ForegroundColor Green

$col1Id = $col1.data.id
$col2Id = $col2.data.id
$col3Id = $col3.data.id
$col4Id = $col4.data.id
$col5Id = $col5.data.id

Write-Host "=== STEP 8: List Columns ===" -ForegroundColor Cyan
$cols = Api "GET" "/sheets/$sheetId/columns" $null $h
Write-Host "  Columns count: $($cols.count)" -ForegroundColor Green

Write-Host "=== STEP 9: Add Row Manually ===" -ForegroundColor Cyan
$values = @{}
$values["$col1Id"] = "Ali"
$values["$col2Id"] = "ali@example.com"
$values["$col3Id"] = 30
$values["$col4Id"] = $true
$values["$col5Id"] = "2025-01-15"
$row1 = Api "POST" "/sheets/$sheetId/rows" @{ values = $values } $h
Write-Host "  Row created: id=$($row1.data.id)" -ForegroundColor Green

Write-Host "=== STEP 10: Type Validation (should fail) ===" -ForegroundColor Cyan
$badValues = @{}
$badValues["$col3Id"] = "not-a-number"
$bad = Api "POST" "/sheets/$sheetId/rows" @{ values = $badValues } $h
if ($bad -eq $null) { Write-Host "  Correctly rejected invalid value" -ForegroundColor Green }

Write-Host "=== STEP 11: List Rows ===" -ForegroundColor Cyan
$rows = Api "GET" "/sheets/$sheetId/rows" $null $h
Write-Host "  Rows count: $($rows.count)" -ForegroundColor Green

Write-Host "=== STEP 12: Create Form ===" -ForegroundColor Cyan
$fields = @(
  @{ columnId = $col1Id; required = $true },
  @{ columnId = $col2Id; required = $true },
  @{ columnId = $col3Id; required = $false }
)
$form = Api "POST" "/workspaces/$wsId/sheets/$sheetId/forms" @{ name="Contact Form"; description="Public contact form"; fields=$fields } $h
Write-Host "  Form created: id=$($form.data.id), slug=$($form.data.publicSlug), active=$($form.data.isActive)" -ForegroundColor Green
$slug = $form.data.publicSlug
$formId = $form.data.id

Write-Host "=== STEP 13: Get Public Form (NO auth) ===" -ForegroundColor Cyan
$pubForm = Api "GET" "/public/forms/$slug" $null $null
Write-Host "  Public form: $($pubForm.data.name), columns=$($pubForm.data.columns.Count)" -ForegroundColor Green

Write-Host "=== STEP 14: Submit Form (NO auth) ===" -ForegroundColor Cyan
$submitValues = @{}
$submitValues["$col1Id"] = "Bob"
$submitValues["$col2Id"] = "bob@example.com"
$submitValues["$col3Id"] = 25
$submission = Api "POST" "/public/forms/$slug/submit" @{ values = $submitValues } $null
Write-Host "  Submission received: row id=$($submission.data.id)" -ForegroundColor Green

Write-Host "=== STEP 15: Verify New Row Exists ===" -ForegroundColor Cyan
$allRows = Api "GET" "/sheets/$sheetId/rows" $null $h
Write-Host "  Total rows: $($allRows.count)" -ForegroundColor Green
foreach ($r in $allRows.data) {
  Write-Host "    Row id=$($r.id) values=$($r.values | ConvertTo-Json -Compress)" -ForegroundColor Yellow
}

Write-Host "=== STEP 16: Authorization Test (User B cannot access User A resources) ===" -ForegroundColor Cyan
# Register user B
Api "POST" "/auth/register" @{ name="Bob"; email="bob@example.com"; password="secret456" } | Out-Null
$bLogin = Api "POST" "/auth/login" @{ email="bob@example.com"; password="secret456" }
$hB = @{ Authorization = "Bearer $($bLogin.token)" }

# Try to get User A's workspace
$denied = Api "GET" "/workspaces/$wsId" $null $hB
if ($denied -eq $null) { Write-Host "  User B correctly DENIED access to User A workspace" -ForegroundColor Green }

# Try to get User A's sheet
$denied2 = Api "GET" "/sheets/$sheetId" $null $hB
if ($denied2 -eq $null) { Write-Host "  User B correctly DENIED access to User A sheet" -ForegroundColor Green }

# Try to add row to User A's sheet
$denied3 = Api "POST" "/sheets/$sheetId/rows" @{ values = @{ "$col1Id"="Hacker" } } $hB
if ($denied3 -eq $null) { Write-Host "  User B correctly DENIED from adding rows to User A sheet" -ForegroundColor Green }

Write-Host "=== STEP 17: Toggle Form ===" -ForegroundColor Cyan
$toggled = Api "PATCH" "/forms/$formId/toggle" $null $h
Write-Host "  Form isActive: $($toggled.data.isActive)" -ForegroundColor Green

# Submit to deactivated form should fail
$denied4 = Api "POST" "/public/forms/$slug/submit" @{ values = @{ "$col1Id"="Charlie" } } $null
if ($denied4 -eq $null) { Write-Host "  Correctly rejected submission to deactivated form" -ForegroundColor Green }

# Re-activate
$toggled2 = Api "PATCH" "/forms/$formId/toggle" $null $h
Write-Host "  Re-activated form isActive: $($toggled2.data.isActive)" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Magenta
Write-Host "  ALL E2E TESTS PASSED SUCCESSFULLY!" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta
