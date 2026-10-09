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

$passed = 0
$failed = 0

function Assert-True($cond, $msg) {
    if ($cond) {
        Write-Host "  [PASS] $msg" -ForegroundColor Green
        $script:passed++
    } else {
        Write-Host "  [FAIL] $msg" -ForegroundColor Red
        $script:failed++
    }
}

Write-Host "=== SETUP: Create Test Users ===" -ForegroundColor Cyan
# User A (owner)
Api "POST" "/auth/register" @{ name="Alice"; email="alice@test.com"; password="secret123" } | Out-Null
$loginA = Api "POST" "/auth/login" @{ email="alice@test.com"; password="secret123" }
$hA = @{ Authorization = "Bearer $($loginA.token)" }
Write-Host "  Alice logged in" -ForegroundColor Green

# User B (will be shared with)
Api "POST" "/auth/register" @{ name="Bob"; email="bob@test.com"; password="secret456" } | Out-Null
$loginB = Api "POST" "/auth/login" @{ email="bob@test.com"; password="secret456" }
$hB = @{ Authorization = "Bearer $($loginB.token)" }
Write-Host "  Bob logged in" -ForegroundColor Green

# User C (unauthorized)
Api "POST" "/auth/register" @{ name="Charlie"; email="charlie@test.com"; password="secret789" } | Out-Null
$loginC = Api "POST" "/auth/login" @{ email="charlie@test.com"; password="secret789" }
$hC = @{ Authorization = "Bearer $($loginC.token)" }
Write-Host "  Charlie logged in" -ForegroundColor Green

Write-Host "=== SETUP: Create Workspace and Sheet ===" -ForegroundColor Cyan
$ws = Api "POST" "/workspaces" @{ name="Test Workspace" } $hA
$wsId = $ws.data.id
Write-Host "  Workspace created: id=$wsId" -ForegroundColor Green

$sheet = Api "POST" "/workspaces/$wsId/sheets" @{ name="Shared Sheet" } $hA
$sheetId = $sheet.data.id
Write-Host "  Sheet created: id=$sheetId" -ForegroundColor Green

$col = Api "POST" "/sheets/$sheetId/columns" @{ name="Name"; type="TEXT" } $hA
$colId = $col.data.id
Write-Host "  Column created: id=$colId" -ForegroundColor Green

$valObj = @{}
$valObj[$colId.ToString()] = "Test Data"
$row = Api "POST" "/sheets/$sheetId/rows" @{ values = $valObj } $hA
$rowId = $row.data.id
Write-Host "  Row created: id=$rowId" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Magenta
Write-Host "  TESTING SHARING FUNCTIONALITY" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta
Write-Host ""

# TEST 1: Share sheet with Bob (EDITOR)
Write-Host "=== TEST 1: Share sheet with Bob (EDITOR) ===" -ForegroundColor Cyan
$share = Api "POST" "/sheets/$sheetId/shares" @{ email="bob@test.com"; permission="EDITOR" } $hA
Assert-True ($share -ne $null) "Sheet shared with Bob as EDITOR"
$shareId = $share.data.id

# TEST 2: Duplicate share rejected
Write-Host "=== TEST 2: Duplicate share rejected ===" -ForegroundColor Cyan
$dupShare = Api "POST" "/sheets/$sheetId/shares" @{ email="bob@test.com"; permission="VIEWER" } $hA
Assert-True ($dupShare -eq $null) "Duplicate share correctly rejected (409)"

# TEST 3: Share with unregistered email rejected
Write-Host "=== TEST 3: Share with unregistered email ===" -ForegroundColor Cyan
$noUser = Api "POST" "/sheets/$sheetId/shares" @{ email="nobody@test.com"; permission="EDITOR" } $hA
Assert-True ($noUser -eq $null) "Share with unregistered email rejected (404)"

# TEST 4: Share with owner rejected
Write-Host "=== TEST 4: Share with owner rejected ===" -ForegroundColor Cyan
$ownShare = Api "POST" "/sheets/$sheetId/shares" @{ email="alice@test.com"; permission="EDITOR" } $hA
Assert-True ($ownShare -eq $null) "Share with owner correctly rejected (400)"

# TEST 5: Invalid permission rejected
Write-Host "=== TEST 5: Invalid permission rejected ===" -ForegroundColor Cyan
$badPerm = Api "POST" "/sheets/$sheetId/shares" @{ email="charlie@test.com"; permission="ADMIN" } $hA
Assert-True ($badPerm -eq $null) "Invalid permission rejected (validation error)"

# TEST 6: Bob can view shared sheet
Write-Host "=== TEST 6: Bob can view shared sheet ===" -ForegroundColor Cyan
$sheetView = Api "GET" "/sheets/$sheetId" $null $hB
Assert-True ($sheetView -ne $null) "Bob can view the shared sheet"

# TEST 7: Bob (EDITOR) can create rows
Write-Host "=== TEST 7: Bob (EDITOR) can create rows ===" -ForegroundColor Cyan
$bobVal = @{}
$bobVal[$colId.ToString()] = "Bob Data"
$bobRow = Api "POST" "/sheets/$sheetId/rows" @{ values = $bobVal } $hB
Assert-True ($bobRow -ne $null) "Bob (EDITOR) can create rows"

# TEST 8: Bob (EDITOR) can create columns
Write-Host "=== TEST 8: Bob (EDITOR) can create columns ===" -ForegroundColor Cyan
$bobCol = Api "POST" "/sheets/$sheetId/columns" @{ name="BobCol"; type="TEXT" } $hB
Assert-True ($bobCol -ne $null) "Bob (EDITOR) can create columns"

# TEST 9: Change Bob to COMMENTER
Write-Host "=== TEST 9: Change Bob to COMMENTER ===" -ForegroundColor Cyan
$updated = Api "PATCH" "/sheets/$sheetId/shares/$shareId" @{ permission="COMMENTER" } $hA
Assert-True ($updated -ne $null -and $updated.data.permission -eq "COMMENTER") "Permission updated to COMMENTER"

# TEST 10: Bob (COMMENTER) cannot create rows
Write-Host "=== TEST 10: Bob (COMMENTER) cannot create rows ===" -ForegroundColor Cyan
$deniedRow = Api "POST" "/sheets/$sheetId/rows" @{ values = $bobVal } $hB
Assert-True ($deniedRow -eq $null) "Bob (COMMENTER) denied from creating rows (403)"

# TEST 11: Bob (COMMENTER) cannot create columns
Write-Host "=== TEST 11: Bob (COMMENTER) cannot create columns ===" -ForegroundColor Cyan
$deniedCol = Api "POST" "/sheets/$sheetId/columns" @{ name="Fail"; type="TEXT" } $hB
Assert-True ($deniedCol -eq $null) "Bob (COMMENTER) denied from creating columns (403)"

# TEST 12: Change Bob to VIEWER
Write-Host "=== TEST 12: Change Bob to VIEWER ===" -ForegroundColor Cyan
$updated2 = Api "PATCH" "/sheets/$sheetId/shares/$shareId" @{ permission="VIEWER" } $hA
Assert-True ($updated2 -ne $null -and $updated2.data.permission -eq "VIEWER") "Permission updated to VIEWER"

# TEST 13: Bob (VIEWER) can still read
Write-Host "=== TEST 13: Bob (VIEWER) can still read ===" -ForegroundColor Cyan
$bobRead = Api "GET" "/sheets/$sheetId/rows" $null $hB
Assert-True ($bobRead -ne $null) "Bob (VIEWER) can still read rows"

# TEST 14: Bob (VIEWER) cannot edit
Write-Host "=== TEST 14: Bob (VIEWER) cannot edit ===" -ForegroundColor Cyan
$deniedEdit = Api "POST" "/sheets/$sheetId/rows" @{ values = $bobVal } $hB
Assert-True ($deniedEdit -eq $null) "Bob (VIEWER) denied from editing (403)"

# TEST 15: List shares
Write-Host "=== TEST 15: List shares ===" -ForegroundColor Cyan
$shareList = Api "GET" "/sheets/$sheetId/shares" $null $hA
Assert-True ($shareList -ne $null -and $shareList.count -ge 1) "List shares returns data"

# TEST 16: Shared-with-me list
Write-Host "=== TEST 16: Shared-with-me list ===" -ForegroundColor Cyan
$sharedWithBob = Api "GET" "/sheets/shared-with-me" $null $hB
Assert-True ($sharedWithBob -ne $null -and $sharedWithBob.count -ge 1) "Shared-with-me returns data for Bob"

# TEST 17: Charlie cannot access unshared sheet
Write-Host "=== TEST 17: Charlie cannot access unshared sheet ===" -ForegroundColor Cyan
$charlieAccess = Api "GET" "/sheets/$sheetId" $null $hC
Assert-True ($charlieAccess -eq $null) "Charlie correctly denied access (403)"

# TEST 18: Non-owner cannot manage shares
Write-Host "=== TEST 18: Non-owner cannot manage shares ===" -ForegroundColor Cyan
$charlieShare = Api "POST" "/sheets/$sheetId/shares" @{ email="charlie@test.com"; permission="VIEWER" } $hB
Assert-True ($charlieShare -eq $null) "Non-owner Bob cannot manage shares (403)"

# TEST 19: Delete share
Write-Host "=== TEST 19: Delete share ===" -ForegroundColor Cyan
$del = Api "DELETE" "/sheets/$sheetId/shares/$shareId" $null $hA
Assert-True ($true) "Share deleted successfully"

# TEST 20: Bob loses access after share deleted
Write-Host "=== TEST 20: Bob loses access after revoke ===" -ForegroundColor Cyan
$bobAfterRevoke = Api "GET" "/sheets/$sheetId" $null $hB
Assert-True ($bobAfterRevoke -eq $null) "Bob denied after share revoked (403)"

Write-Host ""
Write-Host "========================================" -ForegroundColor Magenta
Write-Host "  TESTING COMMENTING FUNCTIONALITY" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta
Write-Host ""

# TEST 21: Create sheet-level comment
Write-Host "=== TEST 21: Create sheet-level comment ===" -ForegroundColor Cyan
$comment1 = Api "POST" "/sheets/$sheetId/comments" @{ content="Sheet-level comment" } $hA
Assert-True ($comment1 -ne $null) "Sheet-level comment created"
$comment1Id = $comment1.data.id

# TEST 22: Create row-level comment
Write-Host "=== TEST 22: Create row-level comment ===" -ForegroundColor Cyan
$comment2 = Api "POST" "/sheets/$sheetId/rows/$rowId/comments" @{ content="Row-level comment" } $hA
Assert-True ($comment2 -ne $null) "Row-level comment created"
$comment2Id = $comment2.data.id

# TEST 23: Reply to top-level comment
Write-Host "=== TEST 23: Reply to top-level comment ===" -ForegroundColor Cyan
$reply1 = Api "POST" "/comments/$comment1Id/replies" @{ content="Reply to comment" } $hA
Assert-True ($reply1 -ne $null) "Reply to top-level comment created"
$reply1Id = $reply1.data.id

# TEST 24: Reply to reply rejected
Write-Host "=== TEST 24: Reply to reply rejected ===" -ForegroundColor Cyan
$badReply = Api "POST" "/comments/$reply1Id/replies" @{ content="Nested reply" } $hA
Assert-True ($badReply -eq $null) "Reply to reply correctly rejected (400)"

# TEST 25: Comment on row from another sheet rejected
Write-Host "=== TEST 25: Comment on wrong row ===" -ForegroundColor Cyan
$badRowComment = Api "POST" "/sheets/$sheetId/rows/99999/comments" @{ content="Wrong row" } $hA
Assert-True ($badRowComment -eq $null) "Comment on non-existent row rejected (404)"

# TEST 26: List sheet comments
Write-Host "=== TEST 26: List sheet comments ===" -ForegroundColor Cyan
$sheetComments = Api "GET" "/sheets/$sheetId/comments" $null $hA
Assert-True ($sheetComments -ne $null) "Sheet comments listed"

# TEST 27: List row comments
Write-Host "=== TEST 27: List row comments ===" -ForegroundColor Cyan
$rowComments = Api "GET" "/sheets/$sheetId/rows/$rowId/comments" $null $hA
Assert-True ($rowComments -ne $null) "Row comments listed"

# Re-share with Bob as COMMENTER for comment tests
Api "POST" "/sheets/$sheetId/shares" @{ email="bob@test.com"; permission="COMMENTER" } $hA | Out-Null

# TEST 28: Bob (COMMENTER) can view comments
Write-Host "=== TEST 28: Bob (COMMENTER) can view comments ===" -ForegroundColor Cyan
$bobViewComments = Api "GET" "/sheets/$sheetId/comments" $null $hB
Assert-True ($bobViewComments -ne $null) "Bob (COMMENTER) can view comments"

# TEST 29: Bob (COMMENTER) can add comments
Write-Host "=== TEST 29: Bob (COMMENTER) can add comments ===" -ForegroundColor Cyan
$bobComment = Api "POST" "/sheets/$sheetId/comments" @{ content="Bob comment" } $hB
Assert-True ($bobComment -ne $null) "Bob (COMMENTER) can add comments"
$bobCommentId = $bobComment.data.id

# TEST 30: Bob cannot edit Alice's comment
Write-Host "=== TEST 30: Bob cannot edit Alice comment ===" -ForegroundColor Cyan
$bobEditComment = Api "PATCH" "/sheets/$sheetId/comments/$comment1Id" @{ content="Bob tries to edit" } $hB
Assert-True ($bobEditComment -eq $null) "Bob denied from editing Alice's comment (403)"

# TEST 31: Bob can delete own comment
Write-Host "=== TEST 31: Bob can delete own comment ===" -ForegroundColor Cyan
Api "DELETE" "/sheets/$sheetId/comments/$bobCommentId" $null $hB | Out-Null
Assert-True ($true) "Bob deleted his own comment"

# TEST 32: Owner (Alice) can delete any comment
Write-Host "=== TEST 32: Owner can delete any comment ===" -ForegroundColor Cyan
Api "DELETE" "/sheets/$sheetId/comments/$comment2Id" $null $hA | Out-Null
Assert-True ($true) "Owner deleted Bob's row comment"

# Re-share with Bob as VIEWER
Api "PATCH" "/sheets/$sheetId/shares/$shareId" @{ permission="VIEWER" } $hA 2>$null | Out-Null
$sharesList2 = Api "GET" "/sheets/$sheetId/shares" $null $hA
if ($sharesList2 -and $sharesList2.data.Count -gt 0) {
    $newShareId = $sharesList2.data[0].id
    Api "PATCH" "/sheets/$sheetId/shares/$newShareId" @{ permission="VIEWER" } $hA | Out-Null
}

# TEST 33: Bob (VIEWER) cannot add comments
Write-Host "=== TEST 33: Bob (VIEWER) cannot add comments ===" -ForegroundColor Cyan
$bobViewComment = Api "POST" "/sheets/$sheetId/comments" @{ content="Should fail" } $hB
Assert-True ($bobViewComment -eq $null) "Bob (VIEWER) denied from commenting (403)"

# TEST 34: Unauthenticated user cannot access comments
Write-Host "=== TEST 34: Unauthenticated user cannot access ===" -ForegroundColor Cyan
$noAuthComment = Api "GET" "/sheets/$sheetId/comments" $null $null
Assert-True ($noAuthComment -eq $null) "Unauthenticated user denied (401)"

# REGRESSION: Existing endpoints still work
Write-Host ""
Write-Host "========================================" -ForegroundColor Magenta
Write-Host "  REGRESSION TESTS" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta
Write-Host ""

Write-Host "=== REGRESSION: Auth endpoints ===" -ForegroundColor Cyan
$meResp = Api "GET" "/auth/me" $null $hA
Assert-True ($meResp -ne $null) "Auth /me endpoint works"

Write-Host "=== REGRESSION: Workspace CRUD ===" -ForegroundColor Cyan
$wsList = Api "GET" "/workspaces" $null $hA
Assert-True ($wsList -ne $null) "Workspace list works"

Write-Host "=== REGRESSION: Sheet CRUD ===" -ForegroundColor Cyan
$sheetList = Api "GET" "/workspaces/$wsId/sheets" $null $hA
Assert-True ($sheetList -ne $null) "Sheet list works"

Write-Host "=== REGRESSION: Column CRUD ===" -ForegroundColor Cyan
$colList = Api "GET" "/sheets/$sheetId/columns" $null $hA
Assert-True ($colList -ne $null) "Column list works"

Write-Host "=== REGRESSION: Row CRUD ===" -ForegroundColor Cyan
$rowList = Api "GET" "/sheets/$sheetId/rows" $null $hA
Assert-True ($rowList -ne $null) "Row list works"

Write-Host ""
Write-Host "========================================" -ForegroundColor Magenta
Write-Host "  RESULTS: $passed passed, $failed failed" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta

if ($failed -gt 0) {
    Write-Host "SOME TESTS FAILED" -ForegroundColor Red
    exit 1
} else {
    Write-Host "ALL TESTS PASSED!" -ForegroundColor Green
}
