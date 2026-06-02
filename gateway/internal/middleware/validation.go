package middleware

import (
	"encoding/json"
	"errors"
	"net/http"
	"slices"
	"strings"
)

const maxBodyBytes = 1 << 20 // 1MB

var allowedContentTypes = []string{
	"application/json",
	"application/x-www-form-urlencoded",
	"multipart/form-data",
}

// RequestValidationMiddleware kiểm tra Content-Type và giới hạn kích thước body.
func RequestValidationMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Nhận diện request có mang payload: ContentLength > 0 hoặc dùng Chunked Encoding
		hasBody := r.ContentLength > 0 || len(r.TransferEncoding) > 0

		if hasBody {
			ct := r.Header.Get("Content-Type")

			if ct == "" {
				writeJSON(w, http.StatusUnsupportedMediaType, "missing_content_type")
				return
			}

			mediaType := strings.ToLower(strings.TrimSpace(strings.Split(ct, ";")[0]))
			if !isAllowedContentType(mediaType) {
				writeJSON(w, http.StatusUnsupportedMediaType, "unsupported_media_type")
				return
			}

			// Bọc body để Go tự reject khi đọc quá giới hạn.
			// Lỗi sẽ được bắt bởi handler hoặc ErrorHandler của ReverseProxy —
			// nhưng ta cần báo 413 trước khi forward sang backend.
			r.Body = http.MaxBytesReader(w, r.Body, maxBodyBytes)
		}

		// Dùng responseRecorder nhỏ để bắt trường hợp proxy trả 413 do body quá lớn
		rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(rec, r)

		// MaxBytesReader khiến ReverseProxy gặp lỗi khi đọc body và trả về 502 BadGateway.
		// Ta đổi lại thành 413 để client hiểu đúng.
		if rec.status == http.StatusBadGateway {
			// Kiểm tra xem lỗi có phải do body too large không
			var maxBytesErr *http.MaxBytesError
			if errors.As(rec.bodyErr, &maxBytesErr) {
				writeJSON(w, http.StatusRequestEntityTooLarge, "payload_too_large")
			}
		}
	})
}

// statusRecorder ghi lại status code để kiểm tra sau khi handler chạy xong
type statusRecorder struct {
	http.ResponseWriter
	status  int
	bodyErr error
}

func (r *statusRecorder) WriteHeader(code int) {
	r.status = code
	r.ResponseWriter.WriteHeader(code)
}

func writeJSON(w http.ResponseWriter, status int, errCode string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": errCode})
}

// isAllowedContentType kiểm tra xem media type có nằm trong danh sách cho phép không
func isAllowedContentType(mediaType string) bool {
	return slices.Contains(allowedContentTypes, mediaType)
}
