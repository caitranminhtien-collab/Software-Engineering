# BE05 — Sao lưu và khôi phục database cùng media

## Phạm vi

Sao lưu PostgreSQL bằng pg_dump định dạng custom và toàn bộ
uploads/media bằng ZIP.

Kiểm thử khôi phục vào database mới, trống và thư mục riêng.
Không ghi đè database hoặc media nguồn.

Quy trình dưới đây dùng PowerShell và container local hue-pg-dev.
Cần điều chỉnh tên container và thông tin kết nối khi triển khai
trên môi trường khác.

## Điều kiện trước khi backup

- Dừng backend và các tiến trình có thể ghi database hoặc media.
- Giữ PostgreSQL hoạt động.
- Duy trì trạng thái dừng ghi cho đến khi hoàn thành backup
  và ghi nhận số liệu nguồn.
- Xác nhận đúng database hue_tourism và thư mục uploads/media.
- Lưu backup ngoài repository.
- Không commit dump, media, mật khẩu hoặc .env.

pg_dump tạo snapshot nhất quán cho database.
Việc dừng ghi giúp đồng bộ snapshot database với bản sao media.

## Tạo bộ backup

Chạy tại thư mục gốc repository:

```powershell
$stamp = Get-Date -Format "yyyyMMdd-HHmmss-fff"
$backupDir = Join-Path $env:USERPROFILE "Documents\HueGuideBackups\$stamp"
$uploadsRoot = (Resolve-Path ".\uploads").Path
$mediaRoot = (Resolve-Path ".\uploads\media").Path
$containerDump = "/tmp/hue-$stamp.dump"

New-Item -ItemType Directory -Path $backupDir -ErrorAction Stop |
    Out-Null

$manifest = @(
    Get-ChildItem -LiteralPath $mediaRoot -Recurse -File |
        Sort-Object FullName |
        ForEach-Object {
            [PSCustomObject]@{
                path = $_.FullName.Substring(
                    $uploadsRoot.Length + 1
                ).Replace("\", "/")
                bytes = $_.Length
                sha256 = (
                    Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256
                ).Hash
            }
        }
)

ConvertTo-Json -InputObject $manifest -Depth 4 |
    Set-Content -Encoding UTF8 "$backupDir\media-manifest.json"

docker exec hue-pg-dev pg_dump -U postgres -d hue_tourism -Fc --no-owner --no-acl -f $containerDump

if ($LASTEXITCODE -ne 0) {
    throw "pg_dump failed"
}

docker cp "hue-pg-dev:$containerDump" "$backupDir\hue_tourism.dump"

if ($LASTEXITCODE -ne 0) {
    throw "Copy dump failed"
}

Compress-Archive -LiteralPath $mediaRoot -DestinationPath "$backupDir\media.zip" -ErrorAction Stop

$checksums = foreach ($name in @(
    "hue_tourism.dump",
    "media.zip",
    "media-manifest.json"
)) {
    [PSCustomObject]@{
        file = $name
        sha256 = (
            Get-FileHash -LiteralPath (
                Join-Path $backupDir $name
            ) -Algorithm SHA256
        ).Hash
    }
}

ConvertTo-Json -InputObject @($checksums) -Depth 4 |
    Set-Content -Encoding UTF8 "$backupDir\checksums.json"
```

Không chuyển hướng output nhị phân của pg_dump bằng `>`
trong PowerShell; ghi file trong container rồi docker cp.

## Ghi nhận số dòng nguồn

Dùng cùng truy vấn dưới đây cho database nguồn và database restore:

```powershell
$countSql = @'
SELECT format(
    'SELECT %L AS table_name, COUNT(*) AS row_count FROM %I.%I;',
    tablename, schemaname, tablename
)
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename
\gexec
'@

$sourceCounts = $countSql |
    docker exec -i hue-pg-dev psql -X -A -t -F "," -P pager=off -v ON_ERROR_STOP=1 -U postgres -d hue_tourism

if ($LASTEXITCODE -ne 0) {
    throw "Read source counts failed"
}

$sourceCounts |
    Set-Content -Encoding UTF8 "$backupDir\source-table-counts.csv"
```

## Khôi phục

1. Kiểm tra lại SHA-256 của ba file trong checksums.json.
   Dừng nếu có checksum không khớp.
2. Tạo database mới, không dùng tên database nguồn.
3. Restore dump trong một transaction.
4. Giải nén media vào thư mục mới, không dùng uploads nguồn.

```powershell
$restoreDb = "hue_restore_" + (Get-Date -Format "yyyyMMdd_HHmmss")
$restoreDump = "/tmp/$restoreDb.dump"
$restoreRoot = Join-Path $backupDir "restore-check"

docker exec hue-pg-dev createdb -U postgres -O hue_app $restoreDb

if ($LASTEXITCODE -ne 0) {
    throw "Create restore database failed"
}

docker cp "$backupDir\hue_tourism.dump" "hue-pg-dev:$restoreDump"

if ($LASTEXITCODE -ne 0) {
    throw "Copy restore dump failed"
}

docker exec hue-pg-dev pg_restore -U postgres -d $restoreDb --role=hue_app --no-owner --no-privileges --exit-on-error --single-transaction $restoreDump

if ($LASTEXITCODE -ne 0) {
    throw "Restore failed"
}

if (Test-Path -LiteralPath $restoreRoot) {
    throw "Restore media folder already exists"
}

Expand-Archive -LiteralPath "$backupDir\media.zip" -DestinationPath $restoreRoot -ErrorAction Stop
```

Role hue_app phải tồn tại trước khi restore.
Dump này không dùng để khôi phục các role hoặc quyền cấp toàn cụm.

## Tiêu chí kiểm tra sau restore

- Toàn bộ tên bảng và COUNT(*) khớp số liệu nguồn.
- Danh sách file khớp media-manifest.json, không thiếu hoặc thừa.
- Kích thước và SHA-256 từng file khớp manifest.
- Mỗi bản ghi media local trỏ đến file có thật trong thư mục restore.
- URL tuyệt đối chỉ được ánh xạ về local khi thuộc origin cũ đã xác định.
- Ghi nhận file không có bản ghi; không tự động xóa.
- Chỉ cân nhắc dùng bản khôi phục sau khi kiểm tra đạt.
- Không chạy lại migration khởi tạo trên database vừa restore từ dump.

## Biên bản kiểm tra local — 30/10/2026

- Commit nguồn: 1ac9ee1; branch ops/admin-be05.
- Backup: 20261030-083513-267.
- Database nguồn: hue_tourism.
- Database restore: hue_restore_20261030_083718.
- Checksum dump, ZIP và manifest: PASS.
- Restore vào database mới: PASS.
- Số dòng của đủ 13 bảng: khớp nguồn.
- Đủ 13 file media: tên, kích thước và SHA-256 khớp.
- Đủ 12 bản ghi media có file tương ứng.
- File không có bản ghi, vẫn được bảo toàn:
  media/3/0e7a9999-7583-4186-a3a4-a8c04921f5a3.png.

### Số dòng nguồn và restore

| Bảng | Số dòng |
|---|---:|
| attraction_localization_revisions | 15 |
| attraction_localizations | 77 |
| attraction_media | 12 |
| attractions | 11 |
| audio_plays | 0 |
| chat_messages | 0 |
| knowledge_chunks | 20 |
| knowledge_documents | 10 |
| route_stops | 9 |
| routes | 3 |
| staff_accounts | 5 |
| visitor_events | 0 |
| visitor_sessions | 11 |

## Giới hạn và vận hành

- Đã kiểm tra local; chưa diễn tập phục hồi trên staging.
- Số dòng khớp không chứng minh mọi giá trị trong bảng giống nhau.
- Chưa chạy ứng dụng trỏ vào database và thư mục media restore.
- Redis session không nằm trong bộ backup này.
  Nếu Redis mất, người dùng cần đăng nhập lại.
- Backup có dữ liệu tài khoản đã băm mật khẩu:
  hạn chế quyền đọc và mã hóa khi lưu/chuyển sang nơi khác.
- Cần thống nhất lịch backup, thời hạn giữ bản và nơi lưu
  ngoài máy chủ khi triển khai staging.