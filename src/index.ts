import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const PLACE_QUERY = `query GetPlaces($input: PlaceInput, $language: LanguageEnum!) {
	places(input: $input, language: $language) {
      id
		name
		__typename
	}
}`;

const TRIP_QUERY = `query getTrips($input: TripInput!, $pagingCursor: String, $language: LanguageEnum!) {
  trips(tripInput: $input, pagingCursor: $pagingCursor, language: $language) {
    trips {
      ...TripFields
      __typename
    }
    paginationCursor {
      previous
      next
      __typename
    }
    __typename
  }
}

fragment NoticesFields on Notice {
  name
  text {
    template
    arguments {
      type
      values
      __typename
    }
    __typename
  }
  type
  priority
  advertised
  __typename
}

fragment ArrivalDepartureFields on ScheduledStopPointDetail {
  time
  delay
  delayText
  quayFormatted
  quayChanged
  quayChangedText
  __typename
}

fragment BoardingAFields on AccessibilityBoardingAlighting {
  limitation
  name
  description
  assistanceService {
    template
    arguments {
      type
      values
      __typename
    }
    __typename
  }
  __typename
}

fragment ServiceProductFields on ServiceProduct {
  name
  line
  number
  vehicleMode
  vehicleSubModeShortName
  corporateIdentityIcon
  corporateIdentityPictogram
  __typename
}

fragment SituationFields on PTSituation {
  cause
  broadcastMessages {
    id
    priority
    title
    detail
    detailShort
    distributionPeriod {
      startDate
      endDate
      __typename
    }
    audiences {
      urls {
        name
        url
        __typename
      }
      __typename
    }
    __typename
  }
  affectedStopPointFromIdx
  affectedStopPointToIdx
  __typename
}

fragment TripStatusFields on TripStatus {
  alternative
  alternativeText
  cancelled
  cancelledText
  partiallyCancelled
  delayed
  delayedUnknown
  quayChanged
  __typename
}

fragment TripFields on Trip {
  id
  legs {
    duration
    id
    ... on AccessLeg {
      __typename
      duration
      distance
      start {
        __typename
        id
        name
      }
      end {
        __typename
        id
        name
      }
    }
    ... on PTConnectionLeg {
      __typename
      duration
      start {
        __typename
        id
        name
      }
      end {
        __typename
        id
        name
      }
      notices {
        ...NoticesFields
        __typename
      }
    }
    ... on AlternativeModeLeg {
      __typename
      mode
      duration
    }
    ... on PTRideLeg {
      __typename
      duration
      start {
        __typename
        id
        name
      }
      end {
        __typename
        id
        name
      }
      arrival {
        ...ArrivalDepartureFields
        __typename
      }
      departure {
        ...ArrivalDepartureFields
        __typename
      }
      serviceJourney {
        id
        stopPoints {
          place {
            id
            name
            __typename
          }
          occupancy {
            firstClass
            secondClass
            __typename
          }
          accessibilityBoardingAlighting {
            ...BoardingAFields
            __typename
          }
          stopStatus
          stopStatusFormatted
          delayUndefined
          __typename
        }
        serviceProducts {
          ...ServiceProductFields
          routeIndexFrom
          routeIndexTo
          __typename
        }
        direction
        serviceAlteration {
          cancelled
          cancelledText
          partiallyCancelled
          partiallyCancelledText
          redirected
          redirectedText
          reachable
          reachableText
          delayText
          unplannedStopPointsText
          quayChangedText
          __typename
        }
        situations {
          ...SituationFields
          __typename
        }
        notices {
          ...NoticesFields
          __typename
        }
        quayTypeName
        quayTypeShortName
        __typename
      }
    }
    __typename
  }
  situations {
    ...SituationFields
    __typename
  }
  notices {
    ...NoticesFields
    __typename
  }
  valid
  isBuyable
  summary {
    duration
    arrival {
      ...ArrivalDepartureFields
      __typename
    }
    arrivalWalk
    lastStopPlace {
      __typename
      id
      name
      canton
    }
    tripStatus {
      ...TripStatusFields
      __typename
    }
    departure {
      ...ArrivalDepartureFields
      __typename
    }
    departureWalk
    firstStopPlace {
      __typename
      id
      name
      canton
    }
    product {
      ...ServiceProductFields
      __typename
    }
    direction
    occupancy {
      firstClass
      secondClass
      __typename
    }
    tripStatus {
      ...TripStatusFields
      __typename
    }
    boardingAlightingAccessibility {
      ...BoardingAFields
      __typename
    }
    international
    __typename
  }
  searchHint
  __typename
}`;

function registerTools(server: McpServer) {
	server.tool("sbb_get_places", "Return a list of places available from name", { value: z.string().min(1) }, async ({ value }) => {
		const resp = await fetch("https://graphql.www.sbb.ch/", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
			},
			body: JSON.stringify({
				operationName: "GetPlaces",
				query: PLACE_QUERY,
				variables: {
					input: {
						type: "NAME",
						value: value,
					},
					language: "FR",
				},
			}),
		});

		const data = await resp.json();

		return {
			content: [{ type: "text", text: JSON.stringify(data.data.places) }],
		};
	});

	server.tool(
		"sbb_get_trips",
		"Return a list of trips available from two places ID or name",
		{
			from: z.string().min(1),
			to: z.string().min(1),
			date: z
				.string()
				.regex(/^(\d{4}-\d{2}-\d{2})?$/)
				.optional(),
			time: z
				.string()
				.regex(/^(\d{2}:\d{2})?$/)
				.optional(),
		},
		async ({ from, to, date, time }) => {
			// If date is not provided, use today's date
			if (!date || date === "") {
				date = new Date().toISOString().split("T")[0];
			}

			// If time is not provided, use current time
			if (!time || time === "") {
				const now = new Date();
				time = now.toTimeString().slice(0, 5); // Format as HH:MM
			}

			const resp = await fetch("https://graphql.www.sbb.ch/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
				},
				body: JSON.stringify({
					operationName: "getTrips",
					query: TRIP_QUERY,
					variables: {
						input: {
							directConnection: false,
							includeTransportModes: ["HIGH_SPEED_TRAIN", "INTERCITY", "INTERREGIO", "REGIO", "URBAN_TRAIN", "SPECIAL_TRAIN", "SHIP", "BUS", "TRAMWAY", "CABLEWAY_GONDOLA_CHAIRLIFT_FUNICULAR"],
							occupancy: "ALL",
							places: [
								{ type: "NAME", value: from },
								{ type: "NAME", value: to },
							],
							time: {
								date: date,
								time: time,
							},
							walkSpeed: 100,
						},
						language: "FR",
					},
				}),
			});

			const data = await resp.json();

			return {
				content: [{ type: "text", text: JSON.stringify(data.data.trips.trips) }],
			};
		},
	);
}

async function main() {
	const server = new McpServer({
		name: "sbb",
		version: "1.0.0",
		description: "SBB/CFF Model Context Protocol Server",
	});

	registerTools(server);

	let transport = new StdioServerTransport();
	await server.connect(transport);

	const cleanup = async () => {
		console.log("\n⚠️ Shutting down MCP server...");
		await transport.close();
		process.exit(0);
	};

	process.on("SIGINT", cleanup);
	process.on("SIGTERM", cleanup);

	console.error("SBB/CFF MCP Server running on stdio");
}

main().catch((err) => {
	console.error("Error initializing MCP server:\n");
	console.error(`${err.message}\n`);
	process.exit(1);
});
