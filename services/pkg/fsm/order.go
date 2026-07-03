package fsm

// Order FSM — TZ §3.2 transitions (production Go port).

var transitions = map[string][]string{
	"NEW":                  {"ACCEPTED", "CANCELLED_BY_USER", "CANCELLED_SYSTEM"},
	"ACCEPTED":             {"ASSEMBLY", "CANCELLED_BY_USER", "CANCELLED_SYSTEM"},
	"ASSEMBLY":             {"READY", "PENDING_REPLACEMENT", "CANCELLED_SYSTEM"},
	"PENDING_REPLACEMENT":  {"ASSEMBLY", "CANCELLED_BY_USER"},
	"READY":                {"AWAITING_COURIER", "CANCELLED_SYSTEM"},
	"AWAITING_COURIER":     {"IN_DELIVERY", "CANCELLED_SYSTEM"},
	"IN_DELIVERY":          {"DELIVERED", "CANCELLED_SYSTEM"},
	"DELIVERED":            {},
	"CANCELLED_BY_USER":    {},
	"CANCELLED_SYSTEM":     {},
}

func CanTransition(from, to string) bool {
	for _, t := range transitions[from] {
		if t == to {
			return true
		}
	}
	return false
}

func AllowedTransitions(status string) []string {
	out := transitions[status]
	if out == nil {
		return []string{}
	}
	cp := make([]string, len(out))
	copy(cp, out)
	return cp
}
