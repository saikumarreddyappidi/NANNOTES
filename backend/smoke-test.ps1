$ErrorActionPreference = 'Stop'

$port = $env:NANNO_PORT
if (-not $port) { $port = '5003' }
$base = "http://localhost:$port/api"

function PostJson($url, $body, $token) {
  $headers = @{}
  if ($token) { $headers['Authorization'] = 'Bearer ' + $token }
  return Invoke-RestMethod -Method Post -Uri $url -Body ($body | ConvertTo-Json -Depth 6) -ContentType 'application/json' -Headers $headers
}
function GetJson($url, $token) {
  $headers = @{}
  if ($token) { $headers['Authorization'] = 'Bearer ' + $token }
  return Invoke-RestMethod -Method Get -Uri $url -Headers $headers
}
function PutJson($url, $body, $token) {
  $headers = @{}
  if ($token) { $headers['Authorization'] = 'Bearer ' + $token }
  return Invoke-RestMethod -Method Put -Uri $url -Body ($body | ConvertTo-Json -Depth 6) -ContentType 'application/json' -Headers $headers
}

# Wait for backend to be available
for ($i = 0; $i -lt 15; $i++) {
  try { $h = Invoke-RestMethod -Method Get -Uri "$base/health"; break } catch { Start-Sleep -Milliseconds 600 }
}

# Register or login staff
try {
  $staffReg = PostJson "$base/auth/register" @{ registrationNumber='STAFF123'; password='pass'; role='staff'; subject='Math' } $null
} catch { $staffReg = $null }
if (-not $staffReg) {
  $staffLogin = PostJson "$base/auth/login" @{ registrationNumber='STAFF123'; password='pass' } $null
} else { $staffLogin = $staffReg }
$staffToken = $staffLogin.token

# Register or login student
try {
  $stuReg = PostJson "$base/auth/register" @{ registrationNumber='STU001'; password='pass'; role='student'; year=1; semester=1; course='CS' } $null
} catch { $stuReg = $null }
if (-not $stuReg) {
  $stuLogin = PostJson "$base/auth/login" @{ registrationNumber='STU001'; password='pass' } $null
} else { $stuLogin = $stuReg }
$stuToken = $stuLogin.token
$stuUser  = $stuLogin.user

# me endpoints
$meStaff = GetJson "$base/auth/me" $staffToken
$meStu   = GetJson "$base/auth/me" $stuToken

# Staff creates notes (shared + private)
$note1 = PostJson "$base/notes" @{ title='Shared Note'; content='Hello students'; tags=@('tag1'); shared=$true } $staffToken
$note2 = PostJson "$base/notes" @{ title='Private Note'; content='Hello self'; tags=@('me'); shared=$false } $staffToken

# Student connects to staff
$connect = PostJson "$base/auth/connect-staff" @{ studentId=$stuUser.id; staffId='STAFF123' } $null

# Student searches and saves shared note
$searchNotes = GetJson "$base/notes/search/STAFF123" $stuToken
$savedNote   = PostJson "$base/notes/save/$($note1._id)" @{} $stuToken
$stuNotes    = GetJson "$base/notes" $stuToken

# Files: staff uploads PPTX; student reads and saves
$pptData = 'data:application/vnd.openxmlformats-officedocument.presentationml.presentation;base64,AA=='
$file1 = PostJson "$base/files/upload" @{ filename='lecture.pptx'; fileData=$pptData; isShared=$true } $staffToken
$stuFiles = GetJson "$base/files" $stuToken
$savedFile = PostJson "$base/files/save/$($file1.id)" @{} $stuToken

# Whiteboard: staff create shared; student list and save
$png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABAAAAAAAgfwAAAABJRU5ErkJggg=='
$wb1 = PostJson "$base/whiteboards" @{ title='Sketch 1'; imageData=$png; isShared=$true } $staffToken
$stuWb = GetJson "$base/whiteboards" $stuToken
$savedWb = PostJson "$base/whiteboards/save/$($wb1.id)" @{} $stuToken

# Summary
$result = [pscustomobject]@{
  meStaff = $meStaff.user.registrationNumber
  meStu   = $meStu.user.registrationNumber
  staffNotes = @($note1.title, $note2.title)
  connectMsg = $connect.message
  searchNotesCount = $searchNotes.notes.Count
  savedNoteOrigin = @{ id=$savedNote.originNoteId; from=$savedNote.originStaffId; subject=$savedNote.originStaffSubject }
  stuNotesCount = $stuNotes.Count
  fileUploaded = $file1.filename
  stuFilesCount = $stuFiles.Count
  savedFileId = $savedFile.id
  whiteboardId = $wb1.id
  stuWbCount = $stuWb.Count
  savedWbId = $savedWb.id
}
$result | ConvertTo-Json -Depth 6
