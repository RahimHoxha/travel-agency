import { type ActionFunctionArgs, data } from "react-router";
import { parseMarkdownToJson, parseTripData } from "~/lib/utils";
import { appwriteConfig, database } from "~/appwrite/client";
import { ID } from "appwrite";
// import {createProduct} from "~/lib/stripe";

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const {
      country,
      numberOfDays,
      travelStyle,
      interests,
      budget,
      groupType,
      userId,
    } = await request.json();

    if (!country || !numberOfDays || !travelStyle || !interests || !budget || !groupType || !userId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const groqApiKey = process.env.GROQ_API_KEY;
    const unsplashApiKey = process.env.UNSPLASH_ACCESS_KEY;

    if (!groqApiKey || !unsplashApiKey) {
      return new Response(
        JSON.stringify({
          error: "API keys not configured. Please set GROQ_API_KEY and UNSPLASH_ACCESS_KEY in your environment variables.",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const prompt = `Generate a ${numberOfDays}-day travel itinerary for ${country} based on the following user information:
Budget: '${budget}'
Interests: '${interests}'
TravelStyle: '${travelStyle}'
GroupType: '${groupType}'

Return the itinerary and lowest estimated price in a clean, non-markdown JSON format with the following structure:
{
  "name": "A descriptive title for the trip",
  "description": "A brief description of the trip and its highlights not exceeding 100 words",
  "estimatedPrice": "Lowest average price for the trip in USD, e.g.$price",
  "duration": ${numberOfDays},
  "budget": "${budget}",
  "travelStyle": "${travelStyle}",
  "country": "${country}",
  "interests": ${interests},
  "groupType": "${groupType}",
  "bestTimeToVisit": [
    "🌸 Season (from month to month): reason to visit",
    "☀️ Season (from month to month): reason to visit",
    "🍁 Season (from month to month): reason to visit",
    "❄️ Season (from month to month): reason to visit"
  ],
  "weatherInfo": [
    "☀️ Season: temperature range in Celsius (temperature range in Fahrenheit)",
    "🌦️ Season: temperature range in Celsius (temperature range in Fahrenheit)",
    "🌧️ Season: temperature range in Celsius (temperature range in Fahrenheit)",
    "❄️ Season: temperature range in Celsius (temperature range in Fahrenheit)"
  ],
  "location": {
    "city": "name of the city or region",
    "coordinates": [latitude, longitude],
    "openStreetMap": "link to open street map"
  },
  "itinerary": [
    {
      "day": 1,
      "location": "City/Region Name",
      "activities": [
        {"time": "Morning", "description": "🏰 Visit the local historic castle and enjoy a scenic walk"},
        {"time": "Afternoon", "description": "🖼️ Explore a famous art museum with a guided tour"},
        {"time": "Evening", "description": "🍷 Dine at a rooftop restaurant with local wine"}
      ]
    }
  ]
}

IMPORTANT: 
- bestTimeToVisit and weatherInfo MUST be arrays, not objects
- itinerary MUST be an array
- All array fields must use square brackets [], not curly braces {}
- Return ONLY valid JSON, no markdown, no code blocks, no explanations.`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: "You are a travel expert that generates detailed travel itineraries. Always respond with valid JSON only, no markdown formatting.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const groqData = await response.json();
    const tripText = groqData.choices[0]?.message?.content;

    if (!tripText) {
      throw new Error("No response from Groq API");
    }

    const trip = parseMarkdownToJson(tripText) || JSON.parse(tripText);

    const imageResponse = await fetch(
      `https://api.unsplash.com/search/photos?query=${country} ${interests} ${travelStyle}&client_id=${unsplashApiKey}`
    );

    const imageUrls = (await imageResponse.json()).results
      .slice(0, 3)
      .map((result: any) => result.urls?.regular || null);

    const result = await database.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.tripCollectionId,
      ID.unique(),
      {
        tripDetails: JSON.stringify(trip),
        createdAt: new Date().toISOString(),
        imageUrls,
        userId,
      }
    );

    // const tripDetail = parseTripData(result.tripDetails) as Trip;
    // const tripPrice = parseInt(tripDetail.estimatedPrice.replace("$", ""), 10);
    // const paymentLink = await createProduct(
    //     tripDetail.name,
    //     tripDetail.description,
    //     imageUrls,
    //     tripPrice,
    //     result.$id
    // )

    // await database.updateDocument(
    //   appwriteConfig.databaseId,
    //   appwriteConfig.tripCollectionId,
    //   result.$id,
    //   {
    //     payment_link: paymentLink.url
    // }
    // );

    return data({ id: result.$id });
  } catch (e) {
    console.error("Error generating travel plan: ", e);
    
    let errorMessage = "Failed to generate travel plan";
    
    if (e instanceof Error) {
      const message = e.message;
      
      // Check for API errors
      if (message.includes("quota") || message.includes("Quota exceeded") || message.includes("429")) {
        errorMessage = "API rate limit exceeded. Please wait a few minutes and try again.";
      } else if (message.includes("API key") || message.includes("401") || message.includes("403")) {
        errorMessage = "Invalid or missing API key. Please check your GROQ_API_KEY environment variable. Get a free API key at https://console.groq.com/";
      } else if (message.includes("Groq API error")) {
        errorMessage = message.replace("Groq API error: ", "");
      } else {
        errorMessage = message;
      }
    }
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
