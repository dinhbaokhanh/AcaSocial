package routing

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

type deadlineWriter struct {
	*httptest.ResponseRecorder
	deadline time.Time
}

func (w *deadlineWriter) SetWriteDeadline(deadline time.Time) error {
	w.deadline = deadline
	return nil
}

func TestSanitizerAllowsStreaming(t *testing.T) {
	recorder := &deadlineWriter{ResponseRecorder: httptest.NewRecorder(), deadline: time.Now()}
	sanitizeBackendResponseHeaders(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Powered-By", "Express")
		controller := http.NewResponseController(w)
		if err := controller.SetWriteDeadline(time.Time{}); err != nil {
			t.Fatal(err)
		}
		if err := controller.Flush(); err != nil {
			t.Fatal(err)
		}
	})).ServeHTTP(recorder, httptest.NewRequest("GET", "/", nil))
	if !recorder.Flushed || !recorder.deadline.IsZero() {
		t.Fatal("stream could not flush or clear its deadline")
	}
	if recorder.Result().Header.Get("X-Powered-By") != "" {
		t.Fatal("stream exposed a filtered header")
	}
}
