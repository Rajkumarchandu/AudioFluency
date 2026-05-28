import axios from "axios";

const API = axios.create({
  baseURL: "https://willow-festivity-scavenger.ngrok-free.dev",
  headers: {
    "Content-Type": "application/json",
  },
});

export default API;