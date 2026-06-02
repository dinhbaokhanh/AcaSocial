package middleware

import (
	"encoding/json"
	"net/http"
	"slices"
	"strings"
)

// maxBodyBytes giới hạn kích thước body tối đa: 10MB để hỗ trợ upload avatar
// MaxBytesReader sẽ trả lỗi 413 tự động khi vượt quá
const maxBodyBytes = 10 << 20 // 10MB

var allowedContentTypes = []string{
	"application/json",
	"application/x-www-form-urlencoded",
	"multipart/form-data",
}

// RequestValidationMiddleware kiểm tra Content-Type và giới hạn kích thước body.
// Chạy trước tất cả handler khác để reject sớm các request không hợp lệ.
func RequestValidationMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Nhận diện request có mang payload
		hasBody := r.ContentLength > 0 || r.ContentLength == -1 // -1 = chunked

		if hasBody {
			ct := r.Header.Get("Content-Type")

			if ct == "" {
				writeJSONError(w, http.StatusUnsupportedMediaType, "missing_content_type")
				return
			}

			// Tách "application/json; charset=utf-8" → "application/json"
			mediaType := strings.ToLower(strings.TrimSpace(strings.Split(ct, ";")[0]))
			if !isAllowedContentType(mediaType) {
				writeJSONError(w, http.StatusUnsupportedMediaType, "unsupported_media_type")
				return
			}

			// Giới hạn kích thước body — http.Server sẽ tự trả 413 nếu vượt quá
			r.Body = http.MaxBytesReader(w, r.Body, maxBodyBytes)
		}

		next.ServeHTTP(w, r)
	})
}

func writeJSONError(w http.ResponseWriter, status int, errCode string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": errCode})
}

func isAllowedContentType(mediaType string) bool {
	return slices.Contains(allowedContentTypes, mediaType)
}
