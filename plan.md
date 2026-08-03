# KNX Topology - Kế hoạch hiện tại

Cập nhật: 2026-07-25

## Quyết định vận hành thay thế — Standard KNX Mode

Quyết định này thay thế Auto Device Grid, Auto Placement Device và Auto Wiring
Device trước đây:

| Thao tác | Tạo cấu trúc | Tạo dây | Vị trí |
|---|---|---|---|
| Add Area | Area + Area Coupler + Main Line | Dây cấu trúc tự động | Area mới ở slot trống tiếp theo |
| Add Line | Line Coupler + bus stub ngắn | Dây cấu trúc tự động | Line mới ở slot trống tiếp theo |
| Add Device | Chỉ Domain Device | Không | Người dùng click để đặt |
| Connect Bus | Không tạo Domain Device | Người dùng chủ động | Dây orthogonal/waypoint thủ công |

Add Device và Connect Bus là hai Undo Command độc lập. Connector hiển thị không
được dùng để suy ra parent topology hoặc Individual Address.

### Lộ trình N1–N5

| Phase | Phạm vi | Trạng thái |
|---|---|---|
| N1 | Structural Add Area, structural connectors, atomic Undo/Redo | Đã triển khai và có bằng chứng browser/video; chờ người dùng nghiệm thu |
| N2 | Structural Add Line, feeder, compact empty bus stub | Đã triển khai và kiểm tra kỹ thuật; chờ nghiệm thu |
| N3 | Manual Add Device, Placement Preview, PlacedUnconnected | Đã triển khai và kiểm tra kỹ thuật; chờ nghiệm thu |
| N4 | Connect Bus Tool, port trái, waypoint, disconnect | Đã triển khai và kiểm tra kỹ thuật; chờ nghiệm thu |
| N5 | Connection validation nhẹ và tương thích project cũ | Đã triển khai và kiểm tra kỹ thuật; chờ nghiệm thu |

Không phase nào được ghi “Đã nghiệm thu” nếu chưa được người dùng xác nhận sau
kiểm tra trình duyệt và bằng chứng. N1–N5 hiện mới ở trạng thái hoàn thành kỹ thuật.

### Kết quả N1

- Add Area tạo đúng Area, Main Line, Area Coupler và hai structural edge.
- Structural edge có `knxConnectionKind=structural`; không bị lẫn với Device bus.
- Area mới nằm dưới Area cuối; Area cũ giữ nguyên toàn bộ AreaLayout.
- Zoom giữ 100%, không Fit/Center; Area mới được chọn.
- Undo xóa trọn cấu trúc; Redo khôi phục nguyên stable ID và selection.
- Bundle production `app.min.js` đã được build lại từ source.
- Bằng chứng nằm trong `evidence/`; trạng thái sản phẩm vẫn chờ người dùng nghiệm thu.

## 1. Mục tiêu hiện tại

Biến phần Topology View thành không gian quản lý KNX chuyên dụng trên nền Draw.io. Trong phạm vi hiện tại, ưu tiên làm cho cấu trúc `Area -> Main Line -> Secondary Line -> Device` đọc được ngay trên Canvas, đồng thời giữ nguyên dữ liệu, vị trí thủ công và khả năng mở project cũ.

## 2. Trạng thái đã có

- Toolbar nghiệp vụ KNX, Topology Tree, Canvas và Properties Panel.
- Stable `knxObjectId` và index ánh xạ với `mxCell`.
- Layout Store có version và tọa độ node tương đối theo Area.
- Area container có bounds độc lập.
- Area được xếp dọc và tự reflow khi Area phía trước mở rộng.
- Project reflow chỉ dịch nguyên Area, không đổi tọa độ tương đối của node Manual.
- Add Area và Add Line đi qua pipeline structural reconcile; Add Device chỉ dùng
  transaction chung để commit geometry thủ công và reflow Area nếu cần.
- Area header dùng plain text, không còn phụ thuộc HTML label.
- Secondary Line mới dùng slot structural compact; Device mới không dùng Auto Grid.

## 3. Lỗi đã xác định từ video và ảnh mục tiêu

Video `2026-07-24 16-37-17.mp4` cho thấy:

1. Secondary Line từng được biểu diễn bằng bus dọc, khác với topology mục tiêu và tạo ra các đường dài giống dây lỗi dù người dùng không bấm `W`.
2. Giới hạn hai Line mỗi hàng làm Line thứ ba xuống hàng quá sớm, tạo feeder dài và làm Area cao bất thường.
3. Luồng repair khi load vẫn đặt junction theo giả định bus dọc, có thể làm sơ đồ đã đúng quay lại routing cũ sau khi mở lại.

Luồng nhỏ hiện tại:

```text
Add Secondary Line
  -> đo nội dung thật của Line
  -> chọn slot grid, tối đa ba Line rỗng trên hàng đầu
  -> đặt Line Coupler dưới Main Line
  -> dựng bus Secondary Line nằm ngang từ cạnh phải Coupler
  -> đặt Device xuống dưới bus và nối vào đỉnh card
  -> cập nhật Line bounds
  -> cập nhật Area bounds
  -> reflow các Area phía sau
  -> giữ selection
  -> commit cùng transaction Undo/Redo
```

## 4. Quy tắc bất biến

- Không suy ra parent KNX từ tọa độ Canvas.
- Kéo node trên Canvas không đổi parent hoặc Individual Address.
- Không tự chạy Auto Layout toàn Project sau thao tác Add.
- Project reflow được phép dịch nguyên Area để chống overlap.
- Không thay đổi `relativeX`/`relativeY` của node Manual khi Area bị reflow.
- Tree, Canvas và Properties phải tiếp tục trỏ tới cùng `knxObjectId`.
- Không sửa Card Design hoặc Properties trong luồng sửa layout này.

## 5. Phase và trạng thái

| Phase | Phạm vi | Trạng thái |
|---|---|---|
| Phase 0.5 | Stable ID, Layout Store, topology index, transaction guard, Undo bridge | Đã triển khai |
| Phase 1 | Infinite Canvas, Area container, Area bounds và Project reflow | Đã triển khai và qua soak test 400 Device |
| Phase A1 | Adaptive Line/Device grid cơ bản | Đã triển khai |
| Phase A2 | Horizontal Secondary-Line routing và compact empty Line | Đã triển khai; đã đối chiếu runtime với 3 Area/3 Line |
| Phase B | Atomic layout transaction hoàn chỉnh cho Add/Delete/Move | Add Area/Line/Device đã nguyên tử; Delete/Move còn trong backlog |
| Phase C | Connector routing, port cố định và tránh xuyên card | Routing Topology tự động đã đạt; routing node Manual còn trong backlog |
| Phase D | Card Design System | Chưa bắt đầu |
| Phase E | Ancestor-path highlight và breadcrumb | Chưa bắt đầu |
| Phase F | Properties, Toolbar, panel resize và Status Bar polish | Chưa bắt đầu |

## 6. Tiêu chí nghiệm thu Phase A2

```gherkin
Scenario: Ba Secondary Line rỗng nằm cùng hàng
  Given Area có Line 1.1 và Line 1.2 ở hàng đầu
  When người dùng thêm Line 1.3
  Then Line 1.3 nằm cùng hàng khi Area còn đủ chiều rộng
  And mỗi Line có Line Coupler và bus ngang độc lập
  And quan hệ Main Line -> Line Coupler 1.3 nhìn thấy rõ

Scenario: Device nối xuống từ bus ngang
  Given Device thuộc Secondary Line 1.1
  When Line được reconcile
  Then Device nằm dưới bus Line 1.1
  And junction nằm trên bus tại tâm ngang của Device
  And connector đi vào cạnh trên của Device

Scenario: Line rỗng dùng bus ngắn
  Given Secondary Line chưa có Device
  When Area được reconcile
  Then Line dùng một bus stub ngắn
  And không dành sẵn chiều cao của một hàng Device

Scenario: Reflow không phá layout cũ
  Given các Area phía sau có node Manual
  When Area hiện tại đổi chiều cao do thêm Line
  Then Area phía sau chỉ thay đổi AreaLayout.y
  And tọa độ tương đối và layoutMode của node con không đổi
```

## 7. Kế hoạch kiểm tra

- Unit test `measureLineTile()` với Line có 0 Device.
- Unit test grid ba Line rỗng: cả ba nằm cùng hàng.
- Unit test Line thứ tư: xuống hàng và dùng routing lane riêng.
- Runtime test: bus Line có `busDirection = horizontal` và geometry cao 4 px.
- Chạy toàn bộ test KNX Layout Foundation và Area Layout.
- Kiểm tra cú pháp các file JavaScript thay đổi.
- Kiểm tra server trả được trang ứng dụng.
- Kiểm tra thủ công trên trình duyệt: tạo 3 Area, thêm 3 Line vào Area 1, Undo/Redo và Fit Project.

## 8. Bước tiếp theo sau Phase A2

Chỉ sau khi Phase A2 đạt mới chuyển sang Phase B/C. Ưu tiên tiếp theo là bảo đảm connector luôn orthogonal, không xuyên card và toàn bộ Add Line/Add Device Undo/Redo nguyên tử trong giao diện thật.

## 9. Kết quả triển khai Phase A2

- Line có `0 Device` không còn bị tính như có một hàng Device ảo.
- Bus Secondary Line chuyển từ cột dọc sang bus ngang, bắt đầu ở cạnh phải Line Coupler.
- Ba Line rỗng dùng ba cột trên hàng đầu; Line thứ tư mới wrap xuống hàng.
- Device Auto được đặt dưới bus; junction theo tâm ngang Device và connector đi vào cạnh trên card.
- Luồng load/repair đọc `busDirection` và khôi phục đúng junction ngang, không kéo routing về giả định bus dọc cũ.
- `updateLineBounds()` không còn thay đổi chiều cao của Line Manual.
- Unit test KNX Area Layout và Layout Foundation: đạt.
- JavaScript syntax check: đạt.
- HTTP smoke test cho trang và file layout mới: đạt (`200 OK`).
- Kiểm tra runtime trên Chromium với 3 Area và Line 1.1–1.3: đạt; bằng chứng `docs/runtime-horizontal-lines.png`.

## 10. Hotfix UI Tree theo ảnh `image.png`

Trạng thái: đã triển khai và kiểm tra smoke test ngày 2026-07-24.

Phạm vi:

- Secondary Line phải thụt vào dưới Main Line trong Tree.
- Device trên Main Line nằm dưới Main Line; Device của Secondary Line nằm dưới Line tương ứng.
- Search là footer riêng, không che các node cuối Tree.
- Project cũ thiếu `lineRole` vẫn nhận Main Line bằng `localAddress = 0` hoặc địa chỉ kết thúc bằng `.0`.
- Area header không được đếm Main Line thành Secondary Line.

Ngoài phạm vi:

- Không thay đổi parent topology.
- Không thay đổi Canvas layout hoặc Area reflow.
- Không thiết kế lại icon/card/properties.

Tiêu chí:

```gherkin
Scenario: Tree hiển thị hierarchy Main Line
  Given Area có Main Line 3.0, Line 3.1 và Line 3.2
  When Tree được render
  Then Main Line 3.0 nằm trực tiếp dưới Area
  And Line 3.1 và Line 3.2 thụt vào dưới Main Line 3.0
  And Coupler và Device thụt vào dưới đúng Secondary Line

Scenario: Search không che Tree
  Given Tree cao hơn panel trái
  When người dùng cuộn xuống cuối Tree
  Then node cuối cùng vẫn hiển thị đầy đủ phía trên Search
```

Kết quả:

- Main Line dùng level 2; Secondary Line dùng level 3.
- Coupler/Device dùng level con trực tiếp của Line tương ứng.
- Sidebar không còn scroll chung; `knxWorkspaceTopologyContent` có vùng cuộn riêng.
- Search giữ cố định dưới panel và không phủ vùng cuộn.
- Fallback Main Line chỉ dùng metadata địa chỉ KNX, không dùng geometry.
- Syntax check, KNX unit test và headless-browser smoke test: đạt.
- Bằng chứng shell sau hotfix: `docs/tree-hotfix-smoke.png`.

## 11. Hotfix routing khi mở project hiện có

Trạng thái: đã triển khai và smoke test ngày 2026-07-24.

Nguyên nhân:

- Luồng load trước đây chỉ khôi phục Layout Store và Area container.
- Topology edge cũ giữ waypoint/style đã lưu trong XML.
- Junction ẩn của file cũ có thể bị migration đánh dấu Manual nên routing mới không cập nhật được.

Hành vi mới:

- Khi khởi tạo hoặc load project, chỉ các edge có `knxTopologyEdge=1` được chuẩn hóa.
- Xóa waypoint cũ của edge hệ thống và đưa về `orthogonalEdgeStyle`, không mũi tên.
- Junction hệ thống được coi là projection Auto và được đặt lại theo Main Line/Line.
- Wrapped Line dùng metadata `row` nếu có; file cũ chỉ dùng geometry để chọn tuyến hiển thị, không dùng geometry để suy ra parent.
- Card, bus và Device Manual không bị di chuyển.
- Dây W thông thường không mang `knxTopologyEdge=1` không bị hotfix này sửa.

Kiểm tra:

- KNX Area Layout test: đạt.
- KNX Layout Foundation test: đạt.
- JavaScript syntax check: đạt.
- Server `8090` trả đúng file có `repairTopologyRouting()`: đạt.
- Headless Chrome khởi tạo editor: đạt; bằng chứng `docs/routing-load-smoke.png`.

## 12. Bộ ảnh mục tiêu và KNX Partner logo

Nguồn tham chiếu giao diện được lưu trong thư mục `goal/`:

- `ChatGPT Image Jul 24, 2026, 03_46_32 PM.png`
- `ChatGPT Image Jul 24, 2026, 03_46_37 PM (1).png`
- `ChatGPT Image Jul 24, 2026, 03_46_38 PM (2).png`
- `ChatGPT Image Jul 24, 2026, 03_46_38 PM (3).png`
- `ChatGPT Image Jul 24, 2026, 03_46_45 PM.png`

Các quyết định rút ra từ ảnh mục tiêu:

- Main Line nằm ngang trong Area; Line Coupler nằm ngay dưới Main Line.
- Secondary Line là bus ngang đi từ cạnh phải Line Coupler; Device nằm dưới bus và nối bằng nhánh dọc ngắn.
- Area là container độc lập, xếp dọc theo Backbone và tự reflow khi nội dung tăng.
- Tree, Canvas và Properties là ba projection của cùng object ID.
- Card gọn, chỉ giữ tên, địa chỉ và model/order number cần thiết.

Asset thương hiệu do người dùng cung cấp nằm trong `KNX Partner logo/`:

- `Partner.eps` — bản vector gốc.
- `Partner.pdf` — bản in/tham chiếu.
- `Partner.jpg` — bản raster xem nhanh.

Tích hợp logo được xếp vào Phase F (UI/branding), sau khi routing và transaction ổn định. Khi triển khai sẽ tạo asset web tối ưu từ bản vector, giữ nguyên tỷ lệ và không chỉnh sửa nội dung logo. Hiện logo mới được ghi nhận trong kế hoạch, chưa được chèn vào UI để không trộn branding vào hotfix layout.

## 16. Kết quả Standard KNX Mode N2–N5

Trạng thái: hoàn thành kỹ thuật ngày 2026-07-25, chờ người dùng nghiệm thu trên trình duyệt.

- **N2 — Add Line:** tạo Line Coupler, feeder cấu trúc và bus stub 64 px trong
  cùng transaction. Line rỗng không tạo Device, placeholder hoặc bus dự phòng dài.
- **N3 — Add Device:** yêu cầu chọn đúng Secondary Line; tạo Placement Preview
  theo chuột; click/Enter để đặt, Esc/chuột phải để hủy. Device mới có
  `layoutMode=manual`, trạng thái `PlacedUnconnected`, không có connector và
  không gọi layout Line/Area/Project.
- **N4 — Connect Bus:** nút `Connect Bus`, context menu và phím `W` khởi động
  Wire Mode từ Device được chọn. Cổng mặc định ở cạnh trái, dây orthogonal không
  mũi tên. Xóa dây giữ nguyên Device, parent và address.
- **N5 — Validation nhẹ:** phân biệt `PlacedUnconnected`, `Connected` và
  `ConnectionInvalid`; cảnh báo Device chưa nối, từ chối dây nối sai parent Line,
  phát hiện nhiều dây/orphan và thiếu structural relation.

Luồng Add Device đã chốt:

```text
Select Secondary Line
  -> Add Device
  -> tạo Domain metadata tạm
  -> Placement Preview theo con trỏ
  -> click vị trí hợp lệ
  -> commit Device + NodeLayout manual + Tree + Selection
  -> Area chỉ mở rộng/reflow nếu thật sự cần
  -> không tạo dây, không fit, không đổi zoom
```

Luồng Connect Bus đã chốt:

```text
Select Device
  -> Connect Bus / W
  -> chỉ bus của parent Line là target hợp lệ
  -> tạo dây orthogonal thủ công
  -> Device chuyển Connected
  -> Undo chỉ xóa dây; Undo tiếp theo mới xóa Device
```

Tương thích project cũ:

- Không tự chạy migration hình học hoặc Auto Layout khi load.
- Connector đã lưu vẫn được giữ; trạng thái kết nối được suy ra từ metadata
  topology và edge hiện có, không suy ra parent từ khoảng cách.
- Device cũ không có dây được hiển thị `PlacedUnconnected`; hệ thống không tự nối.
- Stable `knxObjectId`, parent topology và Individual Address không bị đổi.

## 13. Hotfix video 16:37 — trạng thái hiện tại

- Không liên quan đến phím `W`; lỗi xuất hiện từ topology projection tự động.
- Tạo mới: ba Secondary Line đầu tiên hiển thị theo bus ngang trong cùng hàng.
- Load lại: junction của Line/Device được khôi phục theo `busDirection`, tránh hồi quy về bus dọc.
- Project phiên bản cũ chỉ được nâng projection sang bus ngang khi Line và Coupler vẫn là Auto; nếu người dùng đã kéo Manual thì giữ nguyên toàn bộ Area.
- Unit test Area Layout và Layout Foundation: đạt.
- JavaScript syntax check: đạt.
- Bằng chứng trước/sau:
  - Trước: `docs/runtime-routing-repro.png`.
  - Sau: `docs/runtime-horizontal-lines.png`.

## 14. Kiểm tra trình duyệt đầy đủ và sửa hồi quy Undo/Redo

Chuỗi kiểm tra tự động bằng Chromium thật:

1. Tạo 3 Area.
2. Thêm Line 1.1, 1.2, 1.3.
3. Thêm 8 Device vào Line 1.1 và 4 Device vào Line 1.2.
4. Thêm Line 2.1 và 3 Device.
5. Chạy lại với 4 Area, mở rộng Area 3, sau đó Undo/Redo Device cuối.

Lỗi phát hiện trong chính lượt kiểm tra:

- Khi Device làm tile rộng lên, giới hạn Area cũ đẩy Line 1.3 xuống hàng và tạo feeder dọc dài.
- Sau Redo, geometry trung gian do `layoutAddedDevice()` cũ tạo có thể thắng snapshot ngang, biến bus thành hình chữ nhật xanh lớn.

Bản sửa:

- Nới giới hạn adaptive Area để ba Line thông dụng tiếp tục bám trực tiếp Main Line; không tạo feeder dọc chỉ vì Device làm tile rộng.
- Khi Area Layout Engine hoạt động, `layoutAddedLine()` và `layoutAddedDevice()` chỉ tạo object/junction/edge. Final geometry chỉ được ghi một lần bởi reconcile pipeline.
- Undo/Redo không còn chứa geometry dọc trung gian của thuật toán legacy.

Kết quả runtime:

- `12 -> 11 -> 12 Device` qua Add/Undo/Redo.
- Selection trở lại đúng Device 12 sau Redo.
- Bus Line 3.2 vẫn là đường ngang cao 4 px, không biến thành khối xanh.
- Bằng chứng:
  - `docs/runtime-full-video-fixed.png`.
  - `docs/runtime-auto-reflow-undo-fixed.png`.

## 15. Hotfix đoạn dây thừa Area Coupler → Main Line

Nguồn: ảnh người dùng `20260724-174705.png`.

Nguyên nhân:

- Area đầu tiên có thể có đồng thời edge routed `area-output` và edge trực tiếp `topology` cho cùng cặp Area Coupler/Main Line.
- Junction `Main Line/start` chưa luôn được cập nhật cùng geometry Main Line, khiến router vẽ một đoạn bậc/U ngắn bên phải Coupler.

Bản sửa:

- Luôn đặt junction `Main Line/start` đúng tại đầu Main Line khi layout và khi load/repair.
- `ensureTopologyConnection()` nhận biết routed relation theo logical source/target và không tạo edge trực tiếp thứ hai.
- Project cũ có duplicate edge được repair thành projection không hiển thị; routed relation chuẩn vẫn được giữ.

Kiểm tra Chromium:

- Tạo 3 Area mới và Arrange Areas.
- Cả ba Area Coupler nối liền thẳng với Main Line, không còn đoạn bậc/U.
- Bằng chứng: `docs/runtime-area-coupler-stub-fixed-v2.png`.

## 16. Hotfix connector xuyên qua Device cùng cột

Nguồn: ảnh người dùng `image.png` với Line 2.1 có bốn Device xếp dọc.

Nguyên nhân:

- Mỗi Device trong cùng cột đều có edge riêng kéo từ cùng một junction trên bus ngang.
- Các edge chồng lên cùng trục X, nên edge tới Device dưới xuyên qua card Device phía trên.

Bản sửa:

- Device đầu mỗi cột nối trực tiếp từ bus ngang vào cạnh trên card.
- Device tiếp theo trong cùng cột nối từ đáy Device trước vào đỉnh Device sau.
- Logical parent của tất cả Device vẫn là Line; chuỗi chỉ là projection routing trên Canvas.
- Khi load/repair, Device Auto được sort theo `deviceNumber` và dựng lại cùng quy tắc chuỗi.
- Device Manual không bị tự di chuyển hoặc ép vào chuỗi Auto.

Kiểm tra Chromium:

- Tạo Area 2, Line 2.1 và thêm bốn Device.
- Không còn connector chạy xuyên card; chỉ còn ba đoạn ngắn giữa bốn Device.
- Bằng chứng: `docs/runtime-device-chain-routing-fixed.png`.

## 17. Phase A3 — Adaptive Device Grid theo ảnh goal

Trạng thái: Đã triển khai và kiểm tra Chromium ngày 2026-07-24.

Quy tắc grid:

- 1–3 Device: một hàng ngang, mỗi Device có nhánh riêng từ bus.
- 4 Device: `2 cột × 2 hàng`.
- 5–6 Device: hai cột cân bằng (`3+2` hoặc `3+3`).
- 7 Device trở lên: tối đa ba cột, số hàng được cân bằng tự động.
- Thứ tự vẫn theo `deviceNumber`, đi từ trên xuống trong từng cột rồi sang cột kế tiếp.
- Device đầu cột nối từ bus; Device dưới nối tiếp bằng đoạn ngắn giữa hai card.
- Device Manual không bị adaptive grid di chuyển.
- Line Auto lưu `deviceGridVersion = 2`; project dùng grid cũ được migrate khi load mà không cần thêm Device mới.

Kết quả kiểm tra chung trong một Area:

- Line 1.1 có 4 Device: grid `2×2`.
- Line 1.2 có 5 Device: hai cột `3+2`.
- Line 1.3 có 8 Device: ba cột `3+3+2`.
- Không connector nào xuyên card.
- Fit Project đạt 70% trên viewport 1920×1080 của bài kiểm tra.
- Bằng chứng: `docs/runtime-goal-adaptive-device-grid.png`.

Undo/Redo dữ liệu đã kiểm tra `5 -> 4 -> 5 Device`. Việc khôi phục selection phía Undo
trong trường hợp grid đổi từ `3+2` về `2×2` còn thuộc Phase B và chưa được tuyên bố đạt.

## 18. Phase A4 — Giảm rối khi Area có nhiều Secondary Line

Nguồn: video `2026-07-24 18-11-39.mp4`.

Quan sát:

- Khi Area có 12 Secondary Line, bố cục ba cột tạo ba trục feeder dài.
- Vị trí cột thay đổi theo chiều rộng nội dung của từng Line, làm feeder hàng
  sau lệch khỏi hàng trước.
- Hàng đầu nối vào tâm Coupler nhưng hàng sau dùng gutter, nên cùng một cột có
  thể xuất hiện hai đường dọc gần nhau.

Quyết định triển khai:

- Giới hạn tối đa hai cụm Secondary Line trên một hàng, theo mẫu adaptive 2×N
  trong bộ ảnh `goal/`.
- Chiều rộng cột lấy theo Line rộng nhất trong cột; mọi hàng dùng chung tọa độ X.
- Mỗi cột chỉ dùng một feeder gutter ở bên trái Coupler, kể cả hàng đầu tiên.
- Bus của từng Line vẫn nằm ngang và chỉ dài theo nội dung Line.
- Projection version tăng lên `3` để project Auto hiện tại được migrate khi
  load; Area có Line/Coupler Manual vẫn được giữ nguyên.
- Không đổi parent topology, Individual Address hoặc tọa độ node Manual.

```gherkin
Scenario: Area có 12 Secondary Line
  Given các Line được sắp theo lineNumber
  When Area layout được reconcile
  Then mỗi hàng có tối đa hai Line
  And các Line cùng cột có cùng trục feeder
  And không xuất hiện hai feeder gần song song trong cùng một cột
  And bus Line không xuyên qua card Device
```

Kết quả kiểm tra Chromium:

- Tạo mới 1 Area, thêm liên tiếp 12 Secondary Line và 5 Device vào Line cuối.
- Kết quả có đúng hai cột và hai feeder dùng chung; các Coupler cùng cột thẳng X.
- Device dùng grid `3+2`; bus nằm trên card và không có edge xuyên nội dung card.
- Trang chạy ở 55% để fit toàn bộ Area 12 Line trong viewport 1920×1080.
- Bằng chứng: `docs/runtime-two-column-12-lines.png`.

## 19. Phase B1 — Stable Device Slot và viewport bất biến

Nguồn quyết định:

- Bộ ảnh `goal/`; ảnh `ChatGPT Image Jul 24, 2026, 03_46_45 PM.png` là
  chuẩn chính của Topology View.
- Video lỗi `2026-07-24 18-31-36.mp4`.

Quy tắc bất biến:

- Add Device chỉ cấp slot kế tiếp cho Device mới; Device cũ không đổi slot.
- Không cân bằng lại grid theo tổng số Device.
- Slot dùng thứ tự địa chỉ và bank cố định: tối đa `4` cột, `2` Device mỗi cột,
  tương đương `8` Device mỗi bank. Bank mới nằm dưới bank cũ nên chiều rộng Area có giới hạn.
- Line rỗng tiếp tục dùng Coupler và bus stub ngắn; không giữ chỗ Device ảo.
- Khi content tăng, Line/Area chỉ mở rộng vừa đủ; Area sau chỉ dịch nguyên khối.
- Add Area, Add Line và Add Device không được tự pan, center, fit hoặc đổi zoom.
- Selection vẫn chuyển sang object mới nhưng viewport giữ nguyên tuyệt đối.
- Tree chỉ refresh một lần sau final layout; không render topology trung gian.
- Final geometry, Area bounds, Project reflow, connector và selection nằm trong
  cùng một Undo transaction.
- Không đổi parent KNX, Individual Address hoặc node Manual.

Pipeline mục tiêu:

```text
Add Device
  -> create domain/cell without viewport side effect
  -> allocate next stable slot
  -> update changed Line bounds
  -> update changed Area bounds
  -> reflow following Areas as groups
  -> apply final geometry once
  -> restore final selection
  -> refresh Tree once
  -> commit transaction
  -> keep viewport scale and translate unchanged
```

Tiêu chí:

```gherkin
Scenario: Thêm Device không làm Device cũ di chuyển
  Given Line có Device 1 đến Device 9 ở stable slots
  When thêm Device 10
  Then chỉ Device 10 nhận slot mới
  And geometry Device 1 đến Device 9 không đổi

Scenario: Add Device không làm viewport nhảy
  Given viewport có scale và translate hiện tại
  When thêm một Device ngoài vùng nhìn thấy
  Then selection chuyển sang Device mới
  And scale và translate không đổi
  And không gọi Fit Project hoặc scrollCellToVisible
```

Trạng thái triển khai ngày 2026-07-24: **Đã đạt ở mức unit test và Chromium runtime**.

- `deviceGridVersion = 6`; Phase B1/B2 thay thế quy tắc grid cân bằng của Phase A/UX-DEVICE-GRID-01.
- Kiểm tra tuần tự 12 lần Add Device: mọi geometry cũ giữ nguyên; Device mới nhận slot kế tiếp.
- Kiểm tra runtime xác nhận `scrollLeft`, `scrollTop`, scale và translate không đổi qua từng Add.
- Mỗi Add Device chỉ phát sinh một `mxGraphModel CHANGE` ở transaction ngoài cùng.
- Tree bị hoãn refresh trong mutation và chỉ render một lần sau khi transaction đóng.
- Undo `6 -> 5` và Redo `5 -> 6` khôi phục đồng bộ Device, Area layout, selection;
  viewport không bị `undoHandler` mặc định của Draw.io tự cuộn.
- Unit test đã kiểm tra tính bất biến của mọi slot từ 1 đến 15 Device.

## 20. Phase B2 — Full-topology soak test theo video 20-37-08

Nguồn: video `2026-07-24 20-37-08.mp4` và ảnh chuẩn
`goal/ChatGPT Image Jul 24, 2026, 03_46_45 PM.png`.

Quan sát trực tiếp:

- `00–08s`: tám Device trên Main Line tạo nhánh dài, nhiều đoạn gấp và một số card nằm
  sát/đè đường bus; Main Line chưa có layout Device riêng.
- `09–13s`: ba Secondary Line được thêm vào Area 2; Line rỗng đã compact nhưng feeder
  và nhãn còn dày, khoảng trắng trong Area chưa cân đối.
- `14–29s`: Line 2.2 tăng tới 35 Device. Stable slot giữ Device cũ, nhưng 5 Device/cột
  không có giới hạn số cột làm Area mở rộng thành bảy cột, Main Line kéo gần toàn canvas.
- `30–34s`: Fit Project phải giảm từ 55% xuống 45%; khi zoom lại 65%, chỉ đọc được một
  phần Project. Đây là lỗi mật độ layout, không phải lỗi thao tác.

Quyết định B2:

- Giữ slot bất biến nhưng thêm `maxDeviceColumns` thật: Device được chia thành các bank
  cố định; bank mới nằm dưới bank cũ, không mở rộng Area vô hạn theo chiều ngang.
- Mỗi bank có số cột và số hàng cố định. Device cũ không đổi slot khi bank mới xuất hiện.
- Mỗi bank/cột có routing chain riêng; không nối xuyên từ bank trước sang bank sau.
- Main-Line Device phải dùng cùng projection compact có giới hạn, không dùng
  `layoutAddedDevice()` kiểu legacy sau khi reconcile.
- Card Auto dùng kích thước compact; node Manual giữ nguyên kích thước và tọa độ.
- Full-topology test bắt buộc tạo ít nhất 4 Area, nhiều Main/Secondary Line, tối thiểu
  80 Device, sau đó chạy Undo/Redo, save/load và kiểm tra overlap/routing/viewport.

```gherkin
Scenario: Một Line có nhiều hơn sức chứa một bank
  Given một bank Device đã đầy
  When thêm Device đầu tiên của bank kế tiếp
  Then Device cũ giữ nguyên geometry
  And bank mới xuất hiện phía dưới bank cũ
  And Area chỉ tăng chiều cao, không tăng vô hạn chiều rộng
  And connector bank mới không chạy xuyên card bank cũ
```

## 21. Kết quả hardening và full-topology test ngày 2026-07-24

Trạng thái: **đã hoàn thành phạm vi ổn định layout của Phase B2**.

Thay đổi đã chốt:

- Device Auto dùng slot bất biến theo bank `4 cột × 2 hàng`; thêm Device không cân bằng lại
  các Device cũ.
- `maxAreaWidth = 2300`, projection version `6`; Line đông Device tăng chiều cao theo bank
  thay vì kéo Area rộng vô hạn.
- Add Area, Add Line và Add Device chỉ tạo một `mxGraphModel CHANGE` ở transaction ngoài cùng.
- Add không gọi fit, center hoặc scroll-to-visible; scale, translate và scroll viewport giữ nguyên.
- Area phía sau chỉ dịch nguyên khối khi Area trước tăng bounds; tọa độ tương đối của node con
  không đổi.
- Main-Line Device và Secondary-Line Device dùng cùng projection bounded; bus/feeder không
  đi xuyên card Auto.
- Thanh Zoom/Fit chuyển xuống góc trái phía dưới Canvas để không che Area header.
- Bundle production không nạp lại KNX source lần hai; source mode dùng `Devel.js`, production
  dùng các module đã compile trong `app.min.js`.

Kết quả topology theo ảnh mục tiêu trên viewport Full HD:

- `3 Area`, `8 Line` (gồm Main Line), `20 Device`.
- Fit Project đạt đúng `60%`.
- Ba Area có bounds độc lập, xếp dọc và không overlap; Main/Secondary bus không xuyên card.
- Bằng chứng: `docs/runtime-goal-full-topology-final.png`.

Kết quả soak test 104 Device:

- `4 Area`, `16 Line`, `104 Device`; thời gian dựng `5589 ms`.
- Không Area overlap; `0` card overlap; `0` bus xuyên card; `0` card nằm ngoài Area.
- Mỗi Add nguyên tử (`maxChanges = 1`).
- Undo `104 -> 103`, Redo `103 -> 104` khôi phục selection và giữ viewport.
- Save/load XML `352838` byte có `knxLayout`; geometry và khoảng cách Area được bảo toàn.

Kết quả stress 400 Device:

- `5 Area`, `25 Line`, `400 Device`.
- Không Area overlap; `0` card overlap; `0` bus xuyên card; ID và Individual Address duy nhất.
- Dựng toàn bộ bằng test generator: `44749 ms`; thêm Device thứ `401`: `219 ms`.
- Serialize: `141 ms`, XML `1,145,236` byte; load lại: `2897 ms` và giữ đúng topology/layout.
- Bulk generator 400 Device còn có thể tối ưu thêm, nhưng thao tác Add đơn lẻ không bị chậm theo
  toàn bộ kích thước Project.

Production verification:

- Apache Ant `app`: **BUILD SUCCESSFUL**, Closure Compiler `0 error, 0 warning`.
- Build Windows đã được cố định `UTF-8` ở bước concat shape; emoji không còn làm hỏng
  `build/shapes.js`.
- `app.min.js` mới có kích thước `9,478,646` byte.
- Smoke test trực tiếp từ bundle: tạo `3 Area`, `2 Secondary Line`, `8 Device`; chọn Device
  `1.1.8` được đồng bộ trên Tree, Canvas và Properties, không có runtime exception.
- Bằng chứng bundle: `docs/runtime-production-bundle-smoke.png`.

Các mục không thuộc phạm vi B2 và vẫn là backlog có chủ đích:

- Delete/Move-to-Line transaction nghiệp vụ đầy đủ.
- Card Design System và Properties redesign.
- Routing nâng cao cho connector do người dùng chỉnh tay.
- Wiring View, Function View và Validation Engine hoàn chỉnh.

## 22. Phase UX-1 — Progressive Disclosure static prototype

Nguồn: yêu cầu ngày 2026-07-25 và ảnh chuẩn
`goal/ChatGPT Image Jul 24, 2026, 03_46_45 PM.png`.

Quyết định được xác nhận:

- Không tiếp tục vá Device square grid/bank hiện tại.
- Dùng `Progressive Disclosure + Line Swimlane + Level of Detail`.
- Secondary Line có bốn projection: `collapsed`, `compact`, `expanded`, `focus`.
- Compact chỉ hiển thị tối đa 4 Device và nút `+ N more`.
- Expanded/Focus dùng bus band ngang, tối đa 5 Device/band.
- Project Overview không bắt buộc render mọi Device.
- View mode là View State, không thay đổi parent KNX, IA hoặc Domain data.

Prototype đã tạo:

- `docs/prototypes/knx-line-progressive-disclosure.html`
- Hỗ trợ query `?devices=4|12|30&mode=collapsed|compact|expanded|focus`.
- Có Tree, Canvas, Properties và Status bar để đánh giá trong đúng ngữ cảnh ứng dụng.

Kết quả kiểm tra Chromium 1920×1080, zoom 100%:

- 12/12 tổ hợp 4/12/30 Device × 4 mode render thành công.
- Không có card overlap trong mọi tổ hợp.
- Collapsed không render Device card; Area cao cố định 340 px.
- Compact chỉ render tối đa 4 card; Area cao cố định 430 px.
- Expanded 12 Device tạo 3 bus band `5 + 5 + 2`.
- Focus 30 Device hiển thị đủ 30 card thành 6 bus band `5 × 6`, tên và IA đọc được ở 100%.
- Tree 30 Device cuộn độc lập, không làm tăng chiều cao Canvas.

Bằng chứng chính:

- `docs/prototypes/screenshots/line-30-collapsed-fullhd.png`
- `docs/prototypes/screenshots/line-30-compact-fullhd.png`
- `docs/prototypes/screenshots/line-12-expanded-fullhd.png`
- `docs/prototypes/screenshots/line-30-focus-fullhd.png`

Trạng thái: **UX-1 đã triển khai; chờ người dùng duyệt prototype trước UX-2**.
