module github.com/jomboy-lavka/support

go 1.22

require (
	github.com/go-chi/chi/v5 v5.1.0
	github.com/gorilla/websocket v1.5.3
	github.com/jomboy-lavka/pkg v0.0.0
)

require github.com/go-chi/cors v1.2.1 // indirect

replace github.com/jomboy-lavka/pkg => ../pkg
