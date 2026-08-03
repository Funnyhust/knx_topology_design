# KNX Topology Evidence

Thư mục này lưu bằng chứng trình duyệt theo phase.

## Phase N1

- Kịch bản: Add Area → kiểm tra Area/Coupler/Main Line/2 structural edge →
  Undo → Redo → save/reload.
- Ảnh Add Area production: `phase-n1-production-add-area.png`.
- Ảnh hai Area, Area đầu giữ nguyên: `phase-n1-production-two-areas-current.png`.
- Video Add Area → Undo → Redo: `phase-n1-browser-add-area-undo-redo.mp4`.
- Kết quả runtime: đúng 1 Area + 1 Main Line + 1 Area Coupler + 2 structural
  edge; Undo về 0; Redo phục hồi nguyên UUID; zoom giữ 100%.
- Trạng thái: đã có bằng chứng kỹ thuật, chờ người dùng nghiệm thu.

## Phase N2–N5

- Ảnh production Standard Mode: `standard-mode-production-manual-devices.png`.
- Video production Add Area → Add Line → Placement Preview → đặt Device → bật
  Connect Bus: `standard-mode-n2-n5-browser.mp4`.
- Các frame gốc của video: `standard-mode-video-frames/01.png` đến `06.png`.
- Nội dung ảnh: một Area, một Secondary Line compact, hai Device được đặt thủ
  công, cả hai ở trạng thái “Not connected”, không có dây Device tự sinh; toolbar
  có `Connect Bus` riêng và Properties có action `Connect Bus`.
- Runtime automation đã kiểm tra:
  - Add Line có bus stub 64 px.
  - Add Device tạo preview trước, chỉ commit sau click.
  - Hai Device mới đều `manual`, `PlacedUnconnected`, 0 edge.
  - Device cũ giữ nguyên geometry khi đặt Device tiếp theo.
  - Connect/Undo Connect/Delete edge/Undo Delete giữ nguyên Domain Device.
  - Nối sai Line bị từ chối và không đổi parent.
  - Zoom giữ 100% trong toàn bộ Add/Place/Connect.
- Trạng thái: hoàn thành kỹ thuật, chờ người dùng nghiệm thu thực tế.
