package config

import (
	"os"
	"strconv"
)

type Config struct {
	Port        string
	DatabaseURL string
	DevAuth     bool
}

func Load() Config {
	port := os.Getenv("PORT")
	if port == "" {
		port = "4020"
	}
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://jomboy:jomboy@localhost:5432/jomboy?sslmode=disable"
	}
	devAuth := true
	if v := os.Getenv("DEV_AUTH"); v != "" {
		if parsed, err := strconv.ParseBool(v); err == nil {
			devAuth = parsed
		}
	}
	return Config{Port: port, DatabaseURL: dbURL, DevAuth: devAuth}
}
