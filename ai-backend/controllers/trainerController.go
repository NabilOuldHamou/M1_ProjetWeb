package controllers

import (
	"context"
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/ollama/ollama/api"
)

func newFalse() *bool {
	b := false
	return &b
}

func GetNewProgram(c *gin.Context) {
	// var body struct {
	// 	Age       int
	// 	Weight    int
	// 	Height    int
	// 	Type      string
	// 	Frequency int
	// 	Duration  int
	// }

	// if err := c.Bind(&body); err != nil {
	// 	c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request format"})
	// }

	client, err := api.ClientFromEnvironment()
	if err != nil {
		log.Fatal(err)
	}

	messages := []api.Message{
		api.Message{
			Role:    "system",
			Content: "You are an AI coach that helps people create their own customisable weekly workout plans. You have to respect all the constraints that the user will give you. Each workout will be composed of 3 parts, warm up, main plan and cool down. The cool down and warm up are composed of at least 4 exercices that each last a maximum of 1 minute. Warm ups and cool downs have to be as different as possible for each day as they need to be appropriate for the main plan.All durations must be returned in minutes or seconds. Your will return your responses in JSON following this schema : {workouts: [ { day, duration, warm_up: [ {name, description, duration} ], main_plan: [ {name, sets, reps, rest, how_to, equipment}], warm_up: [ {name, description, duration} ]} ]}. Do not say anything else, the only response that you need to send back is the JSON.",
		},
		api.Message{
			Role:    "assistant",
			Content: "Return a workout program respecting all directives given.",
		},
		api.Message{
			Role:    "user",
			Content: "3 times a week 30 mins for each workout ; hypertrophy and cardio ; male of 22 years old 68kg 169cm tall ; bodyweight and kettlebell of 6kg",
		},
	}

	ctx := context.Background()
	req := &api.ChatRequest{
		Model:    "llama3.1",
		Messages: messages,
		//Stream:   newFalse(),
	}

	var responseContent strings.Builder

	respFunc := func(resp api.ChatResponse) error {
		responseContent.WriteString(resp.Message.Content)
		return nil
	}

	if err = client.Chat(ctx, req, respFunc); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "An unknown error occurred."})
		return
	}

	c.Data(http.StatusAccepted, "application/json; charset=utf-8", []byte(responseContent.String()))
}
