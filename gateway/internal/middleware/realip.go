package middleware

import (
	"net"
	"net/http"
	"strings"
)

var (
	trustedProxyNets []*net.IPNet
	trustedProxyIPs  = make(map[string]struct{})
)

// ConfigureTrustedProxies thiết lập danh sách proxy tin cậy (IP hoặc CIDR).
func ConfigureTrustedProxies(cidrs []string) error {
	trustedProxyNets = nil
	trustedProxyIPs = make(map[string]struct{})

	for _, entry := range cidrs {
		entry = strings.TrimSpace(entry)
		if entry == "" {
			continue
		}

		if strings.Contains(entry, "/") {
			_, network, err := net.ParseCIDR(entry)
			if err != nil {
				return err
			}
			trustedProxyNets = append(trustedProxyNets, network)
			continue
		}

		ip := net.ParseIP(entry)
		if ip == nil {
			return &net.ParseError{Type: "IP address", Text: entry}
		}
		trustedProxyIPs[ip.String()] = struct{}{}
	}

	return nil
}

func isTrustedProxy(ip string) bool {
	parsed := net.ParseIP(ip)
	if parsed == nil {
		return false
	}

	if _, ok := trustedProxyIPs[parsed.String()]; ok {
		return true
	}

	for _, network := range trustedProxyNets {
		if network.Contains(parsed) {
			return true
		}
	}

	return false
}

func remoteAddrIP(r *http.Request) string {
	ip, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return ip
}

func clientIPFromXFF(xff string) string {
	parts := strings.Split(xff, ",")
	for i := len(parts) - 1; i >= 0; i-- {
		ip := strings.TrimSpace(parts[i])
		if parsed := net.ParseIP(ip); parsed != nil && !isTrustedProxy(ip) {
			return ip
		}
	}

	ip := strings.TrimSpace(parts[0])
	if net.ParseIP(ip) != nil {
		return ip
	}
	return ""
}

// RealIP trả về địa chỉ IP thực của client.
func RealIP(r *http.Request) string {
	directIP := remoteAddrIP(r)

	if isTrustedProxy(directIP) {
		if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
			if ip := clientIPFromXFF(xff); ip != "" {
				return ip
			}
		}

		if xri := r.Header.Get("X-Real-IP"); xri != "" {
			ip := strings.TrimSpace(xri)
			if net.ParseIP(ip) != nil {
				return ip
			}
		}
	}

	return directIP
}
