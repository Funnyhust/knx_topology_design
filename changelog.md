# KNX Topology Changelog

## 2026-07-27 - W source-device protection

- Replaced the three competing W keyboard paths with one capture-phase handler.
- Reserved and consumed W before stock draw.io keyboard dispatch.
- Added an explicit active wire source and protected it in both delete bridges.
- Added global Escape cancellation that preserves the Device and selection.
- Rebuilt the production bundle and verified W, guarded removal, Escape and a
  completed Device-to-parent-bus connection in Chromium.

## 2026-07-25 — Standard KNX Mode N1–N5

- Tách workflow `addAreaStructure()` khỏi API tương thích `addArea()`.
- Add Area tiếp tục tạo Area, Main Line, Area Coupler và hai structural edge
  trong một topology transaction.
- Structural edge được gắn `knxConnectionKind=structural`; Device edge legacy
  được phân biệt bằng `device-bus`.
- Bỏ phép quét toàn bộ `model.cells` để tính vị trí trung gian của Area khi
  Layout Store đang hoạt động.
- Build lại bundle production và xác nhận URL không có `dev=1` dùng workflow mới.
- Browser test xác nhận zoom không đổi, Area cũ không đổi, Undo/Redo giữ UUID.
- Add Line đi qua `addSecondaryLineStructure()`, tạo feeder và bus stub rỗng 64 px.
- Add Device không còn gọi Auto Placement, Device Grid hoặc Auto Wiring; thay bằng
  preview theo con trỏ và commit geometry thủ công.
- Device mới được lưu `layoutMode=manual`, `connectionState=PlacedUnconnected`.
- Thêm `Connect Bus` trên toolbar, context menu, Properties và hỗ trợ phím `W`
  từ Device đang chọn.
- Dây Device dùng `knxConnectionKind=device-bus`, orthogonal, không mũi tên và
  bám cạnh trái card.
- Nối sai bus bị từ chối, không âm thầm đổi parent/address.
- Xóa dây không xóa Device; Undo khôi phục dây và trạng thái kết nối.
- Bổ sung validation nhẹ cho Device chưa nối, sai Line, nhiều dây, orphan edge và
  structural relation bị thiếu.
- Bổ sung unit contract test cho Standard Mode và build lại `app.min.js`.
- Hotfix phím `W`: cho phép khởi động Connect Bus khi focus đang ở Tree/toolbar
  hoặc Draw.io `mxTypingShim`, nhưng không cướp phím khi đang gõ trong input thật.
- Giữ crosshair sau sự kiện keyup; Escape vẫn hủy Wire Mode.
- Bổ sung `WireMode.js` vào danh sách source của target production `app.min.js`;
  trước hotfix file này chỉ có trong dev/bundle trung gian.
