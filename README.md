# MMM-TransportNSW

A MagicMirror² module that displays real-time train and bus information from Transport NSW.

## Features

- Real-time departure information for trains and buses
- Support for multiple trips/stops
- Color-coded status indicators (green for on-time, red for delayed)
- Configurable update interval
- Ability to exclude routes based on keywords
- Shows number of stops until arrival for buses
- Detailed error logging
- Automatic retry on failed requests

## Installation

1. Navigate to your MagicMirror's modules directory:
```bash
cd ~/MagicMirror/modules
```

2. Clone this repository:
```bash
git clone https://github.com/yourusername/MMM-TransportNSW.git
```

3. Install dependencies:
```bash
cd MMM-TransportNSW
npm install
```

## Configuration

To use this module, add it to the modules array in your `config/config.js` file:

```javascript
{
    module: "MMM-NSW_Transport",
    position: "top_right",
    config: {
        apiKey: "YOUR_TRANSPORT_NSW_API_KEY",
        updateInterval: 60000, // Update every minute
        trips: [
            {
                type: "train",
                station: "Central"
            },
            {
                type: "bus",
                stopId: "123456",
                stopName: "My Bus Stop"
            }
        ],
        excludeKeywords: ["Express", "Limited"] // Optional: Routes containing these words will be filtered out
    }
}
```

### Configuration Options

| Option | Description |
|--------|-------------|
| `apiKey` | Your Transport NSW API key (required) |
| `updateInterval` | How often to update the display in milliseconds (default: 60000) |
| `trips` | Array of trip configurations (required) |
| `excludeKeywords` | Array of keywords to filter out from routes (optional) |

### Trip Configuration

For trains:
```javascript
{
    type: "train",
    station: "Station Name"
}
```

For buses:
```javascript
{
    type: "bus",
    stopId: "Stop ID",
    stopName: "Display Name for Stop"
}
```

## Getting a Transport NSW API Key

1. Visit the [Transport NSW Open Data Hub](https://opendata.transport.nsw.gov.au/)
2. Create an account and log in
3. Navigate to "Applications" and create a new application
4. Select the "Trip Planner APIs" package
5. Once approved, you'll receive your API key

## Troubleshooting

Common error messages and their solutions:

- "API key not provided": Check your config.js and ensure the apiKey is set correctly
- "Invalid station/stop": Verify the station name or stop ID is correct
- "Network error": Check your internet connection and the Transport NSW API status

## Contributing

Feel free to submit issues and pull requests.

## License

This project is licensed under the MIT License.
