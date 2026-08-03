# KNX Topology Validation Report

## Phase N1 — Structural Add Area

Trạng thái: Đã kiểm tra kỹ thuật; chờ người dùng nghiệm thu.

| Kiểm tra | Trạng thái |
|---|---|
| JavaScript syntax | Đạt |
| KNX Area Layout unit tests | Đạt |
| Add Area browser smoke | Đạt: 1 Area, 1 Main Line, 1 Area Coupler, 2 structural edge |
| Area cũ không đổi khi Add Area kế tiếp | Đạt: AreaLayout trước/sau giống nhau |
| Zoom/selection | Đạt: scale 1.0; Area mới được chọn |
| Undo/Redo Add Area trên browser | Đạt: Undo xóa trọn; Redo giữ UUID và selection |
| Save/reload stable ID và connector | Chưa kiểm tra trong N1 browser run |
| Video bằng chứng | Đạt |

Phát sinh: build Ant báo thiếu đầu ra `stencils.min.js` ở bước `merge` do đường
dẫn legacy, nhưng target `app` vẫn `BUILD SUCCESSFUL`; `app.min.js` mới qua syntax
check và browser production test. Không phát hiện thay đổi ngoài phạm vi N1.

## Phase N2–N5 — Standard KNX Mode

Trạng thái: Đã kiểm tra kỹ thuật; chờ người dùng nghiệm thu.

| Acceptance/kiểm tra | Kết quả |
|---|---|
| Add Line tạo Coupler + feeder + bus stub, không Device | Đạt |
| Empty Line compact | Đạt: bus width 64 px |
| Add Device chưa commit không tạo mxCell | Đạt |
| Click đặt Device | Đạt: manual + PlacedUnconnected + 0 edge |
| Device cũ không đổi vị trí khi đặt Device mới | Đạt |
| Add Device không Fit/Center/đổi zoom | Đạt: scale giữ 1.0 |
| Undo Add Device | Đạt: chỉ Device mới bị xóa |
| Connect Bus là command riêng | Đạt: Undo dây vẫn giữ Device |
| Xóa dây không xóa Device | Đạt |
| Undo xóa dây | Đạt: dây và trạng thái Connected được khôi phục |
| Nối sai parent Line | Đạt: edge bị từ chối, parent/address giữ nguyên |
| Validation Device chưa nối | Đạt: warning trên Tree/Canvas |
| Area mở rộng/reflow khi đặt gần biên | Đạt: chỉ AreaLayout sau bị dịch |
| JavaScript syntax | Đạt |
| `KnxTopologyStructure.test.js` | Đạt |
| `KnxAreaLayout.test.js` | Đạt |
| `KnxLayoutFoundation.test.js` | Đạt |
| Production bundle | Đạt: Ant `BUILD SUCCESSFUL`, `app.min.js` syntax hợp lệ |
| Production browser smoke | Đạt: Add Line + hai Device manual, không tự đi dây |

### Kết quả transaction quan trọng

- Add Device 1: `PlacedUnconnected`, `layoutMode=manual`, 0 edge.
- Add Device 2: Device 1 giữ nguyên geometry, Device 2 có 0 edge.
- Undo tạo Device 2: Device 1 vẫn tồn tại.
- Connect Bus Device 1: 1 edge `device-bus`, trạng thái `Connected`.
- Undo Connect Bus: Device vẫn tồn tại, 0 edge, trạng thái `PlacedUnconnected`.
- Nối sang Line khác: edge không tồn tại sau validate, parent Line không đổi.
- Delete bus edge: Device vẫn tồn tại; Undo phục hồi edge.

### Rủi ro còn lại

- Workflow `Move Device to Line` chưa thuộc phạm vi N1–N5; hiện nối sai bus bị từ chối.
- Validation hiện là lớp kiểm tra kết nối nhẹ, chưa phải Validation Engine toàn diện.
- Ant vẫn in cảnh báo legacy về `stencils.min.js` trong bước merge dù build thành công.
- Trạng thái “Đã nghiệm thu” chỉ được ghi sau khi người dùng chạy và xác nhận.

## Hotfix phím W — 2026-07-25

- Dev browser: chọn Device trong Tree → `W` → Wire Mode active và crosshair giữ
  nguyên sau keyup: Đạt.
- Focus trong input Name → gõ `w` chỉ cập nhật text, không bật Wire Mode: Đạt.
- Production build có `WireMode.js`, `data-wire-mode` và shortcut handler: Đạt.
- Production browser không có `dev=1`: chọn Device → `W` →
  `wireMode=true`, `crosshair=true`: Đạt.
- JavaScript syntax, KNX structure/area/foundation tests: Đạt.
## 2026-07-27 - W regression

Status: technically verified; awaiting user acceptance.

| Check | Result |
|---|---|
| W starts one Wire Mode session | Pass |
| Device remains in Canvas/Tree/Properties after W | Pass |
| `removeCells()` during Wire Mode cannot remove source Device | Pass |
| Escape cancels Wire Mode and preserves selection | Pass |
| Click parent bus creates one connector and keeps Device ID | Pass |
| Production `app.min.js` build | Pass (`BUILD SUCCESSFUL`) |
| JavaScript syntax and KNX contract/unit tests | Pass |
