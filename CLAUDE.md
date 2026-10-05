# Pacific Ash — quy tắc cho agent

**Trước khi viết hay sửa bất kỳ dòng code nào**, làm đủ bốn bước. Người thiết kế sửa `design/` và `GDD.md` bất cứ lúc nào, không dựa vào trí nhớ.

1. Chạy `ls -l --time-style=+%Y-%m-%dT%H:%M GDD.md AGENT_GUIDE.md design/*`, so với bảng "Snapshot file thiết kế" trong `PROGRESS.md`. File mới hơn thì đọc lại toàn bộ file đó.
2. Đọc `PROGRESS.md` (phase, task đang làm, câu hỏi mở).
3. Đọc `DEVELOPMENT_PLAN.md` mục 1 và phase hiện tại.
4. Đọc `AGENT_GUIDE.md` và các file `design/` liên quan task (thứ tự ở `AGENT_GUIDE.md` mục 2).

Sau khi code: chạy lệnh nghiệm thu, cập nhật `PROGRESS.md` (trạng thái task, đã làm/chưa làm, snapshot nếu đã đọc lại thiết kế).

Thiết kế thiếu, mâu thuẫn, hoặc cần dependency mới: hỏi, không đoán. Không sửa số trong `design/ships.json`. Không sửa `design/` và `GDD.md` (của người thiết kế).
