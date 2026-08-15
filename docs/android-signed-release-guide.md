# Panduan Lengkap APK Android Signed — Halo Deck

Dokumen ini menjelaskan alur dari awal untuk membuat **keystore Android**, memasukkan empat **GitHub Actions Secrets**, menjalankan workflow pembuat APK release bertanda tangan digital, mengunduh APK, lalu memasangkannya dengan Halo Deck Desktop Hub. Semua proses build APK berjalan di GitHub Actions; komputer Anda hanya dipakai untuk membuat dan menyimpan keystore secara aman.

> Android mewajibkan APK diberi tanda tangan digital sebelum dapat dipasang atau diperbarui. Karena itu, **jangan pernah membagikan file `.jks`, nilai Base64, atau kata sandi keystore** melalui chat, commit Git, atau tangkapan layar. [1]

## Ringkasan alur

| Tahap | Dilakukan di | Hasil yang diharapkan |
|---|---|---|
| 1. Buat keystore | Komputer Windows Anda | File privat `halo-deck-upload.jks` |
| 2. Ubah ke Base64 | Komputer Windows Anda | Satu teks Base64 untuk GitHub Secret |
| 3. Tambahkan Secrets | GitHub repository `jafit1/Halo-Deck` | Empat secret tersedia untuk workflow |
| 4. Jalankan workflow | GitHub Actions | Artefak `halo-deck-pocket-hub-release-signed` |
| 5. Pasang APK | Ponsel Android | `app-release.apk` terpasang |
| 6. Pairing | Laptop + ponsel pada WiFi sama | QR dipindai dan perangkat terhubung |

## Prasyarat

Anda memerlukan akun GitHub yang memiliki akses **Write/Admin** ke repository `jafit1/Halo-Deck`, koneksi internet sementara untuk GitHub Actions, serta Java Development Kit yang menyediakan perintah `keytool`. Anda tidak memerlukan Flutter atau Android Studio untuk proses build cloud ini. Untuk memastikan `keytool` tersedia, buka **PowerShell** dan jalankan:

```powershell
Get-Command keytool
```

Jika perintah menampilkan baris `CommandType`, `Name`, dan lokasi `Source`, `keytool` sudah dapat digunakan. Jika perintah tidak dikenali, pasang JDK 17 atau gunakan `keytool.exe` dari Android Studio, biasanya berada di folder `jbr\bin` pada instalasi Android Studio. Setelah keystore dibuat, internet tidak lagi diperlukan ketika menggunakan Halo Deck melalui WiFi/LAN lokal.

### Jika Windows menampilkan `keytool is not recognized`

Jangan mengetik teks prompt `PS C:\...>`, `>` atau `>>`; itu hanya penanda dari PowerShell. Bila Android Studio sudah terpasang, jalankan dua perintah berikut terlebih dahulu. Cara ini memakai Java bawaan Android Studio dan tidak membutuhkan perubahan PATH.

```powershell
$keytool = "$env:ProgramFiles\Android\Android Studio\jbr\bin\keytool.exe"
Test-Path $keytool
```

Jika hasilnya `True`, lanjutkan dengan `& $keytool -help`, lalu gunakan bentuk `& $keytool` pada awal perintah pembuatan keystore di langkah 1. Jika hasilnya `False` tetapi `Get-Command keytool` menampilkan sebuah lokasi, Anda sudah dapat memakai `keytool` langsung—`Test-Path keytool` bernilai `False` karena ia hanya mencari file lokal bernama `keytool`, bukan perintah pada PATH. Jika kedua cara tidak menemukan perintah, pasang JDK 17 dari terminal PowerShell dengan `winget install -e --id Microsoft.OpenJDK.17`, tutup PowerShell, buka kembali, lalu verifikasi dengan `Get-Command keytool`. Apabila `winget` tidak tersedia, pasang [Microsoft Build of OpenJDK 17](https://learn.microsoft.com/java/openjdk/download) dengan opsi instalasi default.

## 1. Buat keystore sekali saja

Buka **PowerShell** di Windows. Perintah berikut membuat folder privat di profil Windows, kemudian membuat keystore dan key beralias `halo-deck-upload` dengan masa berlaku sekitar 27 tahun. Ganti nama pada isian sertifikat bila diperlukan, tetapi **jangan ganti alias** kecuali Anda juga menggunakan alias baru tersebut pada secret nanti.

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\HaloDeck-Signing"

keytool -genkeypair -v `
  -keystore "$env:USERPROFILE\HaloDeck-Signing\halo-deck-upload.jks" `
  -alias halo-deck-upload `
  -keyalg RSA `
  -keysize 2048 `
  -validity 10000
```

Saat `keytool` meminta isian, gunakan kata sandi kuat untuk **keystore password**. Untuk memudahkan konfigurasi pertama, gunakan kata sandi yang sama saat diminta **key password**; workflow Halo Deck juga mendukung dua kata sandi yang berbeda. Simpan kedua kata sandi di password manager, lalu buat cadangan file `.jks` yang terenkripsi di lokasi terpisah.

Jika `keytool` selesai menyimpan file dan menampilkan peringatan bahwa **JKS adalah format proprietary**, keystore tetap valid untuk workflow Halo Deck. Jangan menjalankan migrasi ke PKCS12 pada tahap ini; gunakan file `halo-deck-upload.jks` yang baru dibuat secara konsisten untuk semua rilis berikutnya.

> Jangan membuat ulang keystore ketika Anda hendak menerbitkan pembaruan aplikasi. APK pembaruan harus ditandatangani dengan key yang sama agar dapat menggantikan versi yang telah terpasang. [1]

Anda dapat memastikan file dan alias benar dengan perintah ini. Masukkan kata sandi keystore bila diminta.

```powershell
keytool -list -v `
  -keystore "$env:USERPROFILE\HaloDeck-Signing\halo-deck-upload.jks" `
  -alias halo-deck-upload
```

## 2. Salin Base64 ke clipboard

Jangan membuka atau mengedit file `.jks`. Jalankan perintah PowerShell berikut untuk mengonversi byte file langsung menjadi Base64 dan menyalin hasilnya ke clipboard.

```powershell
$jks = "$env:USERPROFILE\HaloDeck-Signing\halo-deck-upload.jks"
$base64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($jks))
Set-Clipboard -Value $base64
"Base64 siap ditempel. Panjang karakter: $($base64.Length)"
```

Jangan menempelkan nilai Base64 ini ke Notepad, dokumen, atau chat. Setelah langkah berikutnya, Anda boleh membersihkan clipboard dengan menjalankan `Set-Clipboard -Value ''`.

## 3. Tambahkan empat GitHub Secrets

Buka halaman berikut saat sudah login ke GitHub: [Settings → Actions secrets untuk Halo Deck](https://github.com/jafit1/Halo-Deck/settings/secrets/actions). Pilih **New repository secret**, masukkan nama dan nilai sesuai tabel, kemudian pilih **Add secret**. Ulangi sampai keempat secret tersimpan. GitHub memang menyimpan secret secara terenkripsi dan tidak menampilkan nilainya kembali setelah tersimpan; pastikan nilai yang ditempel benar. [2]

| Nama secret — harus persis sama | Nilai yang dimasukkan |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | Tempel teks yang ada di clipboard dari langkah 2. Jangan tambahkan tanda kutip atau spasi. |
| `ANDROID_KEY_ALIAS` | `halo-deck-upload` |
| `ANDROID_KEY_PASSWORD` | Kata sandi **key** yang Anda masukkan pada `keytool`. |
| `ANDROID_STORE_PASSWORD` | Kata sandi **keystore** yang Anda masukkan pada `keytool`. |

Workflow `android-release-signed.yml` memeriksa bahwa semua secret terisi, memulihkan file `.jks` dari Base64 hanya di runner GitHub, lalu membangun `app-release.apk`. Secret dirujuk melalui konteks `secrets` dan dipasang sebagai environment variable di workflow, sesuai pola GitHub Actions. [2]

## 4. Jalankan build APK signed di GitHub

Buka [halaman workflow Signed Android Release](https://github.com/jafit1/Halo-Deck/actions/workflows/android-release-signed.yml). Di halaman tersebut, pilih **Run workflow**, pilih branch **`main`**, lalu tekan tombol **Run workflow** sekali lagi. Workflow akan:

1. mengambil source code branch `main`;
2. menyiapkan Flutter 3.35.0 dan proyek Android;
3. memulihkan keystore dari `ANDROID_KEYSTORE_BASE64`;
4. menerapkan konfigurasi signing ke Gradle;
5. membangun APK release bertanda tangan digital; dan
6. mengunggah hasil dengan nama artefak **`halo-deck-pocket-hub-release-signed`**.

Tunggu sampai status workflow berubah menjadi **Success**. Jika workflow gagal, buka langkah yang berwarna merah; bagian **Troubleshooting** di bawah menjelaskan penyebab umum. Anda juga dapat memicu workflow melalui terminal bila GitHub CLI sudah masuk akun dan mempunyai hak kelola repository:

```powershell
gh workflow run android-release-signed.yml --repo jafit1/Halo-Deck --ref main
```

## 5. Unduh dan pasang APK release

Pada halaman workflow yang sukses, gulir ke bagian **Artifacts**, klik **`halo-deck-pocket-hub-release-signed`**, lalu unduh file ZIP. Ekstrak ZIP tersebut hingga mendapatkan file **`app-release.apk`**.

Pindahkan `app-release.apk` ke ponsel Android, misalnya melalui kabel USB, Quick Share, atau penyimpanan lokal. Di ponsel, buka file tersebut dan izinkan aplikasi pembuka file untuk memasang aplikasi dari sumber tersebut jika Android memintanya.

Jika sebelumnya terpasang APK debug Halo Deck, hapus instalasi debug tersebut terlebih dahulu. APK debug dan APK release menggunakan paket yang sama tetapi memiliki sertifikat berbeda; Android akan menolak pembaruan dengan sertifikat yang tidak cocok. Setelah APK release terpasang, Anda dapat menonaktifkan lagi izin “Install unknown apps” pada aplikasi pembuka file.

## 6. Alur penggunaan dari awal sampai terhubung

Pasang **Halo Deck Desktop Hub** dari [Windows installer](https://github.com/jafit1/Halo-Deck/releases/tag/v0.3.0-windows-preview), lalu buka aplikasinya di laptop. Bila Windows Firewall meminta izin jaringan, pilih jaringan **Private** agar ponsel pada WiFi yang sama dapat terhubung. Desktop Hub akan memilih alamat WiFi lokal seperti `192.168.x.x`, bukan alamat Tailscale/VPN, dan menampilkan QR pairing.

Sambungkan laptop serta ponsel ke **WiFi yang sama**; jangan gunakan WiFi tamu yang mengaktifkan client isolation. Buka Halo Deck Pocket Hub dari ponsel, berikan izin kamera, lalu pilih pemindaian QR dan arahkan kamera ke QR pada Desktop Hub. Aplikasi memverifikasi PIN di dalam pairing, menyimpan perangkat terpercaya, dan akan mencoba menyambung kembali otomatis jika WiFi sempat terputus. Setelah status menjadi terhubung, Anda dapat memakai mode **Layar**, **Trackpad**, atau **Jam** tanpa melakukan pairing ulang.

## Troubleshooting

| Gejala | Penyebab umum | Tindakan aman |
|---|---|---|
| `Missing ANDROID_... secret` | Nama secret salah, belum disimpan, atau nilainya kosong. | Periksa keempat nama secara persis, lalu simpan ulang secret terkait. |
| `base64: invalid input` atau build berhenti saat decode | Base64 tidak lengkap atau mengandung karakter tambahan. | Ulangi langkah 2, salin ulang langsung dari clipboard, lalu perbarui `ANDROID_KEYSTORE_BASE64`. |
| Kesalahan “keystore was tampered with” atau password salah | Password key/keystore salah atau tertukar. | Pastikan `ANDROID_KEY_PASSWORD` dan `ANDROID_STORE_PASSWORD` cocok dengan jawaban pada saat menjalankan `keytool`. |
| Gagal memasang APK sebagai pembaruan | Masih ada APK debug dengan sertifikat berbeda. | Copot APK Halo Deck sebelumnya, lalu pasang `app-release.apk` kembali. |
| Ponsel tidak menemukan Desktop Hub | Jaringan berbeda, VPN aktif, firewall memblokir, atau WiFi tamu mengisolasi klien. | Matikan VPN pada laptop untuk uji awal, pastikan keduanya di SSID sama, izinkan Desktop Hub pada Private networks, lalu gunakan QR. |

## Checklist akhir

- [ ] File `halo-deck-upload.jks` tersimpan aman dan dibackup terenkripsi, di luar repository.
- [ ] Keempat GitHub Secrets muncul dengan nama yang tepat pada halaman Settings → Secrets and variables → Actions.
- [ ] Workflow `android-release-signed.yml` pada branch `main` berstatus **Success**.
- [ ] Artefak `halo-deck-pocket-hub-release-signed` telah diunduh dan `app-release.apk` berhasil dipasang.
- [ ] Laptop dan ponsel berada pada WiFi yang sama, dan QR Desktop Hub berhasil dipindai.

## References

[1]: https://developer.android.com/studio/publish/app-signing "Android Developers — Sign your app"
[2]: https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions "GitHub Docs — Using secrets in GitHub Actions"
