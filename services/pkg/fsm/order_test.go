package fsm_test

import (
	"testing"

	"github.com/jomboy-lavka/pkg/fsm"
)

func TestCanTransition(t *testing.T) {
	if !fsm.CanTransition("NEW", "ACCEPTED") {
		t.Fatal("NEW -> ACCEPTED")
	}
	if fsm.CanTransition("DELIVERED", "NEW") {
		t.Fatal("DELIVERED -> NEW should fail")
	}
}

func TestAllowedTransitions(t *testing.T) {
	allowed := fsm.AllowedTransitions("ASSEMBLY")
	if len(allowed) != 3 {
		t.Fatalf("expected 3, got %d", len(allowed))
	}
}
