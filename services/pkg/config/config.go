package config

import (
	"os"
	"strconv"
)

type Service struct {
	Name        string
	Port        string
	DatabaseURL string
	NatsURL     string
	RedisURL    string
	DevAuth     bool
}

func Load(serviceName, defaultPort string) Service {
	port := os.Getenv("PORT")
	if port == "" {
		port = defaultPort
	}
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" && os.Getenv("DEV_NO_DB") == "true" {
		dbURL = ""
	} else if dbURL == "" {
		dbURL = "postgres://jomboy:jomboy@localhost:5432/jomboy?sslmode=disable"
	}
	natsURL := os.Getenv("NATS_URL")
	if natsURL == "" {
		natsURL = "nats://localhost:4222"
	}
	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "redis://localhost:6379/0"
	}
	devAuth := true
	if v := os.Getenv("DEV_AUTH"); v != "" {
		if parsed, err := strconv.ParseBool(v); err == nil {
			devAuth = parsed
		}
	}
	return Service{
		Name:        serviceName,
		Port:        port,
		DatabaseURL: dbURL,
		NatsURL:     natsURL,
		RedisURL:    redisURL,
		DevAuth:     devAuth,
	}
}
