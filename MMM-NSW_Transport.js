Module.register("MMM-NSW_Transport", {
    defaults: {
        apiKey: "",
        updateInterval: 60000, // Update every minute
        trips: [],
        excludeKeywords: [],
        lastUpdated: null
    },

    requiresVersion: "2.0.0",

    start: function() {
        Log.info("Starting module: " + this.name);
        this.loaded = false;
        this.departures = {};
        this.scheduleUpdate();
    },

    getDom: function() {
        const wrapper = document.createElement("div");
        wrapper.className = "transport-nsw-container";

        if (!this.loaded) {
            wrapper.innerHTML = "Loading Transport NSW data...";
            return wrapper;
        }

        // Group departures by type
        const trainDepartures = [];
        const busDepartures = [];

        console.log(this.departures);

        Object.entries(this.departures).forEach(([tripId, tripInfo]) => {
            if (tripInfo.type === "train") {
                trainDepartures.push(tripInfo);
            } else {
                busDepartures.push(tripInfo);
            }
        });

        // Create trains section if there are train departures
        if (trainDepartures.length > 0) {
            const trainsSection = document.createElement("div");
            trainsSection.className = "transport-section trains";

            // const trainHeader = document.createElement("div");
            // trainHeader.className = "transport-section-header";
            // trainHeader.innerHTML = "Trains";
            // trainsSection.appendChild(trainHeader);

            trainDepartures.forEach(tripInfo => {
                const tripElement = this.createTripElement(tripInfo);
                trainsSection.appendChild(tripElement);
            });

            wrapper.appendChild(trainsSection);
        }

        // Create buses section if there are bus departures
        if (busDepartures.length > 0) {
            const busesSection = document.createElement("div");
            busesSection.className = "transport-section buses";

            // const busHeader = document.createElement("div");
            // busHeader.className = "transport-section-header";
            // busHeader.innerHTML = "Buses";
            // busesSection.appendChild(busHeader);

            busDepartures.forEach(tripInfo => {
                const tripElement = this.createTripElement(tripInfo);
                busesSection.appendChild(tripElement);
            });

            wrapper.appendChild(busesSection);
        }

        return wrapper;
    },

    // Add this helper method to create trip elements
    createTripElement: function(tripInfo) {
        const tripElement = document.createElement("div");
        tripElement.className = "transport-trip";

        // Create title element with last updated time
        const titleElement = document.createElement("div");
        titleElement.className = "transport-title";
        titleElement.innerHTML = tripInfo.type === "train" 
            ? `${tripInfo.station} <span class="last-updated">Updated: ${this.lastUpdated}</span>`
            : `${tripInfo.stopName} <span class="last-updated">Updated: ${this.lastUpdated}</span>`;
        tripElement.appendChild(titleElement);

        // Create departures list
        tripInfo.departures.forEach(departure => {
            const departureElement = document.createElement("div");
            departureElement.className = "transport-departure";

            const isDelayed = departure.delay > 0;
            const isImminent = departure.minsToArrival <= 15 && departure.minsToArrival > 0;
            const timeClass = isDelayed ? "delayed" : "on-time";

            let departureText = tripInfo.type === "bus" 
                ? `Bus ${departure.routeNumber} to ${departure.destination}, `
                : `${departure.destination}, `;
            
            // Always show scheduled time and minutes to arrival
            if (isDelayed) {
                departureText += `${departure.scheduledTime} → ${departure.actualTime} (${departure.delay} mins late)`;
            } else {
                departureText += departure.scheduledTime;
            }
            
            // Add minutes to arrival for all departures
            if (departure.minsToArrival > 0) {
                departureText += `, arriving in ${departure.minsToArrival} mins`;
            }

            departureElement.innerHTML = `<span class="${timeClass}">${departureText}</span>`;
            tripElement.appendChild(departureElement);
        });

        return tripElement;
    },

    getStyles: function() {
        return ["MMM-NSW_Transport.css"];
    },

    scheduleUpdate: function() {
        const self = this;
        setInterval(function() {
            self.sendSocketNotification("GET_TRANSPORT_DATA", self.config);
        }, this.config.updateInterval);
        self.sendSocketNotification("GET_TRANSPORT_DATA", self.config);
    },

    socketNotificationReceived: function(notification, payload) {
        if (notification === "TRANSPORT_DATA") {
            Log.info("Received transport data:", payload);
            console.log("Full payload:", payload); // Debug log
            
            this.loaded = true;
            if (payload && payload.departures) {
                this.departures = payload.departures;
                this.lastUpdated = payload.lastUpdated;
            } else {
                console.error("Invalid payload structure:", payload);
                this.departures = {};
                this.lastUpdated = null;
            }
            this.updateDom();
        } else if (notification === "TRANSPORT_ERROR") {
            Log.error("MMM-TransportNSW Error:", payload);
            console.error("Transport error:", payload); // Debug log
            this.loaded = true;
            this.departures = {};
            this.lastUpdated = null;
            this.updateDom();
        }
    }
});
