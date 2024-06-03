// Replace with your Flespi token
const FLESPI_TOKEN =
  "uTQ2ydOB4xt3tOr14cYowPDBtwvP7tmFtNaPQc2ja3ckSCXKx41WrGDHjfsaIdBu";

// MQTT connection options
const options = {
  host: "mqtt.flespi.io",
  port: 8883, // For secure connection
  protocol: "mqtts",
  username: FLESPI_TOKEN, // Flespi uses token as username
  password: "", // No password required for Flespi
};

module.exports = { options };
