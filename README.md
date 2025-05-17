# 🌩️ NimbusWS — Resilient WebSocket Gateway with Kafka & Redis
![Project Status](https://img.shields.io/badge/status-in--progress-yellow)

> 🚧 **This project is in early development. Expect frequent changes and incomplete features.**


**NimbusWS** is a stateless, horizontally scalable WebSocket gateway built with [Fastify](https://www.fastify.io/), Kafka, and Redis. It enables seamless message delivery and automatic reconnection for large-scale WebSocket clients, even across pod restarts and failures.

> Designed for production environments where WebSocket connections must be resilient, decoupled, and fault-tolerant.

---

## 🚀 Features

- 📡 **Fastify + @fastify/websocket** server
- 🧠 **Client-aware Kafka consumption**
- 🔄 **Auto-resume on reconnect (offset tracking in Redis)**
- 💥 **Stateless pods for seamless failover**
- 🐳 **Docker + Docker Compose setup**
- 🌐 **Redis-based client session registry**

---

## 🏗️ Architecture

```
 In progress
```

---

## 📦 Tech Stack

- Node.js + Fastify
- @fastify/websocket
- Kafka (Apache Kafka or Redpanda)
- Redis (ioredis)
- Docker & Docker Compose

---

## 🛠️ Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/learningfun-dev/nimbusws.git
cd nimbusws
```

### 2. Start Locally with Docker Compose

```bash
docker compose up --build -d
```

This will spin up:
- NimbusWS WebSocket server (port `3000`)
- Kafka

---

### 3. Connect a WebSocket Client

Use `wscat`, Postman, or any client to test:

```bash
npx wscat -c ws://localhost:3000/events?clientId=my-client-123
```

json event to send 

```json
{
    "type":"event",
    "data": "this is a sample event"
}
```

### 4. Simulate Event Processing
A demo WebSocket endpoint is available to simulate event processing and return results. After sending an event from step 3, this endpoint mimics the backend processing and pushes the result to the websocket_results Kafka topic. The corresponding WebSocket client will then receive the result via the original connection.

Use wscat, Postman, or any WebSocket client to connect:

```bash
npx wscat -c ws://localhost:3000/process_events?clientId=my-client-123
```
Make sure to use the event_id and client_id received from the event_accepted message in step 3. Example:

```json
{
  "type": "event_accepted",
  "client_id":" my-client-123",
  "event_id": "e4adaf8e-5d68-4ad8-beec-6fc8f98c617a",
  "status": "Event accepted",
  "created_at": "2025-05-17T21:09:08.096Z",
  "data": "this is a sample event"
}
```

---

## 🔗 Related Projects

- [Fastify](https://github.com/fastify/fastify)
- [KafkaJS](https://kafka.js.org/)
