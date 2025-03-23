const NodeHelper = require("node_helper");
const axios = require("axios");
const moment = require("moment-timezone");
const fs = require("fs");
const path = require("path");

module.exports = NodeHelper.create({
    start: function() {
        console.log("Starting node_helper for: " + this.name);
        this.baseUrl = "https://api.transport.nsw.gov.au";
        
        // Create response directory
        const responseDir = path.join(__dirname, "response");
        if (!fs.existsSync(responseDir)) {
            try {
                fs.mkdirSync(responseDir, { recursive: true });
                console.log("Created response directory:", responseDir);
            } catch (err) {
                console.error("Error creating response directory:", err);
            }
        }
    },

    getDepartureMonitor: async function(type, id, config, maxDepartures) {
        try {
            const sydneyTime = moment().tz("Australia/Sydney");
            const itdDate = sydneyTime.format("YYYYMMDD");
            const itdTime = sydneyTime.format("HHmm");

            if (config.debug) {
                console.log(`Sydney Date: ${itdDate}, Time: ${itdTime}`);
            }

            const baseParams = `outputFormat=rapidJSON&coordOutputFormat=EPSG%3A4326&mode=direct&TfNSWDM=true&version=10.2.1.42&itdDate=${itdDate}&itdTime=${itdTime}`;

            const endpoint = type === "train" 
                ? `/v1/tp/departure_mon?${baseParams}&type_dm=platform&name_dm=${encodeURIComponent(id)}&excludedMeans=checkbox&exclMOT_2=1&exclMOT_4=1&exclMOT_5=1&exclMOT_7=1&exclMOT_9=1&exclMOT_11=1`
                : `/v1/tp/departure_mon?${baseParams}&type_dm=stop&name_dm=${encodeURIComponent(id)}&excludedMeans=checkbox&exclMOT_1=1&exclMOT_2=1&exclMOT_4=1&exclMOT_7=1&exclMOT_9=1&exclMOT_11=1`;

            // console.log(`Fetching ${type} data for ${id} with date: ${itdDate}, time: ${itdTime}`);
            // console.log(`Endpoint: ${endpoint}`);

            const response = await axios.get(this.baseUrl + endpoint, {
                headers: {
                    "Authorization": `apikey ${config.apiKey}`,
                    "Accept": "application/json"
                }
            });

            // Only save response files if debug is enabled
            if (config.debug) {
                const filePath = path.join(__dirname, "response", `${Date.now()}_${type}.json`);
                fs.writeFileSync(filePath, JSON.stringify(response.data, null, 2));
            }

            const stopEvents = response.data.stopEvents || [];
            const now = moment().tz("Australia/Sydney");
            
            return stopEvents
                .filter(event => {
                    const routeDesc = event.transportation?.disassembledName || "";
                    return !config.excludeKeywords.some(keyword => 
                        routeDesc.toLowerCase().includes(keyword.toLowerCase())
                    );
                })
                .map(event => {
                    const scheduledTime = moment(event.departureTimePlanned);
                    const realTime = event.departureTimeEstimated 
                        ? moment(event.departureTimeEstimated)
                        : scheduledTime;
                    
                    const delay = realTime.diff(scheduledTime, 'minutes');
                    const minsToArrival = realTime.diff(now, 'minutes');
                    
                    return {
                        destination: event.transportation?.destination?.name || "Unknown",
                        scheduledTime: scheduledTime.format("HH:mm"),
                        actualTime: realTime.format("HH:mm"),
                        delay: Math.max(0, delay),
                        minsToArrival: minsToArrival,
                        routeNumber: event.transportation?.number || "",
                        routeId: event.transportation?.number || ""
                    };
                })
                .slice(0, maxDepartures || config.defaultMaxDepartures); // Limit results based on maxDepartures
        } catch (error) {
            console.error(`Error fetching ${type} data:`, error.message);
            throw error;
        }
    },

    socketNotificationReceived: async function(notification, config) {
        if (notification === "GET_TRANSPORT_DATA") {
            try {
                const departures = {};
                if (config.debug) {
                    console.log("Fetching transport data with config:", config);
                }

                for (const trip of config.trips) {
                    try {
                        const departureTimes = await this.getDepartureMonitor(
                            trip.type,
                            trip.type === "train" ? trip.station : trip.stopId,
                            config,
                            trip.maxDepartures
                        );

                        if (departureTimes && departureTimes.length > 0) {
                            departures[trip.id || trip.station] = {
                                type: trip.type,
                                station: trip.station,
                                stopName: trip.stopName,
                                routeId: trip.routeId,
                                departures: departureTimes
                            };
                        }
                    } catch (tripError) {
                        console.error(`Error fetching trip data:`, tripError);
                    }
                }

                const lastUpdated = moment().tz("Australia/Sydney").format("HH:mm:ss");
                if (config.debug) {
                    console.log("Sending data to module:", { departures, lastUpdated });
                }
                
                this.sendSocketNotification("TRANSPORT_DATA", {
                    departures: departures,
                    lastUpdated: lastUpdated
                });
            } catch (error) {
                console.error("Error fetching transport data:", error);
                this.sendSocketNotification("TRANSPORT_ERROR", error.message);
            }
        }
    }
});
