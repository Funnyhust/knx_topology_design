# KNX Topology UI & Interaction Specification

Tài liệu này là **nguồn thông tin duy nhất** cho các quyết định về giao diện và
tương tác của module KNX Topology. Mọi quyết định đã thống nhất phải được cập
nhật tại đây trước khi triển khai hoặc thay đổi hành vi.

## 1. Trạng thái tài liệu

- Trạng thái: Đang xây dựng
- Phiên bản: 0.1
- Cập nhật gần nhất: 2026-07-24
- Phạm vi hiện tại: Quy trình phân tích, thiết kế, xác nhận và triển khai UI/UX
- Chưa được coi là đã chốt: Giao diện và cách vận hành hiện có của prototype

### Nhãn trạng thái yêu cầu

| Nhãn | Ý nghĩa |
|---|---|
| `Đề xuất` | Phương án đang được phân tích, chưa được người dùng chấp thuận |
| `Đã chốt` | Người dùng đã đồng ý; được phép dùng làm tiêu chí triển khai |
| `Đã triển khai` | Đã sửa code và đã đối chiếu tiêu chí nghiệm thu |
| `Thay thế` | Quyết định cũ không còn hiệu lực; phải dẫn tới quyết định mới |
| `Chưa rõ` | Còn thiếu bằng chứng hoặc cần người dùng xác nhận |

## 2. Nguyên tắc cộng tác đã chốt

Khi người dùng cung cấp ảnh, video, bản vẽ tay hoặc mô tả tự nhiên:

1. Không sửa code ngay.
2. Trả lại bốn phần phân tích:
   - Những gì quan sát trực tiếp được.
   - Những vấn đề được cho là người dùng đang gặp.
   - Những mong muốn đang được suy luận.
   - Những điểm chưa chắc chắn.
3. Tách yêu cầu thành hai nhóm:
   - **Visual:** bố cục, kích thước, màu sắc, vị trí và cách hiển thị.
   - **Interaction:** chuột, kéo thả, chọn phần tử, phản hồi hệ thống,
     Undo/Redo và trường hợp ngoại lệ.
4. Đề xuất từ hai đến ba phương án vận hành, kèm ưu và nhược điểm. Không yêu
   cầu người dùng tự thiết kế giải pháp giao diện.
5. Trước khi triển khai phải có:
   - Sơ đồ luồng thao tác.
   - Wireframe hoặc prototype có thể kiểm tra.
   - Bảng trạng thái trước, trong và sau thao tác.
   - Tiêu chí nghiệm thu Given–When–Then.
6. Mỗi lần sửa chỉ triển khai một luồng nhỏ.
7. Không triển khai cho tới khi phạm vi nhỏ đó được người dùng xác nhận.
8. Trước khi sửa code phải công bố file dự kiến thay đổi, hành vi mới, hành vi
   giữ nguyên, rủi ro và cách kiểm tra.
9. Sau khi sửa phải đối chiếu từng tiêu chí và đánh dấu `Đã đạt`, `Chưa đạt`
   hoặc `Chưa thể kiểm tra`, đồng thời báo mọi phát sinh ngoài phạm vi.

## 3. Quy tắc bất biến

Các quy tắc dưới đây có trạng thái **Đã chốt**:

- Không tự thay đổi vị trí tương đối của phần tử Manual bên trong Area hoặc
  Line. Project Layout được phép dịch chuyển nguyên Area như một khối để tránh
  chồng lấn; mọi tọa độ tương đối bên trong Area phải được giữ nguyên.
- Không tự chạy Auto Layout nếu người dùng không yêu cầu.
- Việc thêm một phần tử chỉ được ảnh hưởng đến vùng chứa trực tiếp của nó.
- Mọi thao tác tạo, xóa hoặc di chuyển phải hỗ trợ Undo/Redo.
- Không thay đổi hành vi đã được chốt nếu chưa được người dùng đồng ý.
- Ảnh, video, bản vẽ tay và tình huống thực tế là đầu vào hợp lệ; người dùng
  không phải tự viết đặc tả kỹ thuật hoàn chỉnh.

Nếu một yêu cầu mới xung đột với quy tắc bất biến, phải dừng trước bước triển
khai, nêu rõ xung đột và đưa ra phương án xử lý.

### Ngoại lệ Manual Layout đã chốt

- Khi người dùng kéo node, node chuyển sang `layoutMode = manual` và được khóa.
- Auto Layout Area không được thay đổi node Manual trong Area.
- Auto Layout Line không được thay đổi Device Manual của Line.
- Thêm Area, Line hoặc Device không được tự đưa node Manual trở lại thuật toán.
- Chỉ `Reset Layout` hoặc `Unlock for Auto Layout` do người dùng chủ động gọi
  mới được chuyển node Manual về Auto.
- Di chuyển Area như một khối không được xem là thay đổi layout tương đối của
  node Manual; đây là ngoại lệ hợp lệ để Project Layout tránh Area chồng lấn.

## 4. Cổng xác nhận trước triển khai

Một luồng chỉ được phép sửa code khi có đủ các mục sau:

- [ ] Phạm vi của một luồng nhỏ đã rõ.
- [ ] Bốn phần phân tích đã được trình bày.
- [ ] Visual và Interaction đã được tách riêng.
- [ ] Có 2–3 phương án cùng ưu/nhược điểm.
- [ ] Có luồng thao tác.
- [ ] Có wireframe hoặc prototype kiểm tra được.
- [ ] Có bảng trạng thái.
- [ ] Có tiêu chí Given–When–Then.
- [ ] Người dùng đã chọn hoặc xác nhận phương án.
- [ ] Đã công bố file, ảnh hưởng, rủi ro và cách kiểm tra.

## 5. Mẫu phân tích đầu vào

### Mã yêu cầu: `UX-XXX`

- Trạng thái: `Đề xuất | Đã chốt | Đã triển khai | Thay thế | Chưa rõ`
- Nguồn bằng chứng: ảnh/video/bản vẽ/mô tả
- Phạm vi luồng nhỏ:

#### Quan sát trực tiếp

- Chỉ ghi những gì nhìn hoặc nghe thấy, không diễn giải ý định.

#### Vấn đề được nhận định

- Nêu vấn đề và bằng chứng dẫn tới nhận định.

#### Mong muốn được suy luận

- Nêu từng suy luận và mức độ chắc chắn.

#### Điểm chưa chắc chắn

- Chỉ hỏi những điểm làm thay đổi đáng kể kết quả; ưu tiên đề xuất phương án
  thay vì yêu cầu người dùng tự thiết kế.

#### Visual

- Bố cục:
- Kích thước:
- Màu sắc:
- Vị trí:
- Nhãn và cách hiển thị:

#### Interaction

- Điểm bắt đầu:
- Thao tác chuột/phím:
- Phản hồi tức thời:
- Kết quả:
- Undo/Redo:
- Hủy thao tác:
- Ngoại lệ:

## 6. Mẫu so sánh phương án

| Phương án | Cách vận hành | Ưu điểm | Nhược điểm | Khuyến nghị |
|---|---|---|---|---|
| A |  |  |  |  |
| B |  |  |  |  |
| C |  |  |  |  |

## 7. Mẫu luồng và wireframe

### Luồng thao tác

```text
[Trạng thái ban đầu]
        |
        v
[Người dùng thực hiện thao tác]
        |
        v
[Phản hồi tức thời]
        |
        +---- Hủy/ lỗi ----> [Khôi phục trạng thái]
        |
        v
[Hoàn tất] ---- Undo ----> [Trạng thái ban đầu]
```

### Wireframe

Wireframe phải thể hiện tối thiểu:

- Vùng người dùng tác động.
- Phần tử đang chọn/hover/drag.
- Điểm xuất hiện của phần tử mới.
- Phản hồi khi hợp lệ và không hợp lệ.
- Phạm vi nào được phép thay đổi.

## 8. Mẫu bảng trạng thái

| Giai đoạn | Trạng thái dữ liệu | Hiển thị | Tương tác được phép | Undo/Redo |
|---|---|---|---|---|
| Trước |  |  |  |  |
| Trong khi thao tác |  |  |  |  |
| Hoàn tất |  |  |  |  |
| Hủy/lỗi |  |  |  |  |
| Sau Undo |  |  |  |  |
| Sau Redo |  |  |  |  |

## 9. Mẫu tiêu chí nghiệm thu

```gherkin
Scenario: <Tên hành vi>
  Given <trạng thái ban đầu có thể tái tạo>
  When <một thao tác cụ thể của người dùng>
  Then <kết quả nhìn thấy hoặc dữ liệu có thể kiểm tra>
  And <những phần không được thay đổi>

Scenario: Undo thao tác
  Given <thao tác đã hoàn tất>
  When người dùng thực hiện Undo
  Then toàn bộ thay đổi của thao tác được khôi phục nguyên tử

Scenario: Redo thao tác
  Given thao tác vừa được Undo
  When người dùng thực hiện Redo
  Then kết quả hoàn tất được tái lập chính xác
```

## 10. Mẫu kế hoạch thay đổi code

Trước khi triển khai phải ghi:

- File dự kiến thay đổi:
- Hành vi mới:
- Hành vi giữ nguyên:
- Rủi ro hồi quy:
- Kiểm thử tự động:
- Kiểm tra thủ công:
- Phần ngoài phạm vi:

## 11. Mẫu báo cáo sau triển khai

| Tiêu chí | Kết quả | Bằng chứng/Ghi chú |
|---|---|---|
| AC-01 | `Đã đạt / Chưa đạt / Chưa thể kiểm tra` |  |
| AC-02 | `Đã đạt / Chưa đạt / Chưa thể kiểm tra` |  |

- Phát sinh ngoài phạm vi: Có/Không
- File thực tế đã thay đổi:
- Rủi ro còn lại:
- Quyết định cần cập nhật:

## 12. Sổ quyết định

| ID | Ngày | Quyết định | Trạng thái | Thay thế bởi |
|---|---|---|---|---|
| DEC-001 | 2026-07-24 | Áp dụng quy trình đặc tả và xác nhận trong tài liệu này trước khi sửa UI/interaction | Đã chốt | — |
| DEC-002 | 2026-07-24 | Các quy tắc tại mục 3 là bất biến cho tới khi người dùng đồng ý thay đổi | Đã chốt | — |
| DEC-003 | 2026-07-24 | Prototype hiện tại chưa được coi là giao diện hoặc cách vận hành cuối cùng | Đã chốt | — |
| DEC-004 | 2026-07-24 | Ưu tiên cải tổ vỏ giao diện KNX trên Draw.io hiện tại; chưa thay cơ chế lưu hoặc vị trí dữ liệu trong giai đoạn UX đầu tiên | Đã chốt | — |
| DEC-005 | 2026-07-24 | Giao diện mặc định gồm toolbar nghiệp vụ, Topology Tree bên trái, Canvas ở giữa, Properties bên phải và status bar | Đã chốt | — |
| DEC-006 | 2026-07-24 | Project Layout được phép dịch chuyển nguyên Area để tránh chồng lấn, nhưng không được thay đổi tọa độ tương đối của node Manual bên trong; đây là ngoại lệ hợp lệ đối với quy tắc không tự di chuyển phần tử đã kéo tay | Đã chốt | — |
| DEC-007 | 2026-07-24 | Phase 0.5 tạo Layout Store versioned, stable `knxObjectId`, topology index và Undo bridge trước khi triển khai Area container | Đã chốt | — |
| DEC-008 | 2026-07-24 | Layout metadata được nhúng trong node `knxLayout` của `mxGraphModel`, dữ liệu JSON lưu trong attribute `data` để không bị Draw.io nhận nhầm là Base64; bộ đọc vẫn hỗ trợ định dạng text node cũ. File thiếu metadata được migrate từ geometry mà không tự Auto Layout | Đã chốt | — |
| DEC-009 | 2026-07-24 | Area mxCell chỉ là projection trực quan có geometry; nó không phải Draw.io group và không sở hữu quan hệ nghiệp vụ. Thành viên Area luôn được lấy từ topology index dựa trên metadata | Đã chốt | — |
| DEC-010 | 2026-07-24 | Layout schema version 2 lưu vị trí Area ở cấp Project và vị trí node tương đối trong Area. `mxGeometry` chỉ là projection lên Canvas sau migration | Đã chốt | — |
| DEC-011 | 2026-07-24 | Topology View tắt Page View mặc định. Project bounds được tính từ Backbone và Area containers; Page View chỉ còn là tùy chọn Draw.io phục vụ in/export | Đã chốt | — |
| DEC-012 | 2026-07-24 | Bố trí lại Area là thao tác chủ động `Arrange Areas`; thêm hoặc mở project không tự chạy Project Auto Layout. Riêng Area mới được đặt vào vùng trống để không chồng Area đã có | Đã chốt | — |
| DEC-013 | 2026-07-24 | Chống chồng lấn Area là layout constraint bắt buộc, không phải Auto Layout. Add/Delete/Move làm thay đổi bounds phải tự đẩy các Area phía sau theo `areaNumber`, chỉ đổi `AreaLayout.y` và giữ nguyên relative coordinates | Đã chốt | — |
| DEC-014 | 2026-07-24 | Area container dùng label plain text và `html=0`; HTML card không được dùng làm header Area để tránh raw markup khi cell state được recreate, resize hoặc Undo/Redo | Đã chốt | — |

## 13. Danh sách yêu cầu UI/Interaction

### UX-001 — KNX Workspace shell

Trạng thái: Đã được người dùng xác nhận triển khai ngày 2026-07-24.

Phạm vi:

- Thay lớp giao diện chính bằng toolbar nghiệp vụ KNX.
- Chỉ hiển thị Topology Tree ở panel trái; thư viện shape Draw.io được ẩn khỏi giao diện mặc định.
- Giữ Draw.io Canvas ở trung tâm.
- Luôn dành panel phải cho Properties của đối tượng KNX.
- Thêm tìm kiếm topology, điều khiển zoom tối giản và status bar.
- `Wiring View` và `Function View` chỉ là trạng thái chuẩn bị, chưa hoạt động.

Hành vi giữ nguyên:

- Dữ liệu KNX tiếp tục lưu trong mxCell/XML như prototype hiện tại.
- Save/load, connector, geometry và Undo/Redo tiếp tục dùng cơ chế Draw.io hiện có.
- Add Area, Add Line và Add Device gọi các nghiệp vụ hiện có.
- Auto Layout cũ tạm thời bị khóa cho tới khi Hierarchical Auto Layout ở Phase 2
  bảo toàn đúng node Manual.
- Save tiếp tục gọi action lưu hiện có của Draw.io; định dạng và đích lưu chưa thay đổi.
- Không tự chạy Auto Layout và không tự di chuyển phần tử chỉ vì thay giao diện.

```gherkin
Scenario: Mở KNX Workspace
  Given ứng dụng KNX được tải thành công
  When editor hoàn tất khởi tạo
  Then toolbar KNX, Topology Tree, Canvas, Properties và status bar được hiển thị
  And thư viện shape Draw.io không chiếm giao diện chính

Scenario: Đồng bộ selection từ Tree
  Given một đối tượng KNX tồn tại trên Tree và Canvas
  When người dùng chọn đối tượng trên Tree
  Then đúng đối tượng được chọn và focus trên Canvas
  And Properties hiển thị dữ liệu của đối tượng
  And không có phần tử nào bị di chuyển

Scenario: Không tự Auto Layout
  Given người dùng đã bố trí phần tử trên Canvas
  When KNX Workspace được mở hoặc selection thay đổi
  Then Auto Layout không tự chạy
  And tọa độ phần tử được giữ nguyên
```

### ARCH-001 — Phase 0.5 Layout Foundation

Trạng thái: Đã triển khai và kiểm chứng ngày 2026-07-24. Phase 1 Area Container đã hoàn thành sau nền tảng này.

Phạm vi:

- Mỗi KNX cell có `knxObjectId` và `knxObjectType` ổn định, độc lập với mxCell ID.
- Có index hai chiều `knxObjectId ↔ mxCell` và index parent/children theo topology.
- Index chỉ quét `model.cells` khi khởi tạo/load; thay đổi sau đó được cập nhật
  theo các cell xuất hiện trong model transaction.
- Layout Store schema version 2 tách Area position và node relative position, đồng thời lưu bounds, padding, header, collapsed và layout mode của Area.
- File cũ được migrate từ geometry theo `parentTopologyId`, không đoán parent
  bằng khoảng cách hình học.
- Node từ file cũ mặc định `manual`, `locked=true`.
- Layout metadata được lưu cùng XML trong attribute `data` của node `knxLayout`.
  Không lưu JSON mới dưới dạng text node vì Draw.io có thể nhận nhầm page XML không nén
  thành payload Base64. Loader vẫn đọc text node để phục hồi các file đã tạo trước quyết định này.
- Kéo node tạo một Undo transaction chứa cả geometry và layout snapshot.
- Chưa tạo Area container, chưa tắt Page View và chưa chạy Hierarchical Layout.

Nguồn ưu tiên tọa độ:

```text
Layout Store (Area x/y + Node relativeX/relativeY)
        ↓ Canvas Adapter
mxGeometry là projection hiển thị
```

Trong migration lần đầu, chiều đọc là `mxGeometry → Layout Store` và không có
bước apply ngược, nhằm giữ hình ảnh project cũ nguyên trạng.

Tiêu chí nghiệm thu:

- `AC-0.5-01`: Project cũ giữ geometry; node cũ là Manual; Auto Layout không chạy.
- `AC-0.5-02`: `knxObjectId` giữ nguyên qua save/load.
- `AC-0.5-03`: Kéo node cập nhật relative coordinates, chuyển Manual, không đổi
  parent hoặc Individual Address.
- `AC-0.5-04`: Undo/Redo kéo node khôi phục cả geometry và NodeLayout.
- `AC-0.5-05`: Di chuyển Area theo nhóm giữ nguyên relative coordinates.
- `AC-0.5-06`: Apply Layout không tạo event loop hoặc Undo step phụ.
- `AC-0.5-07`: Migration chỉ dùng quan hệ topology có sẵn để xác định parent.

Kết quả kiểm chứng Phase 0.5:

- Cả bảy tiêu chí `AC-0.5-01` đến `AC-0.5-07` đều đạt.
- Round-trip đã được kiểm tra với cả `mxfile` nén và không nén; stable object ID,
  project ID, geometry và Layout Store đều được giữ nguyên.
- Auto Layout cũ đang bị khóa cho đến Phase 2 để không vi phạm trạng thái Manual.
- Bằng chứng giao diện: `docs/phase-0.5-layout-foundation.png`.

### UX-002 — Area Container và không gian Topology

Trạng thái: Đã triển khai và kiểm chứng ngày 2026-07-24.

Phạm vi:

- Mỗi Area có `AreaLayout` riêng gồm position, bounds, padding, header, collapsed và layout mode.
- Node thuộc Area dùng `relativeX`/`relativeY`; vị trí Canvas bằng origin Area cộng tọa độ tương đối.
- Area mxCell là projection nền/header, không phải nguồn quan hệ topology và không phải group cell.
- Main Line và Secondary Line được giới hạn theo nội dung của đúng Area.
- `Arrange Areas` xếp Area tăng dần theo `areaNumber`, theo chiều dọc và có khoảng cách tối thiểu.
- Project Layout chỉ đổi origin Area; relative coordinates và trạng thái Manual của node con không đổi.
- Page View tắt mặc định; có Fit Project, Fit Area, Fit Selection và Actual Size.
- Connector dư, selection decoration và temporary UI không tham gia tính Area bounds.

Nguồn ưu tiên tọa độ:

```text
AreaLayout.x/y + NodeLayout.relativeX/relativeY
                    ↓ guarded projection
                mxGeometry
```

Migration:

- File không có layout schema 2 được đọc quan hệ Area từ topology metadata.
- Geometry tuyệt đối cũ được đổi thành tọa độ tương đối nhưng không apply ngược trong lần migrate đầu tiên.
- Node cũ là `manual`, `locked=true`; không tự chạy Auto Layout.
- Object không xác định được Area vẫn giữ nguyên geometry và được ghi vào migration warnings; không đoán theo vị trí.

Quy tắc vận hành:

- `Arrange Areas` là thao tác explicit và Undo/Redo nguyên tử.
- Dịch Area chỉ cập nhật origin của Area; không ghi lại relative coordinates của từng node.
- Thêm Area đặt Area mới vào vùng trống nhưng không bố trí lại nội dung Area cũ.
- Thêm Line hoặc Device cập nhật bounds cục bộ và chạy Project reflow bắt buộc để chống overlap; đây không phải Auto Layout nội dung và không thay đổi node Manual.
- Phase này không thay đổi Card, Properties, Validation, Wiring View hoặc Function View.

Tiêu chí nghiệm thu:

- `AC-AREA-01`: Area có layout và bounds thực bao phủ nội dung.
- `AC-AREA-02`: Arrange Areas tạo các bounds không giao nhau và giữ khoảng cách cấu hình.
- `AC-AREA-03`: Main Line chỉ nằm trong Area tương ứng.
- `AC-AREA-04`: Device được projection trong bounds đúng Area theo topology metadata.
- `AC-AREA-05`: Dịch Area giữ nguyên relative coordinates và topology parent.
- `AC-AREA-06`: File cũ giữ geometry, node Manual và không tự layout.
- `AC-AREA-07`: Parent không được suy ra hoặc thay đổi theo vị trí.
- `AC-AREA-08`: Undo/Redo khôi phục AreaLayout và toàn bộ projection.
- `AC-AREA-09`: Selection được giữ khi Area di chuyển.
- `AC-AREA-10`: Topology View không có page border và hỗ trợ Fit Project.
- `AC-AREA-11`: Connector dư không làm thay đổi Area bounds.
- `AC-AREA-12`: Backbone nối đúng Area Coupler sau khi Area được bố trí.

Bằng chứng giao diện: `docs/phase-1-area-containers.png`.

### UX-003 — Topology mutation reconcile và Area reflow

Trạng thái: Đã triển khai và kiểm chứng ngày 2026-07-24 từ video `2026-07-24 14-37-32.mp4`.

Pipeline chung:

```text
Topology mutation
  → register changed cells in topology index
  → update changed Line bounds
  → calculate changed Area content bounds
  → resize Area container
  → resolve following Area overlap by areaNumber
  → update Backbone junctions
  → project geometry with transaction guard
  → restore selection
  → render sorted Tree
```

Quy tắc:

- Add Area, Add Line, Add Device và Delete KNX chạy trong một outer mxGraph transaction.
- Một mutation chỉ tạo một Undo history entry, gồm topology cells, Layout Store, Area bounds,
  vị trí các Area phía sau, connector và selection.
- Area phía sau chỉ bị đẩy xuống khi `area.y < previous.y + previous.height + areaGap`.
- Reflow không đổi `relativeX`, `relativeY`, parent, Individual Address hoặc layout mode.
- Tree sort Area theo area number; Main Line trước; Secondary Line theo line number;
  Device theo device number. Insertion order và geometry không tham gia sort.
- Area header không render HTML và không tham gia content bounds.
- `topologyReconcile` là update source được guard; Canvas projection không phát event loop ngược.

Kết quả nghiệm thu:

- `AC-01`: Không còn raw HTML sau create, resize, Undo/Redo và save/load.
- `AC-02`: Add Line cập nhật Line/Area bounds trong cùng transaction.
- `AC-03`: Add Device mở rộng Area nhưng không bố trí lại node Manual.
- `AC-04`: Area phía sau tự reflow; không cần bấm Arrange Areas.
- `AC-05`: Relative coordinates của Area bị đẩy giữ nguyên.
- `AC-06`: Main Line vẫn nằm trong đúng Area.
- `AC-07`: Tree đúng hierarchy và sort theo địa chỉ.
- `AC-08`: Selection, Tree và Properties giữ đúng object sau reflow.
- `AC-09`: Undo/Redo Add/Delete khôi phục nguyên tử topology và layout.
- `AC-10`: Mỗi mutation phát đúng một model event và một Undo entry.

Bằng chứng sau sửa: `docs/video-reflow-fixed.png`.

### DEC-015 — Adaptive layout không thay đổi node Manual

Ngày: 2026-07-24  
Trạng thái: Đã chấp thuận và triển khai trong Phase A.

Quyết định:

- Secondary Line ở chế độ Auto được đóng gói theo grid, theo thứ tự `lineNumber` từ trái sang phải và từ trên xuống dưới.
- Device ở chế độ Auto được xếp theo `deviceNumber`, tối đa 5 Device mỗi cột; khi đầy sẽ tạo cột tiếp theo.
- Thuật toán tìm slot phải tránh bounds của Device Manual/locked. Không được di chuyển Device Manual để lấy chỗ cho Device mới.
- Nếu node Manual làm Line cần nhiều không gian hơn, Line và Area được phép mở rộng; Project Reflow chỉ dịch nguyên các Area phía sau.
- Adaptive layout không thay đổi parent topology, Individual Address, `relativeX`/`relativeY` hoặc layout mode của node Manual.
- Các tham số `maxLinesPerRow`, `maxDevicesPerColumn`, gap và `maxAreaWidth` là cấu hình dùng chung, không hard-code theo một Area cụ thể.

Hệ quả:

- Một Line có Device Manual nằm ngoài grid chuẩn có thể cần thêm cột hoặc Area rộng hơn. Đây là hành vi bảo toàn thao tác người dùng, không phải lỗi sort.
- Tối ưu mật độ card để đạt khả năng đọc toàn Project ở zoom từ 60% trở lên thuộc Phase D; Phase A không tự thu nhỏ card.

### UX-004 — Phase A: Adaptive Line và Device Layout

Trạng thái: Đã triển khai và kiểm chứng ngày 2026-07-24.

Pipeline:

```text
Topology mutation
  → resolve changed Area from topology index
  → layout Auto devices into available grid slots
  → measure each Secondary Line tile
  → pack Auto Secondary Lines into Area rows
  → update Line and Area bounds
  → run mandatory Project Reflow for following Areas
  → project final geometry to mxGraph with transaction guard
  → restore selection and commit one Undo entry
```

Quy tắc vận hành:

- Tối đa mặc định 2 Secondary Line trên một hàng và 5 Device trên một cột.
- Line thứ ba trở đi xuống hàng khi vượt số cột hoặc chiều rộng Area tối đa.
- Device mới chỉ chiếm slot không giao với Device Manual/locked.
- Add Line/Add Device không tự chạy Auto Layout toàn Project; chỉ reconcile Area bị ảnh hưởng và chống overlap ở cấp Project.
- Card Design, connector routing, ancestor highlight, Properties, Toolbar và branding không thuộc Phase A.

Kết quả project kiểm thử 3 Area, 5 Secondary Line và 25 Device:

- Area không chồng lấn; Main Line nằm trong Area tương ứng.
- Line 1.1 có 10 Device và Line 1.2 có 8 Device được chia nhiều cột, không có card chồng nhau.
- Line thứ ba thử nghiệm xuống hàng; Undo khôi phục số Line và selection.
- Device Manual giữ nguyên geometry khi thêm Device Auto.
- Add Device làm Area thay đổi bounds vẫn Undo/Redo nguyên tử và giữ selection.
- Save/load giữ nguyên chính xác Area layouts, schema layout 2 và topology counts.
- Fit Project trên viewport Full HD hiện đạt 35%, chưa đạt mục tiêu 60%; nguyên nhân là kích thước card hiện tại và tổng chiều cao ba Area. Tiêu chí này được chuyển sang Phase D, không được tuyên bố đạt trong Phase A.

Bằng chứng giao diện: `docs/phase-a-adaptive-layout.png`.

### UX-005 — Compact Area và đồng bộ Undo/Redo sau Adaptive Layout

Trạng thái: Đã sửa và kiểm chứng ngày 2026-07-24.

Nguyên nhân hồi quy quan sát từ ảnh người dùng:

- Area chỉ có Main Line vẫn bị ép theo `adaptiveMinAreaWidth` và `minHeight` dành cho grid nhiều Line, tạo vùng trắng lớn và đẩy Area có nội dung ra ngoài viewport.
- Area header lặp Name/Address theo dạng `Area 1 1`, dùng số Line gồm cả Main Line và không xử lý số ít/số nhiều.
- Cache label của Area không bị invalidate sau Undo/Redo topology, làm Tree/Status và header Canvas hiển thị số Device khác nhau.
- Add command cũ tạo topology và reconcile layout qua hai transaction lồng không cùng outer boundary; selection sau Redo có thể không được khôi phục sau khi cell được đăng ký lại vào topology index.

Quyết định:

- Area không có Secondary Line hoặc Device dùng chiều cao compact 210; Area có nội dung nhánh tiếp tục dùng adaptive minimum 360.
- Width vẫn lấy từ bounds thật của Area Coupler/Main Line, tối thiểu compact 680; không cắt ngắn Main Line để ép kích thước.
- Header dùng `Area Name [address]` và dòng `Main Line x.0 · n Line(s) · n Device(s)`.
- Add Area/Add Line/Add Device chạy trong một outer `runTopologyMutation`; topology, layout, Area bounds và selection tạo một Undo entry.
- Area label được invalidate khi hierarchy thay đổi, không dùng dữ liệu đếm cache.
- `KnxLayoutChange.appliedSelectionIds` được khôi phục sau khi toàn bộ child change đã cập nhật topology index; không dùng timer để ép thứ tự.
- Tree refresh theo Selection Model để Canvas, Tree, Properties/Status không giữ selected state cũ.

Kết quả kiểm chứng trình duyệt:

- Project 3 Area, trong đó Area 1 và 2 chỉ có Main Line, fit được ở 60% trên Full HD thay vì 35%.
- Area compact hiển thị khoảng 750 × 210 theo content bounds; Area có 2 Line/6 Device vẫn giữ adaptive grid.
- Undo/Redo Add Device: `2 → 1 → 2 Device`; header, Tree, Status và selection đồng bộ.
- Undo/Redo Add Line: `3 → 2 → 3 Line`; selection khôi phục đúng object tồn tại ở mỗi trạng thái.

Bằng chứng giao diện: `docs/phase-a-compact-area-fix.png`.

## 15. UX-VIDEO-1637 — Wrapped Secondary Line routing

- Trạng thái: Đã triển khai ở mức code và unit test ngày 2026-07-24; chờ đối chiếu trực quan trên trình duyệt.
- Nguồn bằng chứng: `2026-07-24 16-37-17.mp4`.
- Phạm vi nhỏ: Secondary Line xuống hàng và kích thước Line rỗng.

Quyết định:

- Secondary Line khi wrap sang hàng mới phải có feeder riêng từ Main Line; feeder
  không được trùng trục với bus của Line ở hàng trên.
- Secondary Line không có Device chỉ dùng một bus stub ngắn, không được dành sẵn
  chiều cao tương đương một hàng Device.
- Sửa layout không được thay đổi parent, Individual Address hoặc tọa độ tương đối
  của node Manual.
- Area bounds và Project reflow vẫn được cập nhật trong pipeline reconcile chung.
- Card Design và Properties nằm ngoài phạm vi thay đổi này.

```gherkin
Scenario: Line thứ ba xuống hàng
  Given Area có hai Secondary Line trên hàng đầu
  When người dùng thêm Secondary Line thứ ba
  Then Line mới nằm ở hàng tiếp theo
  And feeder của nó không trùng bus của Line ở hàng trên

Scenario: Line rỗng compact
  Given Secondary Line chưa có Device
  When layout được reconcile
  Then Line chỉ hiển thị bus stub ngắn
  And Area không dành sẵn một hàng Device ảo
```

## 16. UX-IMAGE-TREE-01 — Tree hierarchy và vùng cuộn

- Trạng thái: Đã triển khai và smoke test ngày 2026-07-24.
- Nguồn bằng chứng: `image.png`.

Quyết định:

- Tree là projection theo hierarchy nghiệp vụ; Secondary Line hiển thị dưới Main
  Line dù metadata nghiệp vụ của Line vẫn tham chiếu Area.
- Mức hiển thị là `Area -> Main Line -> Secondary Line -> Coupler/Device`.
- Search là footer cố định và nội dung Tree phải có vùng cuộn riêng, không được bị
  Search che phủ.
- Với project cũ, Line có `localAddress = 0` hoặc địa chỉ kết thúc bằng `.0` được
  nhận là Main Line khi thiếu `lineRole`; không suy luận bằng geometry.
- Hotfix này không thay đổi parent, address hoặc Canvas layout.

## 17. UX-ROUTING-LOAD-01 — Chuẩn hóa topology edge khi load

- Trạng thái: Đã triển khai và smoke test ngày 2026-07-24.

Quyết định:

- Khi load project, topology edge do hệ thống quản lý phải được chuẩn hóa lại về
  orthogonal routing và không có arrowhead.
- Waypoint cũ của edge có `knxTopologyEdge=1` được phép xóa vì nó là projection
  hệ thống, không phải topology data.
- Junction ẩn của topology edge luôn là Auto projection; quy tắc bảo toàn Manual
  chỉ áp dụng cho phần tử người dùng có thể bố trí trực tiếp.
- Không di chuyển card, bus hoặc Device Manual trong quá trình repair routing.
- Dây W thông thường không có `knxTopologyEdge=1` phải được giữ nguyên.
- Geometry chỉ được dùng để chọn tuyến hiển thị cho file cũ; parent KNX luôn lấy
  từ topology metadata.

## 18. UX-VIDEO-1637-02 — Secondary Line dùng bus ngang

Trạng thái: Đã triển khai và kiểm tra runtime ngày 2026-07-24.

Nguồn quyết định:

- Video lỗi `2026-07-24 16-37-17.mp4`.
- Bộ ảnh mục tiêu trong `goal/`, đặc biệt ảnh `03_46_45 PM`.

Quan sát đã chốt:

- Lỗi xuất hiện từ projection topology tự động, không phụ thuộc người dùng bấm `W`.
- Bus dọc của Secondary Line tạo cảm giác Line sau nối tiếp Line trước và sinh feeder dài khó đọc.
- Ảnh mục tiêu biểu diễn Line Coupler dưới Main Line, sau đó bus Secondary Line đi ngang từ Coupler.

Quyết định:

- Secondary Line Auto dùng bus ngang cao 4 px, không mũi tên.
- Line Coupler nằm dưới Main Line; nhánh Main Line đi vào cạnh trên Coupler ở hàng đầu.
- Bus bắt đầu tại cạnh phải Line Coupler.
- Device Auto nằm dưới bus; junction ở tâm ngang Device và connector đi vào cạnh trên card.
- Ba Secondary Line rỗng được phép nằm cùng hàng; Line tiếp theo mới wrap khi vượt giới hạn chiều rộng/số cột.
- Khi load lại, repair routing phải đọc `LineLayout.busDirection`; không được áp lại giả định bus dọc.
- Layout cũ thiếu `busDirection` chỉ được migrate khi bus và Line Coupler đều còn ở chế độ Auto; gặp một node Manual thì giữ nguyên Area, không tự sắp xếp lại.
- Các junction ẩn là projection hệ thống và có thể được đặt lại. Card/bus Manual, parent topology và Individual Address không đổi.

```gherkin
Scenario: Tạo ba Secondary Line mà không bấm W
  Given Area đang chỉ có Main Line
  When người dùng lần lượt thêm Line 1.1, 1.2 và 1.3
  Then ba Line Coupler nằm dưới Main Line
  And mỗi Coupler có bus ngang độc lập
  And không xuất hiện một bus dọc dài nối lẫn các Line

Scenario: Mở lại project dùng bus ngang
  Given project đã lưu Line có busDirection horizontal
  When project được mở lại
  Then junction Line nằm ở đầu trái bus
  And junction Device nằm trên bus tại tâm ngang Device
  And routing không quay về hình dạng bus dọc cũ
```

Bằng chứng runtime: `docs/runtime-horizontal-lines.png`.

## 19. UX-VIDEO-1637-03 — Một nguồn geometry trong Add/Undo/Redo

Trạng thái: Đã triển khai và kiểm tra bằng Chromium ngày 2026-07-24.

Quyết định:

- Khi Area Layout Engine đang quản lý topology, thuật toán placement dọc legacy trong
  `layoutAddedLine()` và `layoutAddedDevice()` không được ghi geometry trung gian.
- Luồng legacy chỉ tạo cell, junction và edge cần thiết; reconcile pipeline là nơi duy nhất
  ghi final geometry của Line, Coupler, Device và Area trong transaction Add.
- Ba Secondary Line trong tình huống video phải tiếp tục nằm trực tiếp dưới Main Line;
  Area được phép nới ngang để tránh tạo feeder dọc dài quá sớm.
- Undo/Redo phải khôi phục final horizontal geometry, không được tái lập geometry dọc
  từng tồn tại giữa thao tác Add.

```gherkin
Scenario: Redo Device không làm biến dạng bus
  Given Line dùng bus ngang và vừa được thêm Device
  When người dùng Undo rồi Redo
  Then Device count trở về giá trị sau Add
  And selection trở lại Device vừa thêm
  And bus vẫn cao 4 px
  And không xuất hiện hình chữ nhật xanh từ geometry dọc cũ
```

Bằng chứng: `docs/runtime-auto-reflow-undo-fixed.png`.

## 20. UX-AREA-OUTPUT-01 — Không có đoạn bậc thừa sau Area Coupler

Trạng thái: Đã triển khai và kiểm tra Chromium ngày 2026-07-24.

Quyết định:

- Quan hệ Area Coupler → Main Line chỉ có một routed projection.
- Junction `Main Line/start` luôn trùng với đầu hình học của Main Line.
- `ensureTopologyConnection()` không tạo direct edge nếu routed edge đã đại diện cùng logical source/target.
- Duplicate direct edge của project cũ không được hiển thị sau load/repair.

```gherkin
Scenario: Main Line bắt đầu thẳng từ Area Coupler
  Given Area có Area Coupler và Main Line
  When Area được tạo, arrange hoặc mở lại
  Then Main Line bắt đầu tại cạnh phải Area Coupler
  And không có đoạn dây hình bậc hoặc chữ U
  And không có hai edge hiển thị cho cùng quan hệ
```

Bằng chứng: `docs/runtime-area-coupler-stub-fixed-v2.png`.

## 21. UX-DEVICE-ROUTING-01 — Connector không xuyên card Device

Trạng thái: Đã triển khai và kiểm tra Chromium ngày 2026-07-24.

Quyết định:

- Với Device Auto xếp nhiều hàng trong một cột, chỉ Device đầu cột nối trực tiếp từ bus.
- Device hàng sau dùng đoạn nối ngắn từ cạnh dưới Device trước tới cạnh trên Device sau.
- Projection dạng chuỗi không thay đổi `parentTopologyId`, Line hoặc Individual Address.
- Mỗi cột Device có chuỗi riêng; Device đầu cột mới luôn lấy nguồn từ bus.
- Device Manual giữ nguyên vị trí và không bị tự động đưa vào chuỗi nếu điều đó thay đổi layout thủ công.

```gherkin
Scenario: Bốn Device trong một cột
  Given Line 2.1 dùng bus ngang
  When bốn Device Auto được thêm vào Line
  Then bus nối vào Device đầu tiên
  And Device 2 nối từ đáy Device 1
  And Device 3 nối từ đáy Device 2
  And Device 4 nối từ đáy Device 3
  And không connector nào chạy xuyên phần nội dung card
```

Bằng chứng: `docs/runtime-device-chain-routing-fixed.png`.

## 22. UX-DEVICE-GRID-01 — Adaptive grid theo goal

Trạng thái: Đã triển khai và kiểm tra Chromium ngày 2026-07-24.

Quyết định:

- Không dùng một `maxDevicesPerColumn` cố định khiến bốn Device thành một cột dài.
- Grid được cân bằng từ số lượng Device, tối đa ba cột trong Phase A.
- Mapping mục tiêu: `2 -> 2×1`, `4 -> 2×2`, `5 -> 3+2`, `8 -> 3+3+2`.
- Mỗi cột là một routing chain độc lập; Device đầu cột lấy nhánh từ bus.
- Thứ tự địa chỉ và parent Line không thay đổi do cách trình bày grid.
- Auto layout metadata dùng `deviceGridVersion = 2`; Line Auto phiên bản cũ được migrate khi load, còn node Manual giữ nguyên.

```gherkin
Scenario: Bốn Device giống ảnh goal
  Given Line có bốn Device Auto
  When adaptive layout được reconcile
  Then Device được chia thành hai cột và hai hàng
  And hai Device đầu cột nối trực tiếp từ bus
  And các Device hàng dưới nối từ Device phía trên
  And không edge nào xuyên card

Scenario: Tám Device không tạo một cột dài
  Given Line có tám Device Auto
  When adaptive layout được reconcile
  Then Device được chia thành ba cột cân bằng
  And Area bounds bao phủ toàn bộ grid
```

Bằng chứng: `docs/runtime-goal-adaptive-device-grid.png`.

## 23. UX-LINE-DENSITY-01 — Secondary Line dùng grid hai cột ổn định

Trạng thái: Đã chốt ngày 2026-07-24 từ video `18-11-39`.

- Một hàng Area có tối đa hai cụm Secondary Line.
- Vị trí cột không phụ thuộc chiều rộng Line ở riêng từng hàng; mọi hàng dùng
  chung trục X theo cột.
- Các Line trong cùng cột dùng chung một feeder gutter ở mép trái Coupler.
- Hàng đầu và các hàng sau không được tạo hai trục feeder gần song song.
- Auto projection dùng layout version `3`; migration không được đụng vào Area
  có Secondary Line hoặc Coupler đang ở Manual mode.
- Thêm Line chỉ làm Area mở rộng và reflow Area sau; không đổi node Manual.
- Đây là thay đổi projection/layout, không thay đổi hierarchy KNX.

Bằng chứng runtime với 12 Secondary Line và 5 Device:
`docs/runtime-two-column-12-lines.png`.

## 24. UX-STABLE-DEVICE-SLOT-01 — Add Device không rebalance

Trạng thái: Đã chốt ngày 2026-07-24 từ video `18-31-36` và bộ ảnh `goal/`.

- Ảnh `goal/ChatGPT Image Jul 24, 2026, 03_46_45 PM.png` là chuẩn chính cho
  bố cục Topology View.
- Device Auto dùng slot cố định theo `deviceNumber`; mỗi bank có `4` cột,
  mỗi cột có `2` Device, tổng sức chứa `8` Device/bank.
- Thêm Device không được thay đổi slot hoặc geometry của Device đã tồn tại.
- Không gọi `fit`, `center`, `scrollCellToVisible` hoặc thay đổi zoom sau Add.
- Selection được phép đổi sang object mới nhưng viewport phải giữ nguyên.
- Tree và Canvas chỉ công bố final state sau khi layout transaction hoàn thành.
- Line rỗng không giữ chỗ Device; chỉ dùng bus stub tối thiểu.
- Project reflow vẫn được phép dịch nguyên Area để chống overlap.

Quyết định này **thay thế** `UX-DEVICE-GRID-01` về cách phân phối Device Auto. Grid cân bằng
`2×2`, `3+2`, `3+3+2` không còn được sử dụng vì làm thay đổi slot của Device cũ.

Kết quả kiểm tra ngày 2026-07-24:

- 12 lần Add liên tiếp giữ nguyên geometry của toàn bộ Device đã tồn tại.
- Viewport không đổi qua Add, Undo và Redo.
- Add Device, cập nhật Line/Area, Project reflow và selection là một model transaction.
- Undo/Redo khôi phục selection nghiệp vụ sau khi Draw.io xử lý history mặc định.

## 25. UX-DEVICE-BANK-01 — Giới hạn chiều rộng cho Line lớn

Trạng thái: chốt từ video `2026-07-24 20-37-08.mp4`.

- Stable slot không đồng nghĩa với mở thêm cột vô hạn.
- Mỗi Line dùng các bank Device có sức chứa cố định và số cột tối đa cố định.
- Khi bank đầy, bank tiếp theo nằm dưới; slot của mọi Device cũ giữ nguyên.
- Area được phép tăng chiều cao và reflow Area sau như một khối.
- Mỗi bank/cột là một routing chain độc lập; connector không được đi xuyên bank trước.
- Device trên Main Line cũng phải đi qua layout projection này, không dùng geometry legacy.
- Card Auto có thể được compact để đạt mật độ giống ảnh goal; card/node Manual không bị
  thay đổi kích thước tự động.
- Cấu hình đã chốt: `maxDeviceColumns = 4`, `maxAreaWidth = 2300`,
  `deviceGridVersion = 6`.
- Soak test đã đạt với 104 Device và stress test 400 Device: không Area overlap,
  không card overlap, không bus xuyên card; Add đơn lẻ giữ nguyên viewport và geometry cũ.

## 26. UX-PROGRESSIVE-LINE-01 — Progressive Disclosure cho Secondary Line

Trạng thái: **Thay thế** bởi Standard KNX Mode ngày 2026-07-25. Static prototype
được giữ làm tài liệu tham khảo, không còn là workflow Add Device hiện hành.

- Không tiếp tục mở rộng square grid hoặc fixed-width Device bank trong Project Overview.
- Secondary Line có View State `collapsed | compact | expanded`; `focusLineId` quản lý
  Line Detail Mode riêng.
- View State không phải Domain parent và không thay đổi topology, Individual Address hoặc
  geometry Manual đã lưu.
- Collapsed chỉ hiển thị Line Coupler, tên Line, Device count và trạng thái.
- Compact hiển thị bus, tối đa 4 Device đầu và `+ N more`; Device/edge bị ẩn không tham gia
  content bounds.
- Expanded và Focus dùng bus band ngang, tối đa 5 Device/band; thêm Device chỉ cấp slot
  cuối band hoặc tạo band kế tiếp, không phân phối lại Device cũ.
- Project Overview không tự Expand tất cả Line. Focus Line được phép lưu viewport Project,
  fit Line và khôi phục viewport khi Back to Project.
- LOD do zoom chỉ đổi label/style/visibility, không chạy layout và không đổi slot.
- Tree vẫn hiển thị hierarchy đầy đủ. Chọn Device bị ẩn chỉ highlight Line và mở Properties;
  `Reveal Device` mới Expand/Focus Line.

Static prototype:

- `docs/prototypes/knx-line-progressive-disclosure.html`
- 12 ảnh Full HD tại `docs/prototypes/screenshots/` cho 4/12/30 Device và bốn mode.
- Kiểm tra Chromium 1920×1080, 100%: không card overlap; Focus 30 Device hiển thị đủ
  6 bus band và đọc được Name/IA.
# Quyết định thay thế 2026-07-25 — Standard KNX Mode

- Add Area tự tạo Area Coupler, Main Line và dây cấu trúc.
- Add Line tự tạo Line Coupler, feeder và bus stub ngắn.
- Add Device không tự đặt, không chạy Device Grid và không tự tạo connector.
- Sau Add Device, người dùng đặt card bằng Placement Preview; trạng thái sau
  khi đặt là `PlacedUnconnected`.
- Connect Bus là thao tác riêng và là Undo Command riêng.
- Xóa dây không xóa Device, không đổi parent và không đổi Individual Address.
- Connector và geometry không được dùng để suy ra topology parent.
- Các quyết định Auto Device Grid, Auto Placement Device và Auto Wiring Device
  trước đây được đánh dấu **Thay thế**.

## 27. UX-STANDARD-KNX-01 — Placement Device và Connect Bus thủ công

Trạng thái: Đã triển khai kỹ thuật; chờ người dùng nghiệm thu.

### Add Device

- Chỉ bật khi một Secondary Line hợp lệ đang được chọn.
- Sau khi bấm, card preview đi theo con trỏ; chưa tạo mxCell thật.
- Click hoặc Enter: commit tại vị trí hợp lệ.
- Esc hoặc chuột phải: hủy, không để lại Device/layout/Undo step.
- Giữ Shift khi đặt: tạm bỏ snap grid.
- Vị trí hợp lệ phải thuộc Area của parent Line, không nằm trên header/coupler/card khác.
- Có thể mở rộng Area ở cạnh phải hoặc dưới; Area sau được reflow nguyên khối.
- Sau commit: `layoutMode=manual`, `PlacedUnconnected`, selected; không tạo dây,
  không Auto Layout, không Fit/Center và không đổi zoom.

### Connect Bus

- Khởi động bằng toolbar `Connect Bus`, context menu, action trong Properties hoặc `W`.
- Nếu con trỏ không nằm trên object, `W` dùng Device đang selected làm điểm bắt đầu.
- Port mặc định của Device ở giữa cạnh trái; dây orthogonal và không có mũi tên.
- Click để tạo waypoint theo Wire Mode của Draw.io; Esc hủy thao tác.
- Chỉ bus thuộc parent Line được chấp nhận. Bus Line khác không đổi parent/address và
  không tạo connection hợp lệ.
- Hoàn tất dây chuyển trạng thái sang `Connected`.
- Xóa dây chuyển về `PlacedUnconnected`; Device, parent và address giữ nguyên.

### Undo/Redo

- Add/Place Device là một command.
- Connect Bus là command tiếp theo, độc lập.
- Undo lần 1 sau chuỗi Add + Connect chỉ xóa dây.
- Undo lần 2 mới xóa Device.
- Delete connector + cập nhật trạng thái là một transaction; Undo phục hồi cả hai.

### Tương thích

- Project cũ không bị Auto Layout hoặc tự nối dây khi load.
- Trạng thái connection được tính từ edge metadata và topology index, không từ vị trí.
- Device không có edge trở thành `PlacedUnconnected`; không tạo connector thay người dùng.
