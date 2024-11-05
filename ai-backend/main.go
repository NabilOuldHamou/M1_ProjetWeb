package main

import (
	"ai-trainer_backend/controllers"
	"ai-trainer_backend/initializers"
	"ai-trainer_backend/router"
	"log"
	"os"

	"github.com/gin-gonic/gin"
)

func init() {
	initializers.LoadEnv()
}

func main() {
	gin.SetMode(os.Getenv("GIN_MODE"))
	router.CreateRouter()

	router.Api.GET("/trainer", controllers.GetNewProgram)

	log.Println("Starting server...")

	err := router.Router.Run()
	if err != nil {
		log.Fatal("Router could not be created.")
	}
}
