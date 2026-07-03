package natsx

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/nats-io/nats.go"
)

// TZ §3.1.2 event subjects
const (
	SubjectOrderCreated       = "order.created"
	SubjectOrderStatusChanged = "order.status_changed"
	SubjectPaymentCaptured    = "payment.captured"
	SubjectStockChanged       = "stock.changed"
)

type Client struct {
	nc *nats.Conn
	js nats.JetStreamContext
}

func Connect(url string) (*Client, error) {
	nc, err := nats.Connect(url, nats.Timeout(5*time.Second))
	if err != nil {
		return nil, err
	}
	js, err := nc.JetStream()
	if err != nil {
		nc.Close()
		return nil, err
	}
	for _, subj := range []string{SubjectOrderCreated, SubjectOrderStatusChanged, SubjectPaymentCaptured, SubjectStockChanged} {
		_, err = js.AddStream(&nats.StreamConfig{Name: subj, Subjects: []string{subj + ".>"}})
		if err != nil && err != nats.ErrStreamNameAlreadyInUse {
			log.Printf("nats stream %s: %v", subj, err)
		}
	}
	return &Client{nc: nc, js: js}, nil
}

func (c *Client) Close() {
	if c.nc != nil {
		c.nc.Close()
	}
}

func (c *Client) Publish(ctx context.Context, subject string, payload any) error {
	if c.js == nil {
		return fmt.Errorf("jetstream unavailable")
	}
	b, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	_, err = c.js.Publish(subject, b, nats.Context(ctx))
	return err
}
