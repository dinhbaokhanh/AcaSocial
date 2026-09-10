package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestNestedResponseWritersFlushSSE(t *testing.T) {
	recorder := httptest.NewRecorder()
	writer := newResponseWriter(newResponseWriter(recorder))
	if err := http.NewResponseController(writer).Flush(); err != nil {
		t.Fatal(err)
	}
	if !recorder.Flushed {
		t.Fatal("SSE was buffered by middleware")
	}
}
