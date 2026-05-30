# Scalability Phases

Dokumen ini memecah perbaikan Bahann POS ke fase yang bisa dieksekusi bertahap tanpa mengganggu jalur transaksi utama.

## Phase 1 - Foundation Replay

Target:
- memastikan replay offline benar-benar bisa masuk ke server
- menyamakan jalur online dan offline untuk pencatatan sales harian
- menjaga tenant boundary sebelum data masuk ke storage

Perubahan:
- tambah endpoint `sales.recordOffline`
- ganti replay offline agar memakai tRPC client, bukan fetch manual ke endpoint
- pertahankan validasi tenant di jalur sales

Status:
- complete

## Phase 2 - Write Path Hardening

Target:
- idempotency untuk transaksi
- pemisahan command transaction dari ringkasan harian
- kurangi read-modify-write di stok saat trafik naik

Status:
- pending

## Phase 3 - Data Access Tuning

Target:
- optimasi query dashboard dan warehouse
- evaluasi indeks, pagination, dan query shape yang paling sering dipakai
- kurangi kerja berat di client POS

Status:
- pending

## Phase 4 - Observability And Load Proof

Target:
- structured logging di jalur transaksi dan sync
- benchmark throughput dan latency p95
- load test untuk outlet tunggal dan multi-outlet

Status:
- pending
